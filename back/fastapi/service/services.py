from database import db, client, aiclient, get_persona_collection, store_long_term_memory
from personas import personas
from utils import get_current_time_str, generate_unique_id, parse_firestore_timestamp
from fastapi import HTTPException, BackgroundTasks
from typing import List
from datetime import datetime
import json
import base64
import requests
from firebase_admin import firestore
from models import PersonaChatRequest
import random

from dotenv import load_dotenv
load_dotenv()
import asyncio
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from typing import List
from models import AllPersonasSchedule, PersonaSchedule, ScheduleItem

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from personaCommentDebate import run_debate, FeedCommentRequest
from service.interactionStore import store_user_interaction
from service.friendPersonaComment import generate_friends_comments, FriendCommentRequest

# OpenAI 객체를 생성합니다.
model = ChatOpenAI(temperature=0, model_name="gpt-4o-mini")

parser = JsonOutputParser(pydantic_object=AllPersonasSchedule)

prompt = ChatPromptTemplate.from_messages([
    ("system", """당신은 주인의 페르소나 5명(Joy, Anger, Disgust, Sadness, Fear)의 상호작용하는 일정을 만드는 챗봇입니다. 
    각 페르소나의 특성은 다음과 같습니다: {personas}
    
    다음 지침을 따라 일정을 만들어주세요:
    1. 주인의 일정에서 중요한 시점마다 대화 주제를 생성해주세요 (약 5-7개).
    2. 각 시점마다 주인의 감정과 가장 일치하는 페르소나와 그 반대의 페르소나를 선택하세요.
    3. 시간을 정각, 10분 단위가 아닌 랜덤한 시간으로 설정해주세요 (예: 06:17, 08:43 등).
    4. 선택된 두 페르소나가 주인의 일정, 감정, 생각, 행동에 대해 대화하는 주제를 만들어주세요.
    5. 각 페르소나의 특성이 잘 드러나도록 대화 주제를 설계해주세요.
    """),
    ("user", "다음 형식에 맞춰 일정을 작성해주세요: {format_instructions}\n\n 주인의 오늘 일정: {input}")
])
prompt = prompt.partial(
    format_instructions=parser.get_format_instructions(),
    personas=personas
)

chain = prompt | model | parser

my_persona = '1. "오늘 아침 6시에 일어나 30분 동안 요가를 했다. 샤워 후 간단한 아침 식사로 오밀과 과일을 먹었다. 8시에 출근해서 오전 회의에 석했고, 점심은 동료들과 회사 근처 샐러드 바에서 먹었다. 오후에는 프로젝트 보고서를 작성하고, 6시에 퇴근했다. 저녁에는 집에서 넷플릭스로 드라마를 한 편 보고 11시에 취침했다."2. "오늘은 휴일이라 늦잠을 자고 10시에 일어났다. 브런치로 팬케이크를 만들어 먹고, 오후에는 친구와 약속이 있어 카페에서 만났다. 함께 영화를 보고 저녁식사로 이탈리안 레스토랑에 갔다. 집에 돌아와 독서를 하다가 12시경 잠들었다."3. "아침 7시에 기상해서 공원에서 5km 조깅을 했다. 집에 돌아와 샤워하고 출근 준비를 했다. 재택근무 날이라 집에서 일했는데, 오전에 화상회의가 있었고 오후에는 보고서 작성에 집중했다. 저녁에는 요리를 해먹고, 기타 연습을 1시간 했다. 10시 30분에 취침했다."4. "오늘은 6시 30분에 일어나 아침 뉴스를 보며 커피를 마셨다. 8시에 출근해서 오전 내내 고객 미팅을 했다. 점심은 바쁜 일정 때문에 사무실에서 도시락으로 해결했다. 오후에는 팀 의와 이메일 처리로 시간을 보냈다. 퇴근 후 헬스장에 들러 1시간 운동 하고, 집에 와 간단히 저녁을 먹 10시 30분 잠들었다."5. "주말 아침, 8에 일어 베이킹을 했다. 직접 만든 빵으로 아침을 먹고, 오전에는 집 대청소를 했다. 점심 후에는 근처 도서관에 가서 2시간 동안 책을 읽었다. 저녁에는 가족들과 함께 바비큐 파티를 열어 즐거운 시간을 보냈다. 밤에는 가족과 보드게임을 하다가 11시 30분에 잠들었다."'


def generate_daily_schedule(user_schedule: str):
    result = chain.invoke({"input": user_schedule})
    return result

