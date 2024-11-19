def create_location_prompt(persona, activity, duration, current_position, spatial_data):

    

#     activity_zone_mapping = {
#     "명상": ["Joy_home", "Park"],
#     "식사": ["Cafe"],
#     "자원봉사 활동": ["Discussion Room", "Library"],
#     "사회적 활동": ["Discussion Room", "Park", "shopping_center"],
#     "독서": ["Library", "Joy_home"],
#     "창작 활동": ["Joy_home", "Discussion Room"],
#     "휴식": ["Joy_home", "Park", "Cafe"]
# }
    prompt = f"""
        {persona.scratch.get_str_iss()}

        {persona.name} 의 하루 일정 중 다음 활동에 대한 최적의 위치를 추천해주세요.

        활동 : {activity}
        소요시간 : {duration} 분
        현재 위치 : {current_position}

        당신이 살고 있는 공간의 정보 : {spatial_data}

        고려사항:
        1. 활동의 성격에 맞는 공간을 선택해주세요
            - 명상/휴식 → 조용한 공간
            - 사회적 활동 → 공용 공간
        2. 현재 위치에서의 접근성을 고려해주세요
        3. 해당 공간의 수용 인원을 확인해주세요

        다음 형식으로 응답해주세요.
        {{
            "zone" : "추천 장소명",
            "position": [x,y],
            "duration": "체류 시간(분)",
            "reason" : "선택 이유"
        }}
    """

    return prompt

