import json
from memory_structure.scratch import *
from global_method import *
from run_gpt import *
from plan import *
from spatial_memory.spatial import *
from spatial_memory.maze import *

# persona 객체 생성

class Persona:
    def __init__(self , name , user) -> None:

        scratch_saved = f"memory_storage/{user['uid']}/{name}/scratch.json"
        
        if (check_file_exists(scratch_saved)):
            scratch_saved = json.load(open(scratch_saved))
        else :
            first_day_persona(name, user)
            scratch_saved = json.load(open(scratch_saved))

        self.name = name
        self.scratch = Scratch(scratch_saved)
        self.spatial_memory = SpatialMemory(map_matrix, zone_labels)
        self.daily_plan_count = 0 
        self.uid = user['uid']

        self.relationships = self._load_my_relationships(user['uid'])

        

    def plan(self, name, new_day , user):
        return plan(self ,new_day , user)
    
    def get_map_data(self):
        return self.spatial_memory.map_matrix
    
    def get_zone_labels(self):
        return self.spatial_memory.zone_labels
    
    def _load_my_relationships(self, uid):
        """해당 페르소나의 관계 정보만 로드합니다."""
        relationship_path = f"memory_storage/{uid}/relationships.json"
        
        if check_file_exists(relationship_path):
            try:
                with open(relationship_path, 'r', encoding='utf-8') as f:
                    all_relationships = json.load(f)
                    # 현재 페르소나의 관계 정보만 반환
                    my_relationships = all_relationships.get(self.name, {})
                    print(f"{self.name}의 관계 정보가 로드되었습니다.")
                    return my_relationships
            except Exception as e:
                print(f"관계 정보 로드 중 오류 발생: {e}")
                return {}
        return {}

    def get_my_view_of(self, other_persona_name):
        """내가 바라보는 특정 페르소나와의 관계를 반환합니다."""
        return self.relationships.get(other_persona_name, {})

    def get_relationship_type_with(self, other_persona_name):
        """내가 생각하는 특정 페르소나와의 관계 유형을 반환합니다."""
        relationship = self.get_my_view_of(other_persona_name)
        return relationship.get('relationship_type', '알 수 없음')

    def get_my_closeness_to(self, other_persona_name):
        """내가 느끼는 특정 페르소나와의 친밀도를 반환합니다."""
        relationship = self.get_my_view_of(other_persona_name)
        return int(relationship.get('closeness', 0))

    def get_interaction_style_with(self, other_persona_name):
        """내가 선호하는 특정 페르소나와의 상호작용 방식을 반환합니다."""
        relationship = self.get_my_view_of(other_persona_name)
        return relationship.get('interaction_style', '기본적인 상호작용')

    def get_activities_i_prefer_with(self, other_persona_name):
        """내가 선호하는 특정 페르소나와의 활동들을 반환합니다."""
        relationship = self.get_my_view_of(other_persona_name)
        return relationship.get('common_activities', [])

    def get_conflicts_i_feel_with(self, other_persona_name):
        """내가 인식하는 특정 페르소나와의 잠재적 갈등을 반환합니다."""
        relationship = self.get_my_view_of(other_persona_name)
        return relationship.get('potential_conflicts', [])

    def get_relationship_dynamics_with(self, other_persona_name):
        """내가 인식하는 특정 페르소나와의 관계 역학을 반환합니다."""
        relationship = self.get_my_view_of(other_persona_name)
        return relationship.get('dynamics', '특별한 관계 역학 없음')
    
    def get_relationship_info(self, other_persona_name):
        """대략적인 관계 정보를 제공합니다"""

        relationship = ""
        relationship += f"my name is {self.name}\n"
        relationship += f"my relationship with {other_persona_name} is {self.get_relationship_type_with(other_persona_name)}\n"
        relationship += f"my closeness to {other_persona_name} is {self.get_my_closeness_to(other_persona_name)}\n"
        relationship += f"my interaction style with {other_persona_name} is {self.get_interaction_style_with(other_persona_name)}\n"
        relationship += f"my activities i prefer with {other_persona_name} are {self.get_activities_i_prefer_with(other_persona_name)}\n"
        relationship += f"my conflicts i feel with {other_persona_name} are {self.get_conflicts_i_feel_with(other_persona_name)}\n"
        relationship += f"my relationship dynamics with {other_persona_name} are {self.get_relationship_dynamics_with(other_persona_name)}\n"

        return relationship


    def get_daily_req(self):
        return self.scratch.get_daily_req()

    def update_current_zone(self, zone: str):
        self.scratch.currentZone = zone  # scratch 객체에 currentZone 필드 추가
        
        # scratch.json 파일 업데이트
        json_file_path = f"memory_storage/{self.uid}/{self.name}/scratch.json"
        with open(json_file_path, 'r+') as file:
            scratch_data = json.load(file)
            scratch_data['currentZone'] = zone
            file.seek(0)
            json.dump(scratch_data, file, indent=4)
            file.truncate()

    def get_current_zone(self):
        return self.scratch.currentZone


        






    