def generate_and_save_user_schedule(uid: str):
    # 사용자의 실제 일정을 가져옵니다.
    ## 구글 스케쥴 로직 구현
    user_ref = db.collection('users').document(uid)
    # user_data = user_ref.get()
    # user_schedule = user_data.to_dict().get('my_persona', '')
    
    # 사용자의 일정을 기반으로 페르소나들의 일정을 생성합니다.
    all_schedules_dict = generate_daily_schedule(my_persona)
    all_schedules = AllPersonasSchedule(**all_schedules_dict)
    
    # Firebase에 저장
    # 추후 서버 재시작했을 때 꺼나오거나 / 메시지 큐 ?? 
    user_ref.set({
        'schedule': all_schedules.dict()
    }, merge=True)
    
    return all_schedules

def print_schedules(all_schedules):
    for persona_schedule in all_schedules.schedules:
        print(f"\n{persona_schedule.persona}의 일정:")
        for item in persona_schedule.schedule:
            print(f"{item.time}: {persona_schedule.persona} : target : {item.interaction_target}: {item.topic}")
        print()

def get_relevant_memories(uid, persona_name, query, k=3):
    collection = get_persona_collection(uid, persona_name)
    query_embedding = aiclient.embeddings.create(
        input=query,
        model="text-embedding-ada-002"
    ).data[0].embedding
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k
    )
    return results['documents'][0] if results['documents'] else []

def get_relevant_conversations(uid: str, persona_name: str, query: str, limit: int = 5): # 사용자의 대화 중 관련된 대화를 가져오는 함수 벡터db서치
    print("services.py > get_relevant_conversations 호출")
    collection = get_persona_collection(uid, persona_name)
    query_embedding = aiclient.embeddings.create(
        input=query,
        model="text-embedding-ada-002"
    ).data[0].embedding
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=limit,
        where={"type": "persona_conversation"}  # 페르소나 간 대화만 가져오기
    )
    
    conversations = []
    if results['documents']:
        for doc, metadata in zip(results['documents'][0], results['metadatas'][0]):
            conversations.append({
                "conversation": doc,
                "persona1": metadata['persona1'],
                "persona2": metadata['persona2'],
                "timestamp": metadata['timestamp'],
                "topic": metadata['topic']
            })
    
    return conversations

def get_relevant_feed_posts(uid, query, k=3): # 사용자의 피드 중 관련된 피드를 가져오는 함수 벡터db서치
    results = query_memories(
        uid=uid,
        query=query,
        memory_type="feed_post",  # 피드 포스트 타입으로 검색
        persona_name="feed",
        limit=k
    )
    if results['documents']:
        parsed_docs = []
        for doc in results['documents'][0]:
            try:
                parsed_doc = json.loads(doc) if doc else {}
                parsed_docs.append(parsed_doc)
            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {e}")
                print(f"Problematic document: {doc}")
                parsed_docs.append({})
        return parsed_docs
    return []

