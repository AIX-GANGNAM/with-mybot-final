import numpy as np
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
import json
from collections import defaultdict
import heapq
from .maze import *
# from maze import map_matrix, zone_labels

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from global_method import *

@dataclass
class Position:
    x: int
    y: int
    
    def __hash__(self):
        return hash((self.x, self.y))
    
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
        
    def __lt__(self, other):
        # x 좌표를 우선 비교하고, 같으면 y 좌표 비교
        if self.x != other.x:
            return self.x < other.x
        return self.y < other.y
@dataclass
class Zone:
    """구역 정보를 저장하는 데이터 클래스"""
    id: int
    name: str
    positions: List[Position]
    entrances: List[Position]
    connected_zones: List[int]
    attributes: Dict[str, any]

class PathFinder:
    def __init__(self, maze_matrix: np.ndarray):
        self.maze = maze_matrix
        self.rows, self.cols = maze_matrix.shape
        
    def get_neighbors(self, pos: Position) -> List[Tuple[Position, int]]:
        """주어진 위치에서 이동 가능한 이웃 위치들을 반환"""
        neighbors = []
        moves = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # 상하좌우
        
        for dx, dy in moves:
            new_x, new_y = pos.x + dx, pos.y + dy
            
            # 맵 범위 체크
            if not (0 <= new_x < self.rows and 0 <= new_y < self.cols):
                continue
                
            # 벽이 아닌 경우
            if self.maze[new_x, new_y] != 1:
                # 이동 비용 계산
                cost = self.calculate_movement_cost(
                    self.maze[pos.x, pos.y],
                    self.maze[new_x, new_y]
                )
                if cost is not None:
                    neighbors.append((Position(new_x, new_y), cost))
        
        return neighbors
    
    def calculate_movement_cost(self, current_value: int, next_value: int) -> Optional[int]:
        """두 위치 사이의 이동 비용 계산"""
        # 벽으로는 이동 불가
        if next_value == 1:
            return None
            
        # 기본 이동 비용
        base_cost = 1
        
        # 출입구를 통한 이동
        if current_value == 8 or next_value == 8:
            return base_cost
            
        # 같은 구역 내 이동
        if current_value == next_value:
            return base_cost
            
        # 경로(0)와 출입구(8) 사이 이동
        if (current_value == 0 and next_value == 8) or (current_value == 8 and next_value == 0):
            return base_cost
            
        # 경로 간 이동
        if current_value == 0 and next_value == 0:
            return base_cost
            
        # 그 외의 경우는 이동 불가
        return None

    def find_shortest_path(self, start: Position, end: Position) -> Optional[Tuple[List[Position], int]]:
        """다익스트라 알고리즘을 사용한 최단 경로 탐색"""
        # 우선순위 큐 초기화
        queue = [(0, start, [start])]
        visited = set()
        
        while queue:
            cost, current, path = heapq.heappop(queue)
            
            if current == end:
                return path, cost
                
            if current in visited:
                continue
                
            visited.add(current)
            
            # 이웃 노드 탐색
            for next_pos, move_cost in self.get_neighbors(current):
                if next_pos not in visited:
                    new_cost = cost + move_cost
                    new_path = path + [next_pos]
                    heapq.heappush(queue, (new_cost, next_pos, new_path))
        
        return None

