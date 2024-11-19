from persona import Persona
from run_gpt import *
import json
from spatial_memory.spatial import *
from spatial_memory.maze import *
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

from agent_dialogue import *


# 대화 시뮬레이션
from persona_chat_each_other_v1 import *

load_dotenv()

user = json.load(open('test.json')) 

# 페르소나 생성
joy_persona = Persona("Joy" , user)
anger_persona = Persona("Anger" , user)
sadness_persona = Persona("Sadness" , user)


personas = [joy_persona, anger_persona, sadness_persona]

# make_persona_association(personas, user)


# 대화 시뮬레이션
# 사용 예시
def main():
    # OpenAI API 키 설정 필요
    # import os
    # os.environ["OPENAI_API_KEY"] = "your-api-key"
    
    # 에이전트 생성
    customer = ConversationAgent(
        name="고객",
        role="식당 손님",
        personality="음식에 대해 까다로운 성격이지만, 예의 바르게 의견을 표현합니다."
    )
    
    server = ConversationAgent(
        name="직원",
        role="레스토랑 직원",
        personality="""친절하고 전문적이며, 고객 만족을 최우선으로 생각합니다.
        메뉴에 대해 상세히 설명할 수 있으며, 고객의 모든 질문에 친절하게 답변합니다.
        고객이 식사를 마치고 계산하기 전까지는 계속해서 서비스를 제공합니다."""
    )
    
    # 시뮬레이션 설정
    simulation = ConversationSimulation()
    simulation.add_agent(customer)
    simulation.add_agent(server)
    
    # 대화 시작
    initial_message = "안녕하세요, 오늘 스테이크 메뉴 추천해주실 수 있나요?"
    simulation.simulate_conversation(
        initial_speaker="고객",
        initial_message=initial_message
    )

if __name__ == "__main__":
    main()













# 페르소나 스케쥴 생성
# joy_persona.plan("Joy",True, user)



# print(joy_persona.scratch.daily_req)

# daily_plan_hourly(joy_persona , user)





# spatial_memory = SpatialMemory(map_matrix, zone_labels)

# path_result = spatial_memory.get_path(2, 11)

# if path_result:
#         path, cost = path_result
#         print(f"\nFound path from {spatial_memory.zone_labels[2]} to {spatial_memory.zone_labels[11]}")
#         print(f"Path cost: {cost}")
        
#         # 경로 설명 출력
#         print("\nRoute description:")
#         for step in spatial_memory.get_route_description(path):
#             print(f"- {step}")
        
#         # 경로 시각화
#         spatial_memory.visualize_path(path, {2, 11, 8})



# # 구조파악
# data = json.load(open('memory_storage\DwgZh7Ud7STbVBnkyvK5kmxUIzw1\Joy\spatial.json'))

# user = json.load(open('test.json'))

# joy = Persona("Joy" , user)

# # prompt = f"{data} 이 데이터는 무엇을 의미하는가?"

# prompt = f"""
# {joy.scratch.get_str_iss()}

# 당신은 {joy.name} 입니다.
# 당신은 지금 {data} 이러한 공간에 살고 있습니다.

# 아침에 일어나서 무엇을 할 것 인지 대략적인 스케쥴을 만들고

# 각각의 스케쥴에 따른 위치를 명확하게 확정 지어서 그 위치를 작성해주세요.
# """

# llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# response = llm.invoke(prompt)

# print(response.content)





