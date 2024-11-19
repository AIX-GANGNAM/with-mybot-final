from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor, Tool
from langchain.prompts import ChatPromptTemplate

# 날짜 관련
from datetime import datetime, timedelta

# 메모리 관련
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# 부모관련 메모리 생성
from langchain.storage import InMemoryStore, LocalFileStore
from langchain_chroma import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.messages import HumanMessage, AIMessage
from langchain.schema import Document
from langchain_community.document_loaders import JSONLoader

import os
from pathlib import Path
import pickle
import hashlib

PERSIST_DIRECTORY = "./chroma_db"
STORE_DIRECTORY = "./doc_store"  # parent documents를 저장할 디렉토리

# 저장소 디렉토리 생성
os.makedirs(PERSIST_DIRECTORY, exist_ok=True)
os.makedirs(STORE_DIRECTORY, exist_ok=True)

def create_stable_hash(content: str) -> str:
    """안정적인 해시 값을 생성합니다."""
    return hashlib.sha256(content.encode()).hexdigest()

def get_stored_ids(store_dir: str) -> set:
    """저장소 디렉토리에서 현재 저장된 모든 parent ID를 가져옵니다."""
    stored_ids = set()
    if os.path.exists(store_dir):
        for filename in os.listdir(store_dir):
            if filename.endswith('.bin'):
                stored_ids.add(filename[:-4])  # .bin 제외한 ID
    return stored_ids

def process_and_store_documents(docs, vectorstore, store):
    """문서를 처리하고 parent ID를 포함하여 저장합니다."""
    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=10)
    
    vector_docs = []
    existing_ids = get_stored_ids(STORE_DIRECTORY)
    
    for doc in docs:
        # Parent 문서로 분할
        parent_chunks = parent_splitter.split_documents([doc])
        
        for i, parent_chunk in enumerate(parent_chunks):
            # 안정적인 parent ID 생성
            parent_id = f"parent_{create_stable_hash(parent_chunk.page_content)}_{i}"
            
            # 이미 존재하는 문서는 건너뛰기
            if parent_id in existing_ids:
                continue
            
            # Parent document를 pickle로 직렬화하여 저장
            store.mset([(parent_id, pickle.dumps(parent_chunk))])
            
            # Child 문서로 분할
            child_chunks = child_splitter.split_documents([parent_chunk])
            
            # 각 child document에 parent_id를 메타데이터로 추가
            for child_chunk in child_chunks:
                child_chunk.metadata.update({
                    "parent_id": parent_id,
                    "original_source": doc.metadata.get("source", "unknown"),
                    "chunk_type": "child"
                })
                vector_docs.append(child_chunk)
    
    # vector_docs가 있을 때만 vectorstore에 추가
    if vector_docs:
        vectorstore.add_documents(vector_docs)
    
    return len(vector_docs)

def load_documents(text_path):
    """텍스트 파일에서 새로운 문서만 로드합니다."""
    if not os.path.exists(text_path):
        return []
    
    loader = TextLoader(text_path)
    docs = loader.load()
    
    # 이미 처리된 문서는 건너뛰기
    new_docs = []
    existing_ids = get_stored_ids(STORE_DIRECTORY)
    
    for doc in docs:
        parent_chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100).split_documents([doc])
        for chunk in parent_chunks:
            parent_id = f"parent_{create_stable_hash(chunk.page_content)}_0"
            if parent_id not in existing_ids:
                new_docs.append(doc)
                break
    
    return new_docs

# 초기 설정
text_path = "./memory_storage/DwgZh7Ud7STbVBnkyvK5kmxUIzw1/Joy/conversation.txt"
embeddings = OpenAIEmbeddings()
store = LocalFileStore(STORE_DIRECTORY)
vectorstore = Chroma(
    collection_name="chat_history",
    embedding_function=embeddings,
    persist_directory=PERSIST_DIRECTORY,
)

# 새로운 문서만 처리
docs = load_documents(text_path)
if docs:
    num_chunks = process_and_store_documents(docs, vectorstore, store)
    print(f"처리된 새로운 문서 청크 수: {num_chunks}")
    if docs:
        print("새로운 문서 내용:", docs[0].page_content)

# Tool 함수들
def search_web(query: str) -> str:
    """Search the web for information about a given query"""
    search = TavilySearchResults(
        max_results=3,
        include_answer=True,
        include_raw_content=True,
        include_domains=[],
    )
    print("=======================================검색 결과======================================")
    result = search.invoke(query)
    print(result)
    return result

