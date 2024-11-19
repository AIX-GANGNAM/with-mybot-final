import json

class Scratch:
    def __init__(self , scratched_saved):

        self.s_mem_data = scratched_saved

        self.curr_time = None;
        self.curr_tile = None;
        self.daily_req = [];
        self.f_daily_req = [];
         
    
        self.lifestyle = None;
        self.name = None;
        self.wake_up_time = None;
    
        # daily_req_hourly 데이터가 있으면 f_daily_schedule_hourly_org에 할당
        if 'daily_req_hourly' in scratched_saved:
            self.f_daily_schedule_hourly_org = scratched_saved['daily_req_hourly']
        else:
            self.f_daily_schedule_hourly_org = []
    
    
    
    
    def get_str_iss(self):
        common_state = '';
        common_state += f"Name : {self.s_mem_data['name']} \n"
        common_state += f"Age : {self.s_mem_data['age']} \n"
        common_state += f"Personality : {self.s_mem_data['personality']} \n"
        common_state += f"Speech : {self.s_mem_data['speech']} \n"
        common_state += f"Life Style : {self.s_mem_data['lifestyle']['weekday']} and {self.s_mem_data['lifestyle']['weekend']} \n"
        common_state += f"Gender : {self.s_mem_data['gender']} \n"
        common_state += f"Character : {self.s_mem_data['character']} \n"

        return common_state
    
    def get_str_lifestyle(self):
        return self.s_mem_data['lifestyle']
    
    def get_str_personality(self):
        return self.s_mem_data['personality']
    
    def get_str_speech(self):
        return self.s_mem_data['speech']
    
    def get_str_character(self):
        return self.s_mem_data['character'] 
    
    def get_str_name(self):
        return self.s_mem_data['name'] 
    
    def get_daily_req(self):
        return self.f_daily_schedule_hourly_org

    def get_wake_up_time(self):
        return self.wake_up_time