def generate_response(persona_name, user_input, user):
    print("services.py > generate_response 출")
    persona = personas[persona_name]
    relevant_memories = get_relevant_memories(user.get('uid', ''), persona_name, user_input, k=3)
    recent_conversations = get_relevant_conversations(user.get('uid', ''), persona_name, user_input)  # user_input을 query로 추가
    relevant_feed_posts = get_relevant_feed_posts(user.get('uid', ''), user_input, k=3)
    print("services.py > generate_response > relevant_memories : ", relevant_memories)  
    print("services.py > generate_response > recent_conversations : ", recent_conversations)
    print("services.py > generate_response > relevant_feed_posts : ", relevant_feed_posts)
    feed_posts_list = []
    for i, post in enumerate(relevant_feed_posts):
        caption = post.get('caption', '캡션 없음')
        image_description = post.get('image_description', '이미지 설명 없음')
        feed_posts_list.append(f"피드 {i+1}: 캡션: {caption}, 이미지 설명: {image_description}")
    
    feed_posts_str = '\n'.join(feed_posts_list) if feed_posts_list else "관련 피드 없음"
    
    current_time = get_current_time_str()
    
    user_profile = user.get('profile', {})
    user_info = f"""
사용자 정보:
이름: {user.get('displayName', '정보 없음')}
이메일: {user.get('email', '정보 없음')}
회원가입 날짜: {user.get('createdAt', '정보 없음')}
성별: {user_profile.get('gender', '정보 없음')}
MBTI: {user_profile.get('mbti', '정보 없음')}
지역: {user_profile.get('region', '정보 없음')}
교육:
  - 수준: {user_profile.get('education', {}).get('level', '정보 없음')}
  - 전공: {user_profile.get('education', {}).get('major', '정보 없음')}
  - 대학: {user_profile.get('education', {}).get('university', '정보 없음')}
    """

    conversation_history = "\n".join([f"[{conv[2]}] 사용자: {conv[0]}\n[{conv[2]}] {persona_name}: {conv[1]}" for conv in recent_conversations])

    memories_list = '\n'.join([f"기억 {i+1}: {memory}" for i, memory in enumerate(relevant_memories)]) if relevant_memories else "관련 기억 없음"

    system_message = f"""
당신은 {persona_name}입니다.
- 설명: {persona['description']}
- 말투: {persona['tone']}
- 예시: "{persona['example']}"

당신의 목표는 위의 특성을 바탕으로 사용자에게 응답하는 것입니다.
사용자와 친구처럼 반말로 대화하세요.
현재 시간은 {current_time} 입니다. 시간에 관한 질문에는 이 정보를 사용하여 답변하세요.
"""

    assistant_instructions = """
- 최근 대화 내역, 관련 기억, 사용자 정보, 그리고 관련 피드 정보를 활용하여 답변하세요.
- 반드시 페르소나의 말투와 성격을 반영하세요.
- 답변은 짧고 간결하게 작성하세요.
- 사용자에게 도움이 되는 정보를 제공하세요.
- 시간에 관한 질문에는 제공된 현재 시간 정보를 사용하여 정확히 답변하세요.
- 사용자의 최근 피드 내용을 언급하여 대화에 자연스럽게 연결하세요.
"""

    prompt = f"""
{user_info}

최근 대화 내역:
{conversation_history}

관련 기억:
{memories_list}

관련 피드:
{feed_posts_str}

현재 시간: {current_time}

중요: 다음은 사용자의 질문입니다. 질문에 관하여 답해주세요.
사용자: {user_input}
"""

    messages = [
        {"role": "system", "content": system_message.strip()},
        {"role": "user", "content": prompt.strip()},
        {"role": "assistant", "content": assistant_instructions.strip()},
    ]

    response = aiclient.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=150,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()

# 사용자 페르소나 대화 임베딩
def store_conversation(uid, persona_name, user_input, response):
    conversation = f"사용자: {user_input}\n{persona_name}: {response}"
    embedding = aiclient.embeddings.create(
        input=conversation,
        model="text-embedding-ada-002"
    ).data[0].embedding
    collection = get_persona_collection(uid, persona_name)
    metadata = {
        "is_user_input": True,
        "persona": persona_name,
        "timestamp": datetime.now().isoformat(),
        "user_input": user_input,
        "response": response
    }
    unique_id = generate_unique_id()
    collection.add(
        documents=[conversation],
        embeddings=[embedding],
        metadatas=[metadata],
        ids=[unique_id]
    )

# 페르소나 끼리의 대화 임베딩
def store_persona_conversation(uid: str, persona1_name: str, persona2_name: str, conversation: List[str]):
    full_conversation = "\n".join(conversation)
    embedding = aiclient.embeddings.create(
        input=full_conversation,
        model="text-embedding-ada-002"
    ).data[0].embedding
    
    metadata = {
        "persona1": persona1_name,
        "persona2": persona2_name,
        "timestamp": datetime.now().isoformat(),
        "type": "persona_conversation",
        "topic": conversation[0].split(": ", 1)[1].split(" ", 1)[0]  # 첫 번째 메시지에서 주제 추출
    }
    unique_id = generate_unique_id()
    
    # 첫 번째 페르소나의 컬렉션에 저장
    collection1 = get_persona_collection(uid, persona1_name)
    collection1.add(
        documents=[full_conversation],
        embeddings=[embedding],
        metadatas=[metadata],
        ids=[f"{unique_id}_1"]
    )
    
    #  번째 페르소나의 컬렉션에 저장
    collection2 = get_persona_collection(uid, persona2_name)
    collection2.add(
        documents=[full_conversation],
        embeddings=[embedding],
        metadatas=[metadata],
        ids=[f"{unique_id}_2"]
    )

def store_conversation_firestore(uid, persona_name, user_input, response):
    chat_ref = db.collection('chat').document(uid).collection(persona_name)
    chat_ref.add({
        'user_input': user_input,
        'response': response,
        'timestamp': firestore.SERVER_TIMESTAMP
    })