class SpatialMemory:
    def __init__(self, map_matrix: List[List[int]], zone_labels: Dict[int, str]):
        self.map_matrix = np.array(map_matrix)
        self.zone_labels = zone_labels
        self.zones: Dict[int, Zone] = {}
        self.pathfinder = PathFinder(self.map_matrix)
        self.initialize_spatial_memory()
    
    def get_zone_center(self, zone_id: int) -> Optional[Position]:
        """구역의 중심점 찾기"""
        if zone_id not in self.zones:
            return None
            
        positions = self.zones[zone_id].positions
        if not positions:
            return None
            
        # 모든 위치의 평균 계산
        avg_x = sum(p.x for p in positions) // len(positions)
        avg_y = sum(p.y for p in positions) // len(positions)
        
        # 가장 가까운 실제 구역 위치 찾기
        closest_pos = min(positions, 
                         key=lambda p: abs(p.x - avg_x) + abs(p.y - avg_y))
        return closest_pos
    

    def initialize_spatial_memory(self):
        """맵의 공간 정보를 분석하고 초기화"""
        # 각 구역별 정보 수집
        for zone_id, zone_name in self.zone_labels.items():
            if zone_id in [0, 1]:  # 경로와 벽은 제외
                continue
            
            positions = self.find_zone_positions(zone_id)
            entrances = self.find_zone_entrances(positions)
            connected_zones = self.find_connected_zones(positions)
            
            # 구역별 특성 정의
            attributes = self.define_zone_attributes(zone_id, zone_name)
            
            self.zones[zone_id] = Zone(
                id=zone_id,
                name=zone_name,
                positions=positions,
                entrances=entrances,
                connected_zones=connected_zones,
                attributes=attributes
            )

    def find_zone_positions(self, zone_id: int) -> List[Position]:
        """특정 구역의 모든 위치 찾기"""
        positions = []
        for i in range(self.map_matrix.shape[0]):
            for j in range(self.map_matrix.shape[1]):
                if self.map_matrix[i, j] == zone_id:
                    positions.append(Position(i, j))
        return positions

    def find_zone_entrances(self, positions: List[Position]) -> List[Position]:
        """구역의 출입구 위치 찾기"""
        entrances = []
        for pos in positions:
            # 인접한 셀 확인
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                new_x, new_y = pos.x + dx, pos.y + dy
                if (0 <= new_x < self.map_matrix.shape[0] and 
                    0 <= new_y < self.map_matrix.shape[1] and 
                    self.map_matrix[new_x, new_y] == 8):  # 8은 출입구
                    entrances.append(Position(new_x, new_y))
        return list(set([(e.x, e.y) for e in entrances]))  # 중복 제거

    def find_connected_zones(self, positions: List[Position]) -> List[int]:
        """연결된 구역 찾기"""
        connected = set()
        for pos in positions:
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                new_x, new_y = pos.x + dx, pos.y + dy
                if (0 <= new_x < self.map_matrix.shape[0] and 
                    0 <= new_y < self.map_matrix.shape[1]):
                    value = self.map_matrix[new_x, new_y]
                    if value not in [0, 1] and value != self.map_matrix[pos.x, pos.y]:
                        connected.add(value)
        return list(connected)

    def define_zone_attributes(self, zone_id: int, zone_name: str) -> Dict[str, any]:
        """구역별 특성 정의"""
        attributes = {
            "type": "room" if "home" in zone_name.lower() else "facility",
            "accessibility": "private" if "home" in zone_name.lower() else "public",
            "function": self.get_zone_function(zone_name),
            "capacity": self.estimate_zone_capacity(zone_id),
        }
        return attributes

    def estimate_zone_capacity(self, zone_id: int) -> int:
        """구역의 수용 능력 추정"""
        zone_size = np.sum(self.map_matrix == zone_id)
        # 간단한 수용력 계산 (구역 크기에 비례)
        return max(1, zone_size // 2)
    

    def get_zone_function(self, zone_name: str) -> str:
        """구역의 기능 정의"""
        if "home" in zone_name.lower():
            emotion = zone_name.split('_')[0].lower()
            return f"residence_{emotion}"
        functions = {
            "Discussion Room": "meeting",
            "Cafe": "refreshment",
            "Park": "recreation",
            "Library": "education"
        }
        return functions.get(zone_name, "unknown")
    
    def get_path_between_zones(self, start_zone: int, end_zone: int) -> Optional[Tuple[List[Position], int]]:
        """두 구역 사이의 최단 경로 찾기"""
        if start_zone not in self.zones or end_zone not in self.zones:
            return None
        
        # 시작점과 도착점 찾기
        start_center = self.get_zone_center(start_zone)
        end_center = self.get_zone_center(end_zone)
        
        if not start_center or not end_center:
            return None
        
        # 경로 찾기
        path_result = self.pathfinder.find_shortest_path(start_center, end_center)
        
        if path_result:
            path, cost = path_result
            return self.optimize_path(path), cost
        return None
    
    def optimize_path(self, path: List[Position]) -> List[Position]:
        """경로 최적화"""
        if len(path) <= 2:
            return path
            
        optimized = [path[0]]
        current_direction = None
        
        for i in range(1, len(path)):
            new_direction = (
                path[i].x - path[i-1].x,
                path[i].y - path[i-1].y
            )
            
            # 방향이 변경된 경우에만 포인트 추가
            if new_direction != current_direction:
                optimized.append(path[i-1])
                current_direction = new_direction
        
        optimized.append(path[-1])
        return optimized
    
    def visualize_path(self, path: List[Position], highlight_zones: Set[int] = None):
        """경로 시각화"""
        import matplotlib.pyplot as plt
        
        fig, ax = plt.subplots(figsize=(12, 12))
        
        # 기본 맵 표시
        cmap = plt.cm.get_cmap('tab20')
        ax.imshow(self.map_matrix, cmap=cmap, alpha=0.7)
        
        # 경로 표시
        path_x = [p.y for p in path]
        path_y = [p.x for p in path]
        ax.plot(path_x, path_y, 'r-', linewidth=2, label='Path')
        
        # 시작점과 끝점 강조
        ax.plot(path_x[0], path_y[0], 'go', markersize=15, label='Start')
        ax.plot(path_x[-1], path_y[-1], 'ro', markersize=15, label='End')
        
        # 관련 구역 강조 표시
        if highlight_zones:
            mask = np.zeros_like(self.map_matrix, dtype=bool)
            for zone_id in highlight_zones:
                mask |= (self.map_matrix == zone_id)
            ax.imshow(mask, alpha=0.3, cmap='cool')
        
        ax.grid(True)
        ax.legend()
        plt.show()

    def get_route_description(self, path: List[Position]) -> List[str]:
        """경로 설명 생성"""
        if not path:
            return []
            
        directions = []
        current_zone = self.map_matrix[path[0].x, path[0].y]
        
        for i in range(1, len(path)):
            next_zone = self.map_matrix[path[i].x, path[i].y]
            
            if next_zone != current_zone:
                if next_zone == 8:
                    directions.append(f"Exit {self.zone_labels[current_zone]} through entrance")
                elif current_zone == 8:
                    directions.append(f"Enter {self.zone_labels[next_zone]}")
                else:
                    directions.append(f"Move from {self.zone_labels[current_zone]} to {self.zone_labels[next_zone]}")
                current_zone = next_zone
        
        return directions
    
    def get_zone_info(self, zone_id: int) -> Dict:
        """특정 구역의 정보 반환"""
        if zone_id not in self.zones:
            return None
        
        zone = self.zones[zone_id]
        return {
            "id": zone.id,
            "name": zone.name,
            "size": len(zone.positions),
            "entrances": len(zone.entrances),
            "connected_to": [self.zone_labels[z] for z in zone.connected_zones],
            "attributes": zone.attributes
        }

    def export_spatial_memory(self, filename: str):
        """공간 메모리 정보를 JSON 파일로 내보내기"""
        export_data = {
            "zones": {},
            "paths": {
                "positions": [],
                "attributes": {
                    "type": "corridor",
                    "accessibility": "public",
                    "function": "movement"
                }
            },
            "walls": {
                "positions": [],
                "attributes": {
                    "type": "obstacle",
                    "accessibility": "blocked",
                    "function": "boundary"
                }
            }
        }

        # 일반 구역 정보 저장
        for zone_id, zone in self.zones.items():
            export_data["zones"][zone.name] = {
                "id": int(zone.id),
                "positions": [(int(p.x), int(p.y)) for p in zone.positions],
                "entrances": [(int(e[0]), int(e[1])) for e in zone.entrances],
                "connected_zones": [self.zone_labels[int(z)] for z in zone.connected_zones],
                "attributes": {
                    k: int(v) if isinstance(v, np.integer) else v
                    for k, v in zone.attributes.items()
                }
            }

        # 길(0)과 벽(1)의 위치 정보 저장
        for i in range(self.map_matrix.shape[0]):
            for j in range(self.map_matrix.shape[1]):
                if self.map_matrix[i, j] == 0:  # 길
                    export_data["paths"]["positions"].append([int(i), int(j)])
                elif self.map_matrix[i, j] == 1:  # 벽
                    export_data["walls"]["positions"].append([int(i), int(j)])

        # 연결성 정보 추가
        export_data["paths"]["connections"] = self._analyze_path_connections()
        
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2)
            print(f"Successfully exported spatial memory to {filename}")
        except Exception as e:
            print(f"Error exporting spatial memory: {str(e)}")

    def _analyze_path_connections(self) -> Dict:
        """길의 연결성 분석"""
        connections = {
            "zone_connections": [],
            "intersection_points": []
        }
        
        # 길과 구역들 사이의 연결점 찾기
        for i in range(self.map_matrix.shape[0]):
            for j in range(self.map_matrix.shape[1]):
                if self.map_matrix[i, j] == 0:  # 길인 경우
                    adjacent_zones = set()
                    is_intersection = False
                    path_count = 0
                    
                    # 인접 셀 확인
                    for di, dj in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                        ni, nj = i + di, j + dj
                        if (0 <= ni < self.map_matrix.shape[0] and 
                            0 <= nj < self.map_matrix.shape[1]):
                            cell_value = self.map_matrix[ni, nj]
                            if cell_value > 1:  # 구역
                                adjacent_zones.add(int(cell_value))
                            elif cell_value == 0:  # 길
                                path_count += 1
                    
                    # 3개 이상의 길이 만나는 지점을 교차점으로 간주
                    if path_count >= 3:
                        is_intersection = True
                        connections["intersection_points"].append([int(i), int(j)])
                    
                    # 두 개 이상의 구역과 연결된 경우 연결정보 저장
                    if len(adjacent_zones) >= 2:
                        zones = sorted(list(adjacent_zones))
                        for z1 in zones:
                            for z2 in zones:
                                if z1 < z2:
                                    connections["zone_connections"].append({
                                        "zones": [
                                            self.zone_labels[z1],
                                            self.zone_labels[z2]
                                        ],
                                        "connection_point": [int(i), int(j)]
                                    })
        
        return connections

    def get_path_from_position(self, current_position: Position, target_zone: int) -> Optional[Tuple[List[Position], int]]:
        """현재 위치에서 목표 구역까지의 최단 경로 찾기"""
        if target_zone not in self.zones:
            return None
        
        # 목표 구역의 중심점 찾기
        target_center = self.get_zone_center(target_zone)
        
        if not target_center:
            return None
        
        # 현재 위치가 유효한지 확인
        if not (0 <= current_position.x < self.map_matrix.shape[0] and 
                0 <= current_position.y < self.map_matrix.shape[1]):
            return None
        
        # 현재 위치가 벽인 경우
        if self.map_matrix[current_position.x, current_position.y] == 1:
            return None
        
        # 경로 찾기
        path_result = self.pathfinder.find_shortest_path(current_position, target_center)
        
        if path_result:
            path, cost = path_result
            return self.optimize_path(path), cost
        return None

    def get_path_description_from_position(self, path: List[Position]) -> List[str]:
        """현재 위치 기준 경로 설명 생성"""
        if not path:
            return []
        
        directions = []
        current_zone = self.map_matrix[path[0].x, path[0].y]
        
        # 시작 위치 설명 추가
        if current_zone in self.zone_labels:
            directions.append(f"Starting from {self.zone_labels[current_zone]}")
        else:
            directions.append("Starting from corridor")
        
        # 나머지 경로 설명
        for i in range(1, len(path)):
            next_zone = self.map_matrix[path[i].x, path[i].y]
            
            if next_zone != current_zone:
                if next_zone == 8:
                    if current_zone in self.zone_labels:
                        directions.append(f"Exit {self.zone_labels[current_zone]} through entrance")
                    else:
                        directions.append("Reach entrance")
                elif current_zone == 8:
                    if next_zone in self.zone_labels:
                        directions.append(f"Enter {self.zone_labels[next_zone]}")
                    else:
                        directions.append("Enter corridor")
                elif next_zone in self.zone_labels and current_zone in self.zone_labels:
                    directions.append(f"Move from {self.zone_labels[current_zone]} to {self.zone_labels[next_zone]}")
                current_zone = next_zone
        
        return directions

    def get_zone_at_position(self, x: int, y: int) -> str:
        """주어진 x, y 좌표에 해당하는 zone을 반환합니다."""
        if 0 <= x < len(self.map_matrix[0]) and 0 <= y < len(self.map_matrix):
            zone_index = self.map_matrix[y][x]
            return self.zone_labels[zone_index]
        return "unknown"  # 좌표가 맵 범위를 벗어난 경우

