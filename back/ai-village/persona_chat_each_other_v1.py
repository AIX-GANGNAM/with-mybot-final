from langchain_core.prompts import MessagesPlaceholder, ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from typing import List, Dict
import time

class ConversationAgent:
    def __init__(self, name: str, role: str, personality: str, model: str = "gpt-3.5-turbo"):
        self.name = name
        self.role = role
        self.personality = personality
        self.chat_history: List[dict] = []
        
        # 에이전트의 프롬프트 템플릿 설정
        system_message = f"""당신은 {name}입니다. {role}의 역할을 맡고 있으며, 
        다음과 같은 성격을 가지고 있습니다: {personality}
        
        대화할 때 당신의 성격과 역할에 맞게 응답해야 합니다.
        응답은 간단명료하게 해주세요.
        응답할 때 자신의 역할명({name}:)을 앞에 붙이지 마세요.
        
        대화는 다음과 같은 상황에서만 끝내야 합니다:
        1. 고객이 명확하게 "계산해주세요"라고 요청했을 때
        2. 고객이 "감사합니다. 안녕히 계세요"와 같은 작별 인사를 했을 때
        3. 고객이 식사를 마치고 계산까지 완료했을 때
        
        위의 상황이 아니라면 절대로 대화를 끝내지 마세요.
        대화를 끝낼 때는 반드시 응답 끝에 <END> 태그를 추가하세요.
        
        레스토랑 대화의 일반적인 흐름:
        1. 메뉴 추천 및 설명
        2. 주문 받기 (익힘 정도, 사이드 메뉴 등)
        3. 음식 서빙
        4. 추가 요청 처리
        5. 식사 완료 및 계산
        6. 작별 인사
        
        각 단계를 충실히 수행하고, 고객의 모든 질문에 친절하게 답변하세요."""
        
        self.prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_message),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessagePromptTemplate.from_template("{input}")
        ])
        
        # ChatOpenAI 모델 초기화
        self.llm = ChatOpenAI(model=model, temperature=0.7)

    def receive_message(self, message: str, sender: str) -> str:
        # 대화 기록에 메시지 추가
        self.chat_history.append({"sender": sender, "message": message})
        
        # 대화 기록을 프롬프트에 맞는 형식으로 변환
        formatted_history = []
        for msg in self.chat_history[:-1]:
            if msg["sender"] != self.name:
                formatted_history.append(HumanMessage(content=f"{msg['message']}"))
            else:
                formatted_history.append(AIMessage(content=msg['message']))
        
        # 응답 생성
        chain = self.prompt | self.llm
        response = chain.invoke({
            "chat_history": formatted_history,
            "input": message
        })
        
        # 응답을 대화 기록에 추가
        self.chat_history.append({"sender": self.name, "message": response.content})
        
        return response.content

class ConversationSimulation:
    def __init__(self):
        self.agents: Dict[str, ConversationAgent] = {}
        
    def add_agent(self, agent: ConversationAgent):
        self.agents[agent.name] = agent
        
    def simulate_conversation(self, initial_speaker: str, initial_message: str):
        current_speaker = initial_speaker
        current_message = initial_message
        
        print(f"{current_speaker}: {current_message}")
        
        while True:
            # 다음 화자 결정
            next_speaker = list(self.agents.keys())[(list(self.agents.keys()).index(current_speaker) + 1) % len(self.agents)]
            
            # 다음 화자의 응답 생성
            response = self.agents[next_speaker].receive_message(current_message, current_speaker)
            
            # 잠시 대기하여 자연스러운 대화 흐름 생성
            time.sleep(1)
            
            # <END> 태그 확인 및 출력
            if "<END>" in response:
                response = response.replace("<END>", "").strip()
                print(f"{next_speaker}: {response}")
                print("\n대화가 종료되었습니다.")
                break
                
            print(f"{next_speaker}: {response}")
            
            current_speaker = next_speaker
            current_message = response