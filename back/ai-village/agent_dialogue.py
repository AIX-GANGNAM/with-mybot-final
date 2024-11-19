from datetime import datetime
from persona import Persona
from typing import List
from langchain_core.chat_history import InMemoryChatMessageHistory
from pathlib import Path

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser


class DialogueManager:
    def __init__(self):
        self.memory_store = {}  # 대화별 메모리 저장소
        
    def get_memory(self, persona1_name, persona2_name):
        dialogue_id = f"{persona1_name}_{persona2_name}"
        if dialogue_id not in self.memory_store:
            self.memory_store[dialogue_id] = InMemoryChatMessageHistory(session_id=dialogue_id)
        return self.memory_store[dialogue_id]

    def save_conversation(self, persona1_name, persona2_name):
        dialogue_id = f"{persona1_name}_{persona2_name}"
        memory = self.memory_store.get(dialogue_id)
        if memory:
            base_path = Path(f"memory_storage/{persona1_name}/conversations")
            base_path.mkdir(parents=True, exist_ok=True)
            
            file_path = base_path / f"{dialogue_id}.txt"
            with open(file_path, 'a', encoding='utf-8') as f:
                for msg in memory.messages:
                    f.write(f"시간: {datetime.now()}\n")
                    f.write(f"발화자: {msg.type}\n")
                    f.write(f"내용: {msg.content}\n")
                    f.write("-" * 50 + "\n")


def can_have_conversation(persona1 : Persona , persona2 : Persona):
    """두 페르소나간 대화가 가능한지 파악을 합니다"""

    closeness = persona1.get_my_closeness_to(persona2.name)

    if closeness < 5:
        return False, f"{persona1.name} 와 {persona2.name} 간의 친밀도가 너무 낮습니다."
    return True, "두 페르소나간 대화가 가능합니다."


def start_conversation(persona1 : Persona, persona2 : Persona, dialogue_manager: DialogueManager):
    """두 페르소나간 대화를 위한 프롬프트를 생성합니다."""

    can_talk , reason = can_have_conversation(persona1, persona2)

    if not can_talk:
        return reason
    
    relation_info = persona1.get_relationship_info(persona2.name)

    prompt = f"""
    당신은 {persona1.name} 입니다. 다음은 당신의 현재 상태입니다:
    {persona1.scratch.get_str_iss()}

    길을 걷다가 {persona2.name}와(과) 마주쳤습니다.
    {persona2.name}와(과)의 관계:
    {relation_info}

    당신의 성격과 현재 상태, 그리고 {persona2.name}와(과)의 관계를 고려하여 
    자연스러운 대화를 시작해주세요. 
    
    다음 사항들을 고려해주세요:
    - 현재 감정 상태를 반영한 대화
    - 이전 관계를 고려한 적절한 존댓말 사용
    - 상황에 맞는 인사말로 시작
    - 구체적인 질문이나 대화 주제 언급
    
    {persona2.name}에게 어떻게 말을 걸까요?
    """

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5)

    chain = llm | StrOutputParser()

    memory = dialogue_manager.get_memory(persona1.name, persona2.name)

    response = chain.invoke(prompt)
    memory.add_ai_message(response)
    return response


def answer_conversation(persona1: Persona, persona2: Persona, message: str, dialogue_manager: DialogueManager):
    memory = dialogue_manager.get_memory(persona1.name, persona2.name)
    
    # 이전 대화 내용을 포맷팅
    chat_history = ""
    for msg in memory.messages:
        speaker = persona1.name if msg.type == "ai" else persona2.name
        chat_history += f"{speaker}: {msg.content}\n"

    prompt = f"""
    당신은 {persona1.name} 입니다. 다음은 당신의 현재 상태입니다:
    {persona1.scratch.get_str_iss()}

    {persona2.name}와(과)의 관계:
    {persona1.get_relationship_info(persona2.name)}

    이전 대화 내용:
    {chat_history}

    {persona2.name}의 마지막 메시지:
    {message}

    다음 사항들을 고려하여 대화를 이어가주세요:
    1. 이미 인사를 나눴으므로 다시 인사하지 마세요
    2. 이전 대화 내용을 고려하여 자연스럽게 응답하세요
    3. 이전에 언급된 주제나 감정에 대해 연속성 있게 대화하세요
    4. 대화의 흐름을 자연스럽게 이어가세요

    {persona2.name}의 마지막 메시지에 대한 당신의 응답을 작성해주세요.
    """

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5)

    chain = llm | StrOutputParser()

    response = chain.invoke(prompt)
    memory.add_user_message(message)    # 상대방의 메시지 저장
    memory.add_ai_message(response)     # 내 응답 저장
    return response


def make_conversation_history(persona1: Persona, persona2: Persona, history: list, message: str):
    # 첫 대화를 히스토리에 추가
    if not history:  # 히스토리가 비어있을 경우
        history.append(f"{persona1.name}: {message}\n")
    else:
        history.append(f"{persona1.name}: {history[-1]}\n{persona2.name}: {message}\n")
    
    return history

