import numpy as np
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import random
from spacial_memory.maze import *
from spacial_memory.spacial import *

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class MazeAnimation:
    def __init__(self, maze_array, zone_labels, num_points=4):
        self.maze = np.array(maze_array)
        self.zone_labels = zone_labels
        self.num_points = num_points
        # 범례를 위한 여백을 포함한 더 큰 figure 생성
        self.fig, self.ax = plt.subplots(figsize=(15, 10))
        self.points = []
        self.point_positions = []
        self.target_positions = []
        self.point_states = []
        self.colors = ['yellow', 'blue', 'purple', 'red']
        self.anim = None
        self.movement_frames = 10
        self.current_frames = [0] * num_points
        self.spatial_memory = SpatialMemory(maze_array, zone_labels)
        self.current_paths = [None] * num_points  # 각 포인트의 현재 경로
        self.path_indices = [0] * num_points      # 각 경로에서의 현재 위치
        
        # 초기화
        self.setup_plot()
        self.initialize_points()

    def setup_plot(self):
        """맵 시각화 설정과 라벨링"""
        # 기본 맵 그리기
        cmap = plt.colormaps['tab20']
        self.ax.imshow(self.maze, cmap=cmap, alpha=0.7)
        self.ax.set_title("Inside Out Village", pad=20, size=16, fontweight='bold')
        
        # 격자 추가
        self.ax.grid(True, which='major', color='black', linewidth=1, alpha=0.3)
    
        # 각 구역별 색상 정의
        zone_colors = {
            2: '#FFD700',  # Joy_home - 골드
            3: '#4169E1',  # Sadness_home - 로열블루
            4: '#FF4500',  # Anger_home - 레드오렌지
            5: '#800080',  # Fear_home - 보라
            6: '#006400',  # Disgust_home - 다크그린
            7: '#CD853F',  # Discussion Room - 갈색
            8: '#FFFFFF',  # Entrance - 흰색
            9: '#FFA07A',  # Cafe - 연살몬
            10: '#98FB98', # Park - 연두
            11: '#DEB887'  # Library - 베이지
        }
    
        # 폰트 설정
        plt.rcParams['font.family'] = 'sans-serif'
        plt.rcParams['font.size'] = 8
        
        # 구역 라벨링
        for i in range(self.maze.shape[0]):
            for j in range(self.maze.shape[1]):
                value = self.maze[i, j]
            if value in self.zone_labels and value != 1:  # 벽은 제외
                # 구역의 첫 번째 위치 찾기
                if self.is_first_cell_of_zone(i, j, value):
                    label = self.zone_labels[value]
                    if value == 8:
                        # 출입구는 'E'로 표시
                        self.ax.text(j, i, 'E', 
                                   ha='center', va='center',
                                   color='black',
                                   fontweight='bold',
                                   bbox=dict(facecolor='white', 
                                           edgecolor='black',
                                           alpha=0.7,
                                           pad=0.5))
                    else:
                        # 나머지 구역은 전체 이름 표시
                        self.ax.text(j, i, label,
                                   ha='center', va='center',
                                   color='black',
                                   fontweight='bold',
                                   fontsize=8,
                                   bbox=dict(facecolor=zone_colors.get(value, 'white'),
                                           edgecolor='black',
                                           alpha=0.7,
                                           pad=0.5))
    
        # 범례 가
        legend_elements = []
        for value, label in self.zone_labels.items():
            if value not in [0, 1]:  # 경로와 벽은 제외
                color = zone_colors.get(value, 'white')
                legend_elements.append(plt.Rectangle((0,0), 1, 1, 
                                              facecolor=color,
                                              alpha=0.7,
                                              edgecolor='black',
                                              label=label))
    
        # 범례 위치 설정
        self.ax.legend(handles=legend_elements,
                      loc='center left',
                  bbox_to_anchor=(1.05, 0.5),
                  title='Zone Guide',
                  title_fontsize=10,
                  fontsize=8)
    
        # 축 설정
        self.ax.set_xticks([])
        self.ax.set_yticks([])
        
        # 여백 조정
        plt.tight_layout()

    def is_first_cell_of_zone(self, row, col, value):
        """해당 셀이 구역의 첫 번째 셀인지 확인"""
        # 위쪽과 왼쪽을 체크
        if row > 0 and self.maze[row-1, col] == value:
            return False
        if col > 0 and self.maze[row, col-1] == value:
            return False
        return True

    def find_valid_positions(self):
        valid_positions = []
        for i in range(self.maze.shape[0]):
            for j in range(self.maze.shape[1]):
                if self.maze[i, j] == 0:
                    valid_positions.append((i, j))
        return valid_positions

    def initialize_points(self):
        valid_positions = self.find_valid_positions()
        if not valid_positions:
            raise ValueError("No valid positions found in the maze")
        
        for i in range(self.num_points):
            pos = random.choice(valid_positions)
            self.point_positions.append(list(pos))
            self.target_positions.append(list(pos))  # 초기 타겟 위치는 현재 위치와 동일
            self.point_states.append('path')
            line, = self.ax.plot([], [], 'o', 
                               color=self.colors[i % len(self.colors)],
                               markersize=15,
                               markeredgecolor='white',
                               markeredgewidth=2,
                               zorder=5)
            self.points.append(line)
            self.points[i].set_data([pos[1]], [pos[0]])
            print(f"Point {i+1} initialized at position {pos}")

    def is_valid_position(self, pos):
        return (0 <= pos[0] < self.maze.shape[0] and 
                0 <= pos[1] < self.maze.shape[1])

    def get_zone_type(self, pos):
        if not self.is_valid_position(pos):
            return None
        value = self.maze[pos[0], pos[1]]
        if value == 0:
            return 'path'
        elif value == 8:
            return 'entrance'
        elif value in [2, 3, 4, 5, 6]:
            return 'home'
        elif value == 7:
            return 'discussion'
        elif value == 9:
            return 'cafe'
        elif value == 10:
            return 'park'
        elif value == 11:
            return 'library'
        return None

    # can_move_to_position 메소드만 수정하면 됩니다.
    def can_move_to_position(self, current_pos, new_pos, current_state):
        """
        이동 가능 여부를 확인하는 메소드
        
        Args:
            current_pos: 현재 위치 (row, col)
            new_pos: 새로운 위치 (row, col)
            current_state: 현재 상태 ('path', 'entrance', 'home', etc.)
        
        Returns:
            bool: 이동 가능 여부
        """
        if not self.is_valid_position(new_pos):
            return False
        
        current_value = self.maze[current_pos[0], current_pos[1]]
        new_value = self.maze[new_pos[0], new_pos[1]]
        
        # 벽으로는 이동 불가
        if new_value == 1:
            return False
        
        # 현재 경로에 있는 경우
        if current_state == 'path':
            # 로(0)와 출입구(8)로만 이동 가능
            return new_value in [0, 8]

        # 현재 출입구에 있는 경우
        if current_value == 8:
        # 출입구에서는 인접한 모든 구역으로 이동 가능
            return True

        # 특정 구역 내부에 있는 경우
        if current_value in [2, 3, 4, 5, 6, 7, 9, 10, 11]:
        # 같은 구역 내부에서만 이동 가능
            if new_value == current_value:
                return True
            # 또는 출입구(8)로만 이동 가능
            if new_value == 8:
                return True
        # 그 외의 경우는 이동 불가
            return False
    
        return False

    def get_valid_moves(self, current_pos, current_state):
        moves = [(0, 1), (0, -1), (1, 0), (-1, 0)]
        valid_moves = []
        current_pos = tuple(current_pos)
        
        for move in moves:
            new_pos = (current_pos[0] + move[0], current_pos[1] + move[1])
            if self.can_move_to_position(current_pos, new_pos, current_state):
                valid_moves.append(move)
        
        return valid_moves

    def set_target_for_point(self, point_index: int, target_zone: int):
        """특정 포인트의 목표 구역 설정"""
        current_pos = Position(
            self.point_positions[point_index][0],
            self.point_positions[point_index][1]
        )
        
        # 현재 위치에서 목표 구역까지의 경로 계산
        path_result = self.spatial_memory.get_path_from_position(current_pos, target_zone)
        
        if path_result:
            path, _ = path_result
            self.current_paths[point_index] = path
            self.path_indices[point_index] = 0
            # 최종 목표 위치를 경로의 마지막 지점으로 설정
            self.target_positions[point_index] = [
                path[-1].x,
                path[-1].y
            ]
            return True
        return False

    def update(self, frame):
        for i in range(self.num_points):
            # 현재 경로가 있고 아직 완료되지 않은 경우에만 이동
            if (self.current_paths[i] and 
                self.path_indices[i] < len(self.current_paths[i])):
                
                # 현재 목표 위치
                current_target = self.current_paths[i][self.path_indices[i]]
                
                # 현재 위치가 목표 위치에 도달했는지 확인
                if (abs(self.point_positions[i][0] - current_target.x) < 0.1 and 
                    abs(self.point_positions[i][1] - current_target.y) < 0.1):
                    # 정확한 위치로 설정
                    self.point_positions[i][0] = current_target.x
                    self.point_positions[i][1] = current_target.y
                    # 다음 경로 포인트로 이동
                    self.path_indices[i] += 1
                    if self.path_indices[i] < len(self.current_paths[i]):
                        next_target = self.current_paths[i][self.path_indices[i]]
                        self.target_positions[i] = [next_target.x, next_target.y]
                else:
                    # 한 칸을 20단계로 나누어 이동
                    step_size = 0.05  # 1/20 크기의 스텝
                    
                    # x 좌표 이동
                    if abs(current_target.x - self.point_positions[i][0]) > 0:
                        dx = step_size if current_target.x > self.point_positions[i][0] else -step_size
                        self.point_positions[i][0] += dx
                    
                    # y 좌표 이동
                    if abs(current_target.y - self.point_positions[i][1]) > 0:
                        dy = step_size if current_target.y > self.point_positions[i][1] else -step_size
                        self.point_positions[i][1] += dy
                
                # 포인트 위치 업데이트
                self.points[i].set_data([self.point_positions[i][1]], [self.point_positions[i][0]])
            
        return self.points

    def animate(self):
        try:
            self.anim = FuncAnimation(
                self.fig, 
                self.update,
                frames=None,
                interval=50,  # 50ms 간격으로 업데이트 (초당 20프레임)
                blit=True,
                cache_frame_data=False
            )
            plt.show()
        except Exception as e:
            print(f"Animation error: {e}")
            plt.close()

def main():
    try:
        animation = MazeAnimation(map_matrix, zone_labels, num_points=4)
        
        # 각 포인트의 목표 설정
        target_zones = {
            0: 11,  # 첫 번째 포인트는 Library로
            1: 9,   # 두 번째 포인트는 Cafe로
            2: 10,  # 세 번째 포인트는 Park으로
            3: 7    # 네 번째 포인트는 Discussion Room으로
        }
        
        # 각 포인트의 목표 설정
        for point_idx, target_zone in target_zones.items():
            if animation.set_target_for_point(point_idx, target_zone):
                print(f"Point {point_idx} is heading to {zone_labels[target_zone]}")
            else:
                print(f"Could not set path for point {point_idx}")
        
        animation.animate()
    except Exception as e:
        print(f"Main error: {e}")
        plt.close()

if __name__ == "__main__":
    main()