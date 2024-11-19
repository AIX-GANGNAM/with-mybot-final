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

# 페르소나와의 대화
from test_convo_v8 import *

load_dotenv()

user = json.load(open('test.json')) 

# 페르소나 생성
joy_persona = Persona("Joy" , user)
anger_persona = Persona("Anger" , user)
sadness_persona = Persona("Sadness" , user)


personas = [joy_persona, anger_persona, sadness_persona]

run_conversation(user['uid'], joy_persona)