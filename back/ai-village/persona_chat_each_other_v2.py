from langchain_core.prompts import MessagesPlaceholder, ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from typing import List, Dict
import time
import random
from datetime import datetime
import json

from persona import Persona

from firebase_admin import firestore
import firebase_admin
from firebase_admin import credentials







class ConversationAgent:
    def __init__(self, persona1: Persona, persona2: Persona, uid: str, model: str = "gpt-4o-mini"):
        self.persona = persona1
        self.name = persona1.name
        self.uid = uid
        
        # persona의 기본 특성 가져오기
        self.iss = persona1.scratch.get_str_iss()
        self.personality = persona1.scratch.get_str_personality()
        self.speech = persona1.scratch.get_str_speech()
        self.lifestyle = persona1.scratch.get_str_lifestyle()
        self.current_location = persona1.current_location
        
        # persona2와의 관계 정보 가져오기
        self.relationship_info = persona1.get_relationship_info(persona2.name)
        self.relationship_type = persona1.get_relationship_type_with(persona2.name)
        self.closeness = persona1.get_my_closeness_to(persona2.name)
        self.interaction_style = persona1.get_interaction_style_with(persona2.name)
        self.preferred_activities = persona1.get_activities_i_prefer_with(persona2.name)
        self.potential_conflicts = persona1.get_conflicts_i_feel_with(persona2.name)
        
        self.chat_history: List[dict] = []
        
        # 에이전트의 프롬프트 템플릿 설정
        system_message = f"""당신은 {self.name}입니다.

당신의 기본 특성:
- 성격과 특징: {self.iss}
- 성격: {self.personality}
- 말투: {self.speech}
- 생활 방식: {self.lifestyle}
- 현재 위치: {self.current_location['zone']}

{persona2.name}와의 관계:
- 관계 유형: {self.relationship_type}
- 친밀도: {self.closeness}/10
- 선호하는 상호작용 방식: {self.interaction_style}
- 함께하고 싶은 활동: {', '.join(self.preferred_activities) if self.preferred_activities else '없음'}
- 잠재적 갈등 요소: {', '.join(self.potential_conflicts) if self.potential_conflicts else '없음'}

대화 지침:
1. 당신의 성격과 말투를 일관되게 유지하세요
2. {persona2.name}와의 관계와 친밀도를 고려하여 대화하세요
3. 상호작용 스타일을 반영한 대화를 하세요
4. 잠재적 갈등 요소를 인지하고 적절히 대응하세요
5. 자연스럽고 감정이 담긴 대화를 해주세요
6. 응답할 때 자신의 역할명({persona1.name}:)을 앞에 붙이지 마세요
7. 현재 위치는 {self.current_location['zone']}입니다. 이 정보를 반영하여 대화하세요
8. {persona1.name}의 말투와 personality 를 반영해서 대화하세요.
9. 50 자에서 100자 정도로 작성해주세요


대화 시 주의사항:
- 친밀도가 낮다면 (5 미만) 더 조심스럽고 공손하게 대화하세요
- 친밀도가 높다면 (7 이상) 더 편하고 친근하게 대화하세요
- 잠재적 갈등 요소와 관련된 주제는 신중하게 다루세요

대화를 끝내야 하는 상황
1. 상대방이 작별 인사를 하면, 당신도 작별 인사로 응답하세요
2. 대화가 자연스럽게 마무리되는 시점

시뮬레이션이 종료되면
<END>
태그를 추가하세요.

"""

        self.prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_message),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessagePromptTemplate.from_template("{input}")
        ])
        
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
    def __init__(self, uid: str, db: firestore.Client):
        self.agents: Dict[str, ConversationAgent] = {}
        self.db = db
        self.uid = uid
        
    def save_conversation(self, conversation_id: str, message: str, speaker: str, timestamp: datetime = None):
        if timestamp is None:
            timestamp = datetime.now()
            
        path = f"village/convo/{self.uid}"
        conversation_ref = self.db.collection(path).document(conversation_id)
        conversation_ref.collection('messages').add({
            'speaker': speaker,
            'content': message,
            'timestamp': timestamp,
            'location': self.agents[speaker].current_location
        })

    def add_agent(self, agent: ConversationAgent):
        self.agents[agent.name] = agent
    
    def get_previous_conversation(self, speaker: str, listener: str) -> str:
        """이전 대화 내용을 가져오는 함수"""
        participants = sorted([speaker, listener])
        conversation_id = f"{'-'.join(participants)}"
        
        path = f"village/convo/{self.uid}"
        
        # 최근 대화 내용 가져오기
        messages = (self.db.collection(path)
                   .document(conversation_id)
                   .collection('messages')
                   .order_by('timestamp', direction=firestore.Query.DESCENDING)
                   .limit(5)  # 최근 5개 메시지만
                   .stream())
        
        previous_messages = []
        for msg in messages:
            msg_data = msg.to_dict()
            previous_messages.append(f"{msg_data['speaker']}: {msg_data['content']}")
        
        return "\n".join(reversed(previous_messages)) if previous_messages else "이전 대화 없음"

    def generate_initial_message(self, speaker_agent: ConversationAgent) -> str:
        """선택된 페르소나의 성격에 맞는 대화 시작 메시지를 생성"""
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        
        # 대화 상대 찾기
        listener_name = next(name for name in self.agents.keys() if name != speaker_agent.name)
        
        # 이전 대화 내용 가져오기
        previous_conversation = self.get_previous_conversation(speaker_agent.name, listener_name)
        
        prompt = f"""당신은 {speaker_agent.name}입니다.

당신의 현재 위치는 {speaker_agent.current_location['zone']}입니다.

당신의 특성:
{speaker_agent.iss}
말투: {speaker_agent.speech}

{listener_name}와의 이전 대화 내용:
{previous_conversation}

상황: 당신은 지금 {listener_name}를 만났습니다.
당신의 성격과 말투를 반영하여, 자연스러운 대화 시작 문장을 만들어주세요.

규칙:
1. 당신의 성격에 맞게 대화를 시작하세요
2. 이전 대화 내용이 있다면, 그 맥락을 고려하여 자연스럽게 이어가세요
3. 간단한 인사나 안부를 물어보는 정도로 시작하세요
4. 50 자에서 100자 정도로 작성해주세요
5. 현재 위치({speaker_agent.current_location['zone']})를 고려하여 대화하세요
6. {speaker_agent.name}의 말투와 personality 를 반영해서 대화하세요.

응답 형식: 대화 시작 문장만 작성해주세요."""

        response = llm.invoke(prompt)
        return response.content.strip()
    
    def select_initial_speaker(self) -> ConversationAgent:
        """무작위로 초기 화자를 선택하거나, 성격을 고려하여 선택"""
        agents_list = list(self.agents.values())
        
        # 각 페르소나의 성격을 고려하여 가중치 부여
        weights = []
        for agent in agents_list:
            # 예를 들어, Joy는 대화를 시작하기 더 좋아할 수 있음
            if "Joy" in agent.name:
                weights.append(0.7)
            elif "Anger" in agent.name:
                weights.append(0.2)
            else:
                weights.append(0.1)
        
        # 가중치를 정규화
        total = sum(weights)
        weights = [w/total for w in weights]
        
        # 가중치를 기반으로 초기 화자 선택
        return random.choices(agents_list, weights=weights, k=1)[0]

    def update_relationship(self, conversation_summary: str, speaker: str, listener: str):
        """대화 내용을 바탕으로 관계 정보 업데이트"""
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        
        # relationships.json 읽기
        json_path = f"memory_storage/{self.uid}/relationships.json"
        with open(json_path, 'r', encoding='utf-8') as file:
            relationships = json.load(file)
        
        prompt = f"""
        다음은 {speaker}와 {listener} 사이의 대화 요약입니다:
        {conversation_summary}
        
        현재 두 페르소나의 관계 정보:
        {json.dumps(relationships[speaker][listener], ensure_ascii=False, indent=2)}
        
        이 대화를 바탕으로 두 페르소나의 관계 변화를 분석하고, 다음 항목들을 업데이트해주세요:
        1. closeness (1-10 사이의 숫자)
        2. dynamics (관계 역학)
        3. potential_conflicts (잠재적 갈등 요소)
        
        JSON 형식으로만 응답해주세요.
        """
        
        try:
            response = llm.invoke(prompt)
            updates = json.loads(response.content)
            
            # 관계 정보 업데이트
            relationships[speaker][listener].update(updates)
            relationships[listener][speaker].update(updates)  # 양방향 업데이트
            
            # 파일 저장
            with open(json_path, 'w', encoding='utf-8') as file:
                json.dump(relationships, file, ensure_ascii=False, indent=2)
                
            print(f"\n{speaker}와 {listener}의 관계가 업데이트되었습니다.")
            
        except Exception as e:
            print(f"관계 업데이트 중 오류 발생: {str(e)}")

    def simulate_conversation(self, turns: int = 10):
        # 참여자 이름만으로 conversation_id 생성
        participants = sorted([agent.name for agent in self.agents.values()])
        conversation_id = f"{'-'.join(participants)}"
        
        turns = random.randint(4,10)

        path = f"village/convo/{self.uid}"
        
        # 대화 시작 시간을 별도 필드로 저장
        conversation_ref = self.db.collection(path).document(conversation_id)
        conversation_ref.set({
            'participants': participants,
            'conversations': firestore.ArrayUnion([{
                'start_time': datetime.now(),
                'messages': []  # 이 대화의 메시지들이 저장될 배열
            }])
        }, merge=True)
        
        # 초기 화자 선택
        initial_speaker = self.select_initial_speaker()
        initial_message = self.generate_initial_message(initial_speaker)
        
        print(f"\n=== 대화 시작 ===")
        print(f"{initial_speaker.name}: {initial_message}")
        
        convo_data= []
        convo_data.append({
            'speaker': initial_speaker.name,
            'message': initial_message
        })
        # 초기 메시지 저장
        self.save_conversation(
            conversation_id=conversation_id,
            message=initial_message,
            speaker=initial_speaker.name
        )
        
        current_speaker = initial_speaker.name
        current_message = initial_message
        turn_count = 0
        

        while turn_count < turns:
            speakers = list(self.agents.keys())
            current_idx = speakers.index(current_speaker)
            next_speaker = speakers[(current_idx + 1) % len(speakers)]
            
            response = self.agents[next_speaker].receive_message(current_message, current_speaker)
            
            convo_data.append({
                'speaker': next_speaker,
                'message': response
            })
            time.sleep(0.5)
            print(f"{next_speaker}: {response}")
            
            # 응답 저장
            self.save_conversation(
                conversation_id=conversation_id,
                message=response,
                speaker=next_speaker
            )
            
            if "<END>" in response:
                print("\n=== 대화가 자연스럽게 종료되었습니다 ===")
                break
            
            current_speaker = next_speaker
            current_message = response
            turn_count += 1
            
            if turn_count >= turns:
                print(f"\n=== {turns}턴의 대화가 완료되었습니다 ===")
        
        # 대화가 끝난 후 관계 업데이트를 위한 대화 요약
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        conversation_summary_prompt = f"""
        다음 대화를 요약해주세요:
        {convo_data}
        
        주요 감정 변화와 상호작용을 중심으로 요약해주세요.
        """
        
        conversation_summary = llm.invoke(conversation_summary_prompt).content
        
        # 관계 정보 업데이트
        participants = list(self.agents.keys())
        self.update_relationship(conversation_summary, participants[0], participants[1])