def search_conversation(query: str) -> str:
    """이전 대화 내용에서 관련 정보를 vectorstore로 검색한 후 해당하는 parent document를 찾아 반환합니다."""
    print("=================================대화 검색=============================================")
    print("검색 쿼리:", query)
    
    try:
        # Vectorstore로 MMR 검색 수행
        vector_results = vectorstore.max_marginal_relevance_search(
            query,
            k=5,
            fetch_k=20,
            lambda_mult=0.5
        )
        print("벡터 검색 결과:", vector_results)
        
        # 검색된 문서들의 metadata에서 parent_id 추출
        parent_ids = []
        for doc in vector_results:
            if 'parent_id' in doc.metadata:
                parent_ids.append(doc.metadata['parent_id'])
        
        # Parent documents 가져오기
        parent_docs = []
        if parent_ids:
            # mget은 리스트를 반환하므로 바로 처리
            parent_docs_raw = store.mget(parent_ids)
            # None이 아닌 문서만 역직렬화
            parent_docs = [pickle.loads(doc) for doc in parent_docs_raw if doc is not None]
        
        # 문맥 결합
        if not parent_docs:
            if vector_results:
                context_result = "\n\n".join([doc.page_content for doc in vector_results])
            else:
                return "관련된 대화 내용을 찾을 수 없습니다."
        else:
            context_result = "\n\n".join([doc.page_content for doc in parent_docs])
        
        print("문맥 정보:", context_result)
        print("=================================대화 검색 결과=============================================")
        
        prompt = f"""다음은 이전 대화의 관련 내용입니다:

{context_result}

이 맥락을 바탕으로 질문에 답변해주세요: {query}
"""
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        return llm.invoke(prompt)
        
    except Exception as e:
        print(f"검색 중 오류 발생: {e}")
        return "이전 대화 내용이 없거나 검색 중 오류가 발생했습니다."

def general_chat(query: str) -> str:
    """일반적인 대화를 처리합니다."""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
    prompt = f"""당신은 친근하고 도움이 되는 AI 어시스턴트입니다.
다음 질문이나 대화에 자연스럽게 답변해주세요: {query}"""
    return llm.invoke(prompt).content

# Tools 정의
tools = [
    Tool(name="search_web", description="Search the web for information about a given query", func=search_web),
    Tool(name="search_conversation", description="Search the conversation history for information about a given query", func=search_conversation),
    Tool(name="general_chat", description="General conversation", func=general_chat),
]

def save_conversation_to_chroma(memory, conversation_id):
    """대화 내용을 저장하고 vectorstore와 store에 영구적으로 저장합니다."""
    base_path = Path("memory_storage/DwgZh7Ud7STbVBnkyvK5kmxUIzw1/Joy")
    base_path.mkdir(parents=True, exist_ok=True)
    text_path = base_path / "conversation.txt"
    
    try:
        # 대화 내용을 텍스트로 포맷팅
        conversation_text = []
        for msg in memory.messages:
            timestamp = str(datetime.now())
            msg_type = "사용자" if isinstance(msg, HumanMessage) else "AI"
            conversation_text.append(f"시간: {timestamp}")
            conversation_text.append(f"발화자: {msg_type}")
            conversation_text.append(f"내용: {msg.content}")
            conversation_text.append("-" * 50)
        
        # 텍스트 파일로 저장
        with open(text_path, 'a', encoding='utf-8') as f:
            f.write(f"\n세션 ID: {conversation_id}\n")
            f.write("\n".join(conversation_text))
            f.write("\n\n")
        
        # 새로 추가된 대화 내용을 저장
        new_doc = Document(
            page_content="\n".join(conversation_text),
            metadata={"session_id": conversation_id}
        )
        process_and_store_documents([new_doc], vectorstore, store)
        
        return "대화 내용이 성공적으로 저장되었습니다."
    except Exception as e:
        print(f"저장 중 오류 발생: {e}")
        return f"저장 중 오류가 발생했습니다: {str(e)}"

# Prompt 템플릿
prompt = ChatPromptTemplate.from_messages([
    ("system", """당신은 도움을 주는 AI 어시스턴트입니다. 
응답할 때 반드시 다음 순서와 형식을 정확히 지켜주세요:

1. 먼저 Thought로 시작:
Thought: 상황 분석 내용

2. 도구 사용이 필요한 경우:
Action: 도구_이름
Action Input: 입력값

3. 도구 실행 결과 확인 후:
Observation: (시스템이 자동으로 제공)

4. 최종 응답:
Final Answer: 사용자에게 전달할 최종 답변

예시:
Thought: 이전 대화에서 삼성 주식에 대한 내용을 찾아봐야겠습니다.
Action: search_conversation
Action Input: 삼성 주식 정보
Observation: (시스템 응답)
Final Answer: 이전 대화에서 삼성 주식은 ...

중요: 각 단계는 반드시 새로운 줄에서 시작하고, 정확한 키워드(Thought/Action/Action Input/Final Answer)를 사용하세요.

다음 상황서는 반드시 해당 도구를 사용하세요:
1. search_conversation: 이전 대화 내용 필요시
2. search_web: 최신 정보나 외부 정보 필요시
3. general_chat: 일반적인 대화나 질문일 때

사용 가능한 도구:
{tools}

도구 이름: {tool_names}"""),
    ("placeholder", "{chat_history}"),
    ("user", "{input}"),
    ("assistant", "{agent_scratchpad}")
])

# 대화 시작
conversation_id = "test_session"
memory = InMemoryChatMessageHistory(session_id=conversation_id)
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True,
    max_iterations=3,
)

agent_with_history = RunnableWithMessageHistory(
    agent_executor,
    lambda session_id: memory,
    input_messages_key="input",
    history_messages_key="chat_history"
)

config = {"configurable": {"session_id": conversation_id}}

# 대화 루프
while True:
    question = input("질문을 입력해주세요 : ")
    result = agent_with_history.invoke({
        "input": question
    }, config=config)

    print("==========================대답==============================")
    print(result['output'])

    if question.lower() == "exit":
        save_result = save_conversation_to_chroma(memory, conversation_id)
        print(save_result)
        break