async def chat_with_persona(chat_request):
    print("services.py > chat_with_persona 호출")
    if chat_request.persona_name.lower() not in [persona.lower() for persona in personas]:
        print("chat_request.persona_name : ", chat_request.persona_name)
        raise HTTPException(status_code=400, detail="선택한 페르소나가 존재하지 않습니다.")
    
    response = generate_response(chat_request.persona_name, chat_request.user_input, chat_request.user) # 모델 호출 답변을 만들어주는 gpt에 넘기는
    print("services.py > chat_with_persona > response : ", response)
    
    # 대화 내역 장 (ChromaDB)
    store_conversation(chat_request.user.get('uid', ''), chat_request.persona_name, chat_request.user_input, response)
    
    # 대화 내역 저장 (Firestore)
    store_conversation_firestore(chat_request.user.get('uid', ''), chat_request.persona_name, chat_request.user_input, response)
    
    return {"persona_name": chat_request.persona_name, "response": response}

def get_personas():
    return list(personas.keys())

async def create_feed_post(post):
    try:
        # 이미지 분석
        response = requests.get(post.image)
        response.raise_for_status()
        image_data = response.content
        img_data = base64.b64encode(image_data).decode('utf-8')

        analysis = aiclient.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "이 이미지를 자세히 설명해주세요."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_data}"}}
                ]
            }],
            max_tokens=300
        )

        image_description = analysis.choices[0].message.content.strip()
        
        # Redis에 단기 기억 저장
        memory_content = f"주인이 새로운 피드를 올렸어: {post.caption}"
        if image_description:
            memory_content += f" (이미지: {image_description})"
            
        await store_user_interaction(
            uid=post.userId,
            interaction_data={
                'type': 'feed',
                'importance': 8,
                'message': memory_content,  # 위에서 생성한 memory_content 활용
                'timestamp': datetime.now().isoformat()
            }
        )

        # Firestore 피드 문서 업데이트
        feed_doc = db.collection('feeds').document(post.id)
        feed_doc.update({
            'image_description': image_description
        })

        # 벡터 DB 저장
        embedding_text = f"{post.caption} {image_description}"
        embedding = aiclient.embeddings.create(
            input=embedding_text,
            model="text-embedding-ada-002"
        ).data[0].embedding

        collection = get_persona_collection(post.userId, "feed")
        collection.add(
            documents=[json.dumps(feed_doc.get().to_dict())],
            embeddings=[embedding],
            metadatas=[{"post_id": post.id, "created_at": post.createdAt}],
            ids=[post.id]
        )

        # 댓글 생성 요청
        comment_debate_request = FeedCommentRequest(
            uid=post.userId,
            feed_id=post.id,
            image_description=image_description,
            caption=post.caption,
            comment_count=2
        )

        await run_debate(comment_debate_request)

        # 친구들의 페르소나 댓글 생성
        friend_comment_request = FriendCommentRequest(
            userId=post.userId,
            feedId=post.id,
            image_description=image_description,
            caption=post.caption,
            friendId=""  # generate_friends_comments 함수에서 친구 목록을 조회함
        )
        await generate_friends_comments(friend_comment_request)

        # 피드 내용을 장기 메모리로 저장
        feed_content = f"Caption: {post.caption}\nImage Description: {image_description}"
        store_long_term_memory(
            uid=post.userId,
            persona_name="feed",
            memory=feed_content,
            memory_type="feed_post"  # 피드 포스트 타입 지정
        )

        return {"message": "Feed post updated successfully", "image_description": image_description}

    except Exception as e:
        print(f"Error processing feed post: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def persona_chat(chat_request: PersonaChatRequest):
    if chat_request.persona1 not in personas or chat_request.persona2 not in personas:
        raise HTTPException(status_code=400, detail="선택한 페르소나가 존재하지 않습니다.")
    
    conversation = []
    current_topic = chat_request.topic
    total_rounds = chat_request.rounds

    # 첫 번째 페르소나가 주제에 대해 먼저 말하도록 합니다.
    initial_response = generate_persona_response(chat_request.uid, chat_request.persona1, current_topic, [], total_rounds, 1, is_initial=True)
    conversation.append(f"{chat_request.persona1}: {initial_response}")

    for i in range(total_rounds):
        current_round = i + 1
        # 두 번째 페르소나가 이전 대화에 반응합니다.
        response2 = generate_persona_response(chat_request.uid, chat_request.persona2, current_topic, conversation, total_rounds, current_round)
        conversation.append(f"{chat_request.persona2}: {response2}")

        # 첫 번째 페르소나가 다시 반응합니다 (마지막 라운드가 아닌 경우에만)
        if current_round < total_rounds:
            response1 = generate_persona_response(chat_request.uid, chat_request.persona1, current_topic, conversation, total_rounds, current_round)
            conversation.append(f"{chat_request.persona1}: {response1}")

    # 대화 내용을 벡터 DB에 저장
    store_persona_conversation(chat_request.uid, chat_request.persona1, chat_request.persona2, conversation)

    return {"conversation": conversation}



def generate_persona_response(uid: str, persona_name: str, topic: str, conversation: List[str], total_rounds: int, current_round: int, is_initial: bool = False):
    persona = personas[persona_name]
    conversation_str = "\n".join(conversation[-4:])  # 최근 4개의 대화 포함

    # 초기 응답이거나 대화가 없는 경우 주제를 기반으로 관련 정보를 가져옵니다.
    if is_initial or not conversation:
        query = f"주인이 {topic}에 대해 어떤 기분일지 궁금해."
    else:
        # 가장 최근의 대화를 쿼리로 사용합니다.
        query = conversation[-1]

    relevant_memories = get_relevant_memories(uid, persona_name, query, k=3)
    relevant_conversations = get_relevant_conversations(uid, persona_name, query, limit=3)

    system_message = f"""당신은 '{persona_name}'이라는 페르소나입니다. 
{persona['description']}
{persona['tone']}
예시 대화: {persona['example']}

관련 기억:
{format_memories(relevant_memories)}

관련 이전 대화:
{format_conversations(relevant_conversations)}"""

    # 자연스럽게 대화를 이어가는 프롬프트
    prompt = f"""주제: {topic}

이전 대화:
{conversation_str}

당신은 주인의 펫입니다. 항상 주인님을 위해 생각하고, 주인님의 기분과 일정을 염려해야 합니다. 지금 다른 펫과 함께 주인님의 상태와 일정을 논의하고 있습니다.

주제: {topic}

당신은 {persona_name}로서 상대 펫과 주인님에 대해 대화하세요. 상대방이 마지막으로 말한 내용에 자연스럽게 반응하고, 주인님이 잘 지내고 있는지, 더 도움이 될 방법이 무엇인지 논의하세요. 당신의 특성을 살려 대화를 이어가세요.

주의사항:
1. 상대방의 발언에 맞춰 대화를 1~2문장으로 짧게 이어가세요.
2. 페르소나의 특성에 맞춰 자연스럽게 반응하세요.
3. 대화는 주인의 상태나 일정에 대한 의견을 나누는 데 집중하세요.
4. 주인을 도울 수 있는 방법에 대해 서로 논의하세요.
5. 대화 중 이모티콘은 가끔 사용하여 감정을 표현하세요.
6. 주인님의 상태와 일정을 고려하여 대화를 이어가세요.
7. 대화중 자신의 이름은 사용하지 말아주세요.
8. 반말로 대화하세요.
"""

    messages = [
        {"role": "system", "content": system_message.strip()},
        {"role": "user", "content": prompt.strip()},
    ]

    response = aiclient.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=150,
        temperature=0.8,
    )

    generated_response = response.choices[0].message.content.strip()
    print(f"{persona_name}: {generated_response}")
    return generated_response

