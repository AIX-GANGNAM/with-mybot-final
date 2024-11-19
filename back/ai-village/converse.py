from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor, Tool
from langchain.prompts import ChatPromptTemplate
from langchain import hub

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
from langchain.retrievers import ParentDocumentRetriever
from langchain.schema import Document
from langchain_community.document_loaders import JSONLoader

import uuid
import pickle  # 추가
import os
import json
from pathlib import Path


PERSIST_DIRECTORY = "./chroma_db"

# 저장소 디렉토리 생성
os.makedirs(PERSIST_DIRECTORY, exist_ok=True)


# JSONLoader 부분 수정
text_path = "./memory_storage/DwgZh7Ud7STbVBnkyvK5kmxUIzw1/Joy/conversation.txt"
loaders = []

if os.path.exists(text_path):
    loader = TextLoader(text_path)
    loaders.append(loader)

docs = []
for loader in loaders:
    docs.extend(loader.load())

# 디버깅을 위한 출력
print("로드된 문서 수:", len(docs))
if docs:
    print("첫 번째 문서 내용:", docs[0].page_content)







# 문서 분할 설정
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=100)
child_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=10)


embeddings = OpenAIEmbeddings()

store = InMemoryStore()

vectorstore = Chroma(
    collection_name = "chat_history",
    embedding_function = embeddings,
    persist_directory = PERSIST_DIRECTORY,
)

retriever = ParentDocumentRetriever(
    vectorstore = vectorstore,
    docstore = store,
    child_splitter = child_splitter,
    parent_splitter = parent_splitter,
    search_kwargs={"k": 5}
)

# docs가 비어있지 않을 때만 retriever에 추가
if docs:
    retriever.add_documents(docs)





# Tool
def multiply(first_input : int , second_input : int ) -> int:
    """Multiply two numbers"""

    print("곱셈 함수",first_input, second_input)

    return first_input * second_input


def search_web(query : str) -> str:
    """Search the web for information about a given query"""
    search = TavilySearchResults(
        max_results=3,
        include_answer=True,
        include_raw_content=True,
        include_domains=[],
    )

    print("검색 결과===================================================================================")
    print(search.invoke(query))

    result = search.invoke(query)

    return result


def search_conversation(query: str) -> str:
    """이전 대화 내용에서 관련 정보를 검색합니다."""
    print("대화 검색===================================================================================")
    
    try:
        # MMR 검색 사용
        results = vectorstore.max_marginal_relevance_search(
            query,
            k=5,  # 검색할 총 문서 수
            fetch_k=20,  # 후보 문서 수
            lambda_mult=0.5  # 다양성 vs 관련성 균형 조절 (0: 최대 다양성, 1: 최대 관련성)
        )
        
        if not results:
            return "관련된 대화 내용을 찾을 수 없습니다."
        
        # 검색 결과 디버깅
        print(f"검색된 문서 수: {len(results)}")
        for i, doc in enumerate(results):
            print(f"\n문서 {i+1}:")
            print(f"내용: {doc.page_content}")
            print(f"메타데이터: {doc.metadata}")
        
        # 컨텍스트 구성
        context = "\n\n".join([
            f"시간: {doc.metadata.get('timestamp', '시간 정보 없음')}\n"
            f"내용: {doc.page_content}"
            for doc in results
        ])
        
        prompt = f"""다음은 이전 대화의 관련 내용입니다:

{context}

이 맥락을 바탕으로 질문에 답변해주세요: {query}
"""
        
        return llm.invoke(prompt)
    except Exception as e:
        print(f"검색 중 오류 발생: {e}")
        return f"검색 중 오류가 발생했습니다: {str(e)}"




# Tool 함수 정의

tools = [
    Tool(
        name = "multiply",
        description = "Multiply two numbers",
        func = multiply
    ),
    Tool(
        name = "search_web",
        description = "Search the web for information about a given query",
        func = search_web
    ),
    Tool(
        name = "search_conversation",
        description = "Search the conversation for information about a given query",
        func = search_conversation
    )
]


# 채팅 내용 저장
def save_conversation_to_chroma(memory, conversation_id):
    # 저장 경로 설정
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
            conversation_text.append("-" * 50)  # 구분선
        
        # 텍스트 파일로 저장 (기존 내용에 추가)
        with open(text_path, 'a', encoding='utf-8') as f:
            f.write(f"\n세션 ID: {conversation_id}\n")
            f.write("\n".join(conversation_text))
            f.write("\n\n")  # 세션 간 구분을 위한 빈 줄
            
        return "대화 내용이 성공적으로 저장되었습니다."
    except Exception as e:
        print(f"저장 중 오류 발생: {e}")
        return f"저장 중 오류가 발생했습니다: {str(e)}"




llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 기존 프롬프트 가져오기
# base_prompt = hub.pull("hwchase17/react-chat")

# 시스템 메시지 수정



conversation_id = "test_session"

memory = InMemoryChatMessageHistory(session_id = conversation_id)






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
3. multiply: 숫자 곱셈 필요시

사용 가능한 도구:
{tools}

도구 이름: {tool_names}"""),
    ("placeholder", "{chat_history}"),
    ("user", "{input}"),
    ("assistant", "{agent_scratchpad}")
])




# AgentExecutor 설정
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
    lambda session_id : memory,
    input_messages_key = "input",
    history_messages_key = "chat_history"
)

config = {"configurable" : {"session_id" : conversation_id}}




while True:
    question = input("질문을 입력해주세요 : ")
    result = agent_with_history.invoke({
        "input" : question
    }, config = config)

    print("==========================대답==============================")

    print(result['output'])


    if question.lower() == "exit":

        save_result  = save_conversation_to_chroma(memory, conversation_id)
        print(save_result)

        break





