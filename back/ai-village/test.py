from persona import Persona
from run_gpt import *
import json
from spatial_memory.spatial import *
from spatial_memory.maze import *
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv


load_dotenv()

user = json.load(open('test.json')) 

# 페르소나 생성
joy_persona = Persona("Joy" , user)

# 페르소나 스케쥴 생성
joy_persona.plan("Joy",True, user)



print(joy_persona.scratch.daily_req)

daily_plan_hourly(joy_persona , user)

joy_data = json.load(open(f"memory_storage/{user['uid']}/Joy/scratch.json"))

daily_schedule_hourlry = joy_data["daily_req_hourly"]

daily_activity = []

for activity in daily_schedule_hourlry:
    daily_activity.append({"activity" : activity[0] , "duration" : activity[1]})

for d in daily_activity:
    print(d)

spatial_data = json.load(open(f"memory_storage/{user['uid']}/Joy/spatial.json"))

route_plan = plan_daily_route(daily_activity , spatial_data , joy_persona)

print(route_plan)


complete_schedule = create_full_schedule(route_plan , spatial_data , joy_persona)

print(complete_schedule)