# # 사용 예시
# def main():
#     spatial_memory = SpatialMemory(map_matrix, zone_labels)

#     filepath = '../memory_storage/DwgZh7Ud7STbVBnkyvK5kmxUIzw1/Joy/spatial.json'

#     spatial_memory.export_spatial_memory(filepath)

#     # # Joy_home에서 Library까지의 경로 찾기
#     # start_zone = 2  # Joy_home
#     # end_zone = 11   # Library
    
#     # path_result = spatial_memory.get_path_between_zones(start_zone, end_zone)
    
#     # if path_result:
#     #     path, cost = path_result
#     #     print(f"\nFound path from {spatial_memory.zone_labels[start_zone]} to {spatial_memory.zone_labels[end_zone]}")
#     #     print(f"Path cost: {cost}")
        
#     #     # 경로 설명 출력
#     #     print("\nRoute description:")
#     #     for step in spatial_memory.get_route_description(path):
#     #         print(f"- {step}")
        
#     #     # 경로 시각화
#     #     spatial_memory.visualize_path(path, {start_zone, end_zone, 8})
#     # else:
#     #     print("No path found!")


#     # 현재 위치 (예: 복도의 한 지점)
#     # current_pos = Position(5, 5)
#     start_zone = 2  # Joy_home
#     target_zone = 11  # Library
    
#     # path_result = spatial_memory.get_path_from_position(current_pos, target_zone)

#     path_result = spatial_memory.get_path_between_zones(start_zone, target_zone)
    
#     if path_result:
#         path, cost = path_result
#         print(f"\nFound path to {spatial_memory.zone_labels[target_zone]}")
#         print(f"Path cost: {cost}")
        
#         # 경로 설명 출력
#         print("\nRoute description:")
#         for step in spatial_memory.get_path_description_from_position(path):
#             print(f"- {step}")
        
#         # 경로 시각화
#         spatial_memory.visualize_path(path, {target_zone, 8})
#     else:
#         print("No path found!")

# if __name__ == "__main__":
#     main()