def format_memories(memories: List[str]) -> str:
    return "\n".join([f"- {memory}" for memory in memories])

def format_conversations(conversations: List[dict]) -> str:
    formatted = []
    for conv in conversations:
        formatted.append(f"주제: {conv['topic']}\n대화:\n{conv['conversation']}")
    return "\n\n".join(formatted)

def create_task(uid: str, persona_name: str, interaction_target: str, topic: str, conversation_rounds: int):
    async def task():
        print(f"현재 시간에 '{persona_name}'가 '{interaction_target}'에게 다음 주제로 상호작용합니다: {topic} (라운드: {conversation_rounds})")
        chat_request = PersonaChatRequest(
            uid=uid,
            topic=topic,
            persona1=persona_name,
            persona2=interaction_target,
            rounds=conversation_rounds
        )
        result = await persona_chat(chat_request)
        print(f"상호작용 결과: {result}")
    return task

def schedule_tasks(uid: str, all_schedules: AllPersonasSchedule):
    if isinstance(all_schedules, dict):
        all_schedules = AllPersonasSchedule(**all_schedules)
    
    for persona_schedule in all_schedules.schedules:
        for item in persona_schedule.schedule:
            task = create_task(uid, persona_schedule.persona, item.interaction_target, item.topic, item.conversation_rounds)
            # FastAPI의 BackgroundTasks를 사용하여 작업 예약
            # 실제 구현 시 별도의 작업 스케줄러나 메시지 큐 시스템 사용하기!! (연구 필요할듯)
            BackgroundTasks().add_task(task)
    print("모든 작업이 예약되었습니다.")

def get_user_schedule(uid: str):
    user_ref = db.collection('users').document(uid)
    user_data = user_ref.get()
    if user_data.exists:
        schedule_data = user_data.to_dict().get('schedule')
        if schedule_data:
            return AllPersonasSchedule(**schedule_data)
    return None











