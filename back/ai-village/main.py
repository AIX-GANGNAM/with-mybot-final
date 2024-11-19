from fastapi import FastAPI, Request

from dotenv import load_dotenv
from firebase_admin import firestore
import firebase_admin
from firebase_admin import credentials
import json
from test_convo_v9 import *

from global_method import *
from run_gpt import *

from spatial_memory.spatial import *
from spatial_memory.maze import *

from persona import *
from persona_chat_each_other_v2 import *

from firebase_config import db


load_dotenv()

app = FastAPI()



@app.post("/")
def read_root():
    return {"message": "Hello, World!"}

@app.post("/start")
async def start(request: Request):
    print("게임 시작")
    data = await request.json()
    uid = data['uid']
    daily_activity = []

    # 현재 날짜 구하기 (시간은 제외)
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    personas = [
        Persona("Joy", data),
        Persona("Anger", data),
        Persona("Sadness", data),
        Persona("Clone", data),
        Persona("Custom", data)
    ]

    relationships = f"memory_storage/{uid}/relationships.json"

    if not os.path.exists(relationships):
        make_persona_association(personas, data)

    

    for persona in personas:
        activities = []
        
        persona.plan(persona.name, True, data)
        daily_plan_hourly(persona, data)
        
        json_file = json.load(open(f"memory_storage/{uid}/{persona.name}/scratch.json"))
        daily_schedule_hourly = json_file["daily_req_hourly"]
        
        for activity, duration in daily_schedule_hourly:
            activities.append({
                "activity": activity,
                "duration": duration
            })
        
        spatial_memory = SpatialMemory(map_matrix, zone_labels)
        filepath = f"memory_storage/{uid}/{persona.name}/spatial.json"
        spatial_memory.export_spatial_memory(filepath)
        
        spatial_data = json.load(open(filepath))
        route_plan = plan_daily_route(activities, spatial_data, persona)
        complete_schedule = create_full_schedule(route_plan, spatial_data, persona)
        
        daily_activity.append({
            "name": persona.name,
            "wake_up_time": persona.scratch.wake_up_time,
            "daily_schedule": complete_schedule
        })

    try:
        # daily_activity를 JSON 문자열로 변환
        daily_activity_str = json.dumps(daily_activity)
        
        schedule_data = {
            'timestamp': datetime.now(),
            'date': today,
            'schedule': daily_activity_str,  # JSON 문자열로 저장
            'uid' : uid
        }

        doc_id = f"{uid}_{today.strftime('%Y%m%d')}"
        db.collection('village').document('schedule').collection('schedules').document(doc_id).set(schedule_data)
        print(f"Successfully saved schedule for user {uid} to Firestore")
        
    except Exception as e:
        print(f"Error saving to Firestore: {str(e)}")
        
    return {"schedule": daily_activity}


@app.post("/end")
async def end(request: Request):
    print("게임 종료")

    param = await request.json()

    data = json.loads(param['param'])



    return {"message" : "게임 종료"}







@app.post("/chat/persona")
async def chat_persona(request : Request):
    print("페르소나간 대화")
    
    print(1)
    param = await request.json()
    print(2)
    data = json.loads(param['param']) if isinstance(param['param'], str) else param['param']
    print("받은 데이터:", data)  # 디버깅을 위한 출력
    print(3)
    characters = data['characters']
    print(4)
    personas = []
    print(5)
    
    # SpatialMemory 인스턴스 생성
    spatial_memory = SpatialMemory(map_matrix, zone_labels)
    print(6)
    for character in characters:
        persona = Persona(character['name'], data)
        
        # position 좌표를 이용해 현재 위치의 zone 정보 가져오기
        x = character['position']['x']
        y = character['position']['y']
        current_zone = spatial_memory.get_zone_at_position(x, y)
        
        # persona에 위치 정보 저장 및 scratch.json 업데이트
        persona.current_location = {
            'coordinates': character['position'],
            'zone': current_zone
        }
        persona.update_current_zone(current_zone)
        
        personas.append(persona)


    print(7)
    print(len(personas), '페르소나 숫자')

    sim_agents = []

    sim_agents.append(ConversationAgent(personas[0], personas[1], data['uid']))
    sim_agents.append(ConversationAgent(personas[1], personas[0], data['uid']))

    print(8)
    print(len(sim_agents), '시뮬레이션 에이전트 숫자')



    simulation = ConversationSimulation(uid = data['uid'], db = db)
 
    print(9)
    for sim_agent in sim_agents:
        simulation.add_agent(sim_agent)

    print(10)
    simulation.simulate_conversation()

    print(11)

    


    return {"message" : "페르소나 채팅 값"}




@app.post("/chat/user")
async def chat_user(request : Request):
    print("유저와의 채팅")
    param = await request.json()

    # data = param['param']

    data = json.loads(param['param'])

    uid = data['uid']
    persona_name = data['persona']
    persona = Persona(persona_name , data)

    response = run_conversation(uid , persona , message = data['message'])

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

    prompt = f"""
    당신은 {persona.name}입니다. 다음 특성을 가지고 있습니다:

    성격: {persona.scratch.get_str_personality()}
    말투: {persona.scratch.get_str_speech()}
    캐릭터 특징: {persona.scratch.get_str_character()}

    질문 : {data['message']}

    질문에 대한 당신의 응답은 다음과 같습니다: {response}

    위 응답을 당신의 성격과 말투를 살려서 다시 작성해주세요.

    규칙:
    1. {persona.name}의 특징적인 말투와 어투를 반드시 사용하세요
    2. {persona.name}의 감정과 성격이 드러나도록 표현하세요
    3. 기본 내용은 유지하되, 캐릭터의 관점에서 재해석하세요

    응답 형식:
    {persona.name}의 관점에서 작성된 답변을 제시해주세요.
    한국어로 대답하세요.
    """

    result = llm.invoke(prompt)


    return {"message" : result.content}





# uvicorn main:app --host 0.0.0.0 --port 1919 --reload
if __name__ == "__main__":
    import uvicorn
    print("FastAPI 서버 실행")
    uvicorn.run(app, host="0.0.0.0", port=1919)

    
