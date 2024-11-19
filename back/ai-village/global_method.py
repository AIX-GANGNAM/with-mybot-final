import os
import json

# persona 데이터 로드
def load_persona_data( filepath):
    file_path = filepath
    
    if os.path.exists(file_path):
        # 이미 존재
        with open(file_path, 'r') as file:
            data = json.load(file)
            return data
    else:
        # 디렉토리가 없을 경우 생성
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        # 존재하지 않을 경우
        default_data = {}
        with open(file_path, 'w') as file:
            json.dump(default_data, file)
            data = default_data
            return data

# 페르소나 scratch data 처음으로 만들기
def make_scratch_memory(name: str, user , output_prompt: str):
    # 불필요한 JSON 관련 문자열 제거
    content_string = output_prompt.replace('json', '').replace('\n', '').replace("'''", '"""')

    # 백틱 제거
    content_string = content_string.strip("```")
    print("After replacements:", content_string)

    try:
        # JSON 문자열을 파싱
        data = json.loads(content_string)
    except json.JSONDecodeError as e:
        print("JSONDecodeError:", e)
        return  # JSON 변환에 실패하면 종료

    # 파일 저장 경로 생성
    s_m_filepath = f"memory_storage/{user['uid']}/{name}/scratch.json"
    os.makedirs(os.path.dirname(s_m_filepath), exist_ok=True)

    # JSON 데이터를 파일에 저장
    with open(s_m_filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

# 파일 존재 여부 확인
def check_file_exists(filepath):
    if os.path.exists(filepath):
        print(f"{filepath} 파일이 존재합니다")
        return True
    else :
        print(f"{filepath} 파일이 존재하지 않습니다.")
        return False
    

# scratch data 업데이트
def update_daily_req(uid, name, new_data):
    # 파일 경로 생성
    filepath = f"memory_storage/{uid}/{name}/scratch.json"

    with open(filepath, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # daily_req가 없으면 새로 생성
    if 'daily_req' not in data:
        data['daily_req'] = {}
    
    # 데이터 업데이트
    data['daily_req'] = {**data['daily_req'], **new_data}

    with open(filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)



# 시간당 스케쥴 업데이트
def update_daily_req_hourly(uid, name, new_data):
    filepath = f"memory_storage/{uid}/{name}/scratch.json"

    with open(filepath, 'r', encoding='utf-8') as file:
        data = json.load(file)

    data['daily_req_hourly'] = new_data

    with open(filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)
