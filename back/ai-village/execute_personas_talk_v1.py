from persona_chat_each_other_v2 import *
from persona import Persona
import json


user = json.load(open('test.json')) 

# 페르소나 생성
joy_persona = Persona("Joy" , user)
anger_persona = Persona("Anger" , user)
sadness_persona = Persona("Sadness" , user)


personas = [joy_persona, anger_persona, sadness_persona]

joy_agent = ConversationAgent(joy_persona, anger_persona)
anger_agent = ConversationAgent(anger_persona ,joy_persona)
# sadness_agent = ConversationAgent(sadness_persona)

simulation = ConversationSimulation()
simulation.add_agent(joy_agent)
simulation.add_agent(anger_agent)

# 시뮬레이션 시작
simulation.simulate_conversation()



