import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const TILE_WIDTH = 30;
const TILE_HEIGHT = 33;

// 맵 매트릭스
const mapMatrix = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

const characterData = [{"name": "Joy", "wake_up_time": "# \n7am", "daily_schedule": [{"type": "activity", "activity": "\uba85\uc0c1", "location": [2, 2], "duration": 20, "zone": "Joy_home"}, {"type": "movement", "path": [[2, 2], [2, 3]], "start_zone": "Joy_home", "end_zone": "Joy_home", "duration": 1}, {"type": "activity", "activity": "\uac04\ub2e8\ud55c \uc2a4\ud2b8\ub808\uce6d", "location": [2, 3], "duration": 10, "zone": "Joy_home"}, {"type": "activity", "activity": "\uc544\uce68 \uc2dd\uc0ac \ubc0f \ud558\ub8e8 \uacc4\ud68d \uc138\uc6b0\uae30", "location": [2, 3], "duration": 30, "zone": "Joy_home"}, {"type": "movement", "path": [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [15, 8], [15, 9], [14, 9], [13, 9], [12, 9]], "start_zone": "Joy_home", "end_zone": "Discussion Room", "duration": 22}, {"type": "activity", "activity": "\uc790\uc6d0\ubd09\uc0ac \ud65c\ub3d9 \ucc38\uc5ec", "location": [12, 9], "duration": 240, "zone": "Discussion Room"}, {"type": "movement", "path": [[12, 9], [13, 9], [14, 9], [15, 9], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [19, 9], [19, 10], [18, 10], [17, 10], [16, 10]], "start_zone": "Discussion Room", "end_zone": "Cafe", "duration": 13}, {"type": "activity", "activity": "\uc810\uc2ec \uc2dd\uc0ac", "location": [16, 10], "duration": 60, "zone": "Cafe"}, {"type": "movement", "path": [[16, 10], [17, 10], [18, 10], [19, 10], [19, 9], [19, 8], [18, 8], [17, 8], [16, 8], [15, 8], [15, 9], [14, 9], [13, 9], [12, 9]], "start_zone": "Cafe", "end_zone": "Discussion Room", "duration": 13}, {"type": "activity", "activity": "\uc0ac\ud68c\uc801 \ud65c\ub3d9 \uacc4\uc18d\ud558\uae30", "location": [12, 9], "duration": 240, "zone": "Discussion Room"}, {"type": "movement", "path": [[12, 9], [13, 9], [14, 9], [15, 9], [15, 8], [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [10, 6], [10, 5], [10, 4], [10, 3], [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3]], "start_zone": "Discussion Room", "end_zone": "Joy_home", "duration": 21}, {"type": "activity", "activity": "\uc9d1\uc5d0 \ub3cc\uc544\uc640 \ub3c5\uc11c", "location": [3, 3], "duration": 60, "zone": "Joy_home"}, {"type": "movement", "path": [[3, 3], [3, 2]], "start_zone": "Joy_home", "end_zone": "Joy_home", "duration": 1}, {"type": "activity", "activity": "\ucc3d\uc791 \ud65c\ub3d9", "location": [3, 2], "duration": 60, "zone": "Joy_home"}, {"type": "movement", "path": [[3, 2], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [19, 9], [19, 10], [19, 11], [20, 11], [21, 11], [21, 10]], "start_zone": "Joy_home", "end_zone": "Restaurant", "duration": 28}, {"type": "activity", "activity": "\uc800\ub141 \uc2dd\uc0ac", "location": [21, 10], "duration": 60, "zone": "Restaurant"}, {"type": "movement", "path": [[21, 10], [21, 11], [20, 11], [19, 11], [19, 10], [19, 9], [19, 8], [18, 8], [17, 8], [16, 8], [15, 8], [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [10, 6], [10, 5], [10, 4], [10, 3], [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3]], "start_zone": "Restaurant", "end_zone": "Joy_home", "duration": 27}, {"type": "activity", "activity": "\uc5ec\uc720\ub86d\uac8c TV \uc2dc\uccad", "location": [3, 3], "duration": 60, "zone": "Joy_home"}, {"type": "movement", "path": [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [15, 8], [15, 9], [14, 9], [13, 9], [12, 9]], "start_zone": "Joy_home", "end_zone": "Discussion Room", "duration": 21}, {"type": "activity", "activity": "\uce5c\uad6c\uc640 \ud1b5\ud654", "location": [12, 9], "duration": 30, "zone": "Discussion Room"}, {"type": "movement", "path": [[12, 9], [13, 9], [14, 9], [15, 9], [15, 8], [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [10, 6], [10, 5], [10, 4], [10, 3], [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3]], "start_zone": "Discussion Room", "end_zone": "Joy_home", "duration": 22}, {"type": "activity", "activity": "\ud558\ub8e8 \uc815\ub9ac\ud558\uba70 \uba85\uc0c1", "location": [2, 3], "duration": 20, "zone": "Joy_home"}, {"type": "activity", "activity": "\ucde8\uce68 \uc900\ube44", "location": [2, 3], "duration": 10, "zone": "Joy_home"}, {"type": "activity", "activity": "\ucde8\uce68", "location": [2, 3], "duration": 480, "zone": "Joy_home"}]}, {"name": "Anger", "wake_up_time": "# \n7am", "daily_schedule": [{"type": "activity", "activity": "\uc77c\uc5b4\ub098\uc11c \uc2a4\ud2b8\ub808\uce6d", "location": [6, 11], "duration": 10, "zone": "Anger_home"}, {"type": "activity", "activity": "\ucee4\ud53c\ub97c \ub9c8\uc2dc\uba70 \ud558\ub8e8 \uacc4\ud68d \uc138\uc6b0\uae30", "location": [6, 11], "duration": 15, "zone": "Anger_home"}, {"type": "activity", "activity": "\ucd9c\uadfc \uc900\ube44", "location": [6, 11], "duration": 60, "zone": "Anger_home"}, {"type": "movement", "path": [[6, 11], [6, 10], [7, 10], [8, 10], [9, 10], [9, 9], [9, 8], [10, 8], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [15, 8], [15, 9], [14, 9], [13, 9], [12, 9], [11, 9]], "start_zone": "Anger_home", "end_zone": "Discussion Room", "duration": 19}, {"type": "activity", "activity": "\uc9c1\uc7a5\uc5d0 \ub3c4\ucc29 \ud6c4 \ub3d9\ub8cc\ub4e4\uacfc \uc778\uc0ac", "location": [11, 9], "duration": 10, "zone": "Discussion Room"}, {"type": "activity", "activity": "\uc5c5\ubb34 \uc9c4\ud589 \ubc0f \ub3d9\ub8cc\ub4e4\uacfc\uc758 \ud68c\uc758", "location": [11, 9], "duration": 120, "zone": "Discussion Room"}, {"type": "movement", "path": [[11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [19, 9], [19, 10], [19, 11], [20, 11], [21, 11], [21, 10]], "start_zone": "Discussion Room", "end_zone": "Restaurant", "duration": 15}, {"type": "activity", "activity": "\uc810\uc2ec \uba39\uae30", "location": [21, 10], "duration": 60, "zone": "Restaurant"}, {"type": "movement", "path": [[21, 10], [21, 11], [20, 11], [19, 11], [19, 10], [19, 9], [19, 8], [18, 8], [17, 8], [16, 8], [15, 8], [15, 9], [14, 9], [13, 9], [12, 9]], "start_zone": "Restaurant", "end_zone": "Discussion Room", "duration": 14}, {"type": "activity", "activity": "\uc5c5\ubb34 \uacc4\uc18d\ud558\uba70 \ub3d9\ub8cc\ub4e4\uacfc\uc758 \uac08\ub4f1 \ub300\ucc98", "location": [12, 9], "duration": 240, "zone": "Discussion Room"}, {"type": "movement", "path": [[12, 9], [13, 9], [14, 9], [15, 9], [15, 8], [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [10, 8], [9, 8], [9, 9], [9, 10]], "start_zone": "Discussion Room", "end_zone": "Entrance", "duration": 14}, {"type": "activity", "activity": "\ud1f4\uadfc \ud6c4 \uc6b4\ub3d9(\uc870\uae45)", "location": [9, 10], "duration": 60, "zone": "Entrance"}, {"type": "movement", "path": [[9, 10], [10, 10], [10, 11], [10, 12], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13], [19, 12], [19, 11], [20, 11], [21, 11], [21, 10]], "start_zone": "Entrance", "end_zone": "Restaurant", "duration": 18}, {"type": "activity", "activity": "\uc800\ub141 \uba39\uae30", "location": [21, 10], "duration": 60, "zone": "Restaurant"}, {"type": "movement", "path": [[21, 10], [21, 11], [20, 11], [19, 11], [19, 10], [19, 9], [19, 8], [18, 8], [17, 8], [16, 8], [15, 8], [15, 9], [14, 9], [13, 9], [12, 9], [11, 9]], "start_zone": "Restaurant", "end_zone": "Discussion Room", "duration": 15}, {"type": "activity", "activity": "\uce5c\uad6c\ub4e4\uacfc \ub9cc\ub098\uc11c \ub300\ud654", "location": [11, 9], "duration": 120, "zone": "Discussion Room"}, {"type": "movement", "path": [[11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [15, 8], [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [10, 8], [9, 8], [9, 9], [9, 10], [8, 10], [7, 10], [6, 10]], "start_zone": "Discussion Room", "end_zone": "Anger_home", "duration": 18}, {"type": "activity", "activity": "\ud63c\uc790\uc11c \uc601\ud654 \ubcf4\uae30", "location": [6, 10], "duration": 120, "zone": "Anger_home"}, {"type": "movement", "path": [[6, 10], [6, 11]], "start_zone": "Anger_home", "end_zone": "Anger_home", "duration": 1}, {"type": "activity", "activity": "\ud63c\uc790\ub9cc\uc758 \uc2dc\uac04 \uac00\uc9c0\uba70 \ucc45 \uc77d\uae30", "location": [6, 11], "duration": 60, "zone": "Anger_home"}, {"type": "movement", "path": [[6, 11], [6, 12]], "start_zone": "Anger_home", "end_zone": "Anger_home", "duration": 1}, {"type": "activity", "activity": "\uc74c\uc545 \ub4e3\uae30", "location": [6, 12], "duration": 30, "zone": "Anger_home"}, {"type": "movement", "path": [[6, 12], [6, 11]], "start_zone": "Anger_home", "end_zone": "Anger_home", "duration": 1}, {"type": "activity", "activity": "\ucde8\uce68 \uc900\ube44", "location": [6, 11], "duration": 30, "zone": "Anger_home"}, {"type": "activity", "activity": "\uc7a0\uc790\uae30", "location": [6, 11], "duration": 480, "zone": "Anger_home"}]}, {"name": "Sadness", "wake_up_time": "# \n7am", "daily_schedule": [{"type": "activity", "activity": "\uc77c\uc5b4\ub098\uc11c \uc544\uce68 \uc2a4\ud2b8\ub808\uce6d", "location": [2, 10], "duration": 15, "zone": "Sadness_home"}, {"type": "movement", "path": [[2, 10], [2, 11]], "start_zone": "Sadness_home", "end_zone": "Sadness_home", "duration": 1}, {"type": "activity", "activity": "\uc870\uc6a9\ud55c \uc2dc\uac04\uc5d0 \ucc45 \uc77d\uae30", "location": [2, 11], "duration": 45, "zone": "Sadness_home"}, {"type": "movement", "path": [[2, 11], [2, 10]], "start_zone": "Sadness_home", "end_zone": "Sadness_home", "duration": 1}, {"type": "activity", "activity": "\uc77c\uae30 \uc4f0\uae30", "location": [2, 10], "duration": 30, "zone": "Sadness_home"}, {"type": "movement", "path": [[2, 10], [3, 10], [4, 10], [5, 10], [5, 9], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [19, 9], [19, 10], [18, 10], [17, 10], [16, 10], [15, 10]], "start_zone": "Sadness_home", "end_zone": "Cafe", "duration": 27}, {"type": "activity", "activity": "\uce5c\uad6c\uc640 \ub9cc\ub098\uc11c \uce74\ud398\uc5d0\uc11c \ube0c\ub7f0\uce58 \uc990\uae30\uae30", "location": [15, 10], "duration": 90, "zone": "Cafe"}, {"type": "movement", "path": [[15, 10], [16, 10], [17, 10], [18, 10], [19, 10], [19, 9], [19, 8], [18, 8], [17, 8], [16, 8], [15, 8], [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [5, 8], [5, 9], [5, 10], [4, 10], [3, 10], [2, 10]], "start_zone": "Cafe", "end_zone": "Sadness_home", "duration": 27}, {"type": "activity", "activity": "\ud63c\uc790\uc11c \uc0b0\ucc45\ud558\uba70 \uc790\uc5f0 \uac10\uc0c1\ud558\uae30", "location": [2, 10], "duration": 60, "zone": "Sadness_home"}, {"type": "activity", "activity": "\uc9d1\uc5d0 \ub3cc\uc544\uc640 \uac10\uc815\uc801\uc778 \uc601\ud654 \uac10\uc0c1\ud558\uae30", "location": [2, 10], "duration": 120, "zone": "Sadness_home"}, {"type": "activity", "activity": "\uc800\ub141 \uc2dd\uc0ac \uc900\ube44\ud558\uace0 \uba39\uae30", "location": [2, 10], "duration": 60, "zone": "Sadness_home"}, {"type": "activity", "activity": "\uc74c\uc545\uc744 \ub4e4\uc73c\uba70 \ud3b8\uc548\ud55c \uc2dc\uac04 \ubcf4\ub0b4\uae30", "location": [2, 10], "duration": 90, "zone": "Sadness_home"}, {"type": "activity", "activity": "\ubcc4\uc744 \ubc14\ub77c\ubcf4\uba70 \uc0dd\uac01\uc5d0 \uc7a0\uae30\uae30", "location": [2, 10], "duration": 30, "zone": "Sadness_home"}, {"type": "activity", "activity": "\ucde8\uce68 \uc900\ube44 \ubc0f \uba85\uc0c1", "location": [2, 10], "duration": 15, "zone": "Sadness_home"}]}]


const VillageV3 = () => {
  const [characters, setCharacters] = useState({});
  const animationRef = useRef();
  const startTimeRef = useRef(Date.now());

  // 전체 스케줄 시간 계산
  const getTotalScheduleTime = (schedule) => {
    return schedule.reduce((total, item) => total + item.duration, 0);
  };

  // 현재 시간에 따른 스케줄 찾기
  const findCurrentSchedule = (schedule, currentMinutes) => {
    const totalTime = getTotalScheduleTime(schedule);
    // 하루 전체 시간으로 나눈 나머지 계산
    const normalizedMinutes = currentMinutes % totalTime;
    
    let accumulatedTime = 0;
    
    for (let i = 0; i < schedule.length; i++) {
      accumulatedTime += schedule[i].duration;
      if (normalizedMinutes < accumulatedTime) {
        const previousTime = accumulatedTime - schedule[i].duration;
        const progress = (normalizedMinutes - previousTime) / schedule[i].duration;
        return { index: i, progress: Math.min(Math.max(progress, 0), 1) };
      }
    }
    
    // 마지막 스케줄 반환
    return { index: schedule.length - 1, progress: 1 };
  };

  const updateCharacterPositions = () => {
    const currentTime = Date.now();
    const elapsedMinutes = ((currentTime - startTimeRef.current) / 1000); // 초 단위로 변경

    const newPositions = {};
    characterData.forEach(char => {
      if (!char.daily_schedule || char.daily_schedule.length === 0) return;

      const { index, progress } = findCurrentSchedule(char.daily_schedule, elapsedMinutes);
      const schedule = char.daily_schedule[index];

      if (!schedule) return;

      if (schedule.type === 'activity') {
        newPositions[char.name] = {
          x: schedule.location[0] * TILE_WIDTH,
          y: schedule.location[1] * TILE_HEIGHT
        };
      } else if (schedule.type === 'movement' && schedule.path && schedule.path.length > 1) {
        const pathLength = schedule.path.length - 1;
        const currentPathIndex = Math.min(
          Math.floor(progress * pathLength),
          pathLength - 1
        );
        const nextPathIndex = Math.min(currentPathIndex + 1, pathLength);
        
        const pathProgress = (progress * pathLength) % 1;
        const currentPoint = schedule.path[currentPathIndex];
        const nextPoint = schedule.path[nextPathIndex];
        
        const x = (currentPoint[0] + (nextPoint[0] - currentPoint[0]) * pathProgress) * TILE_WIDTH;
        const y = (currentPoint[1] + (nextPoint[1] - currentPoint[1]) * pathProgress) * TILE_HEIGHT;
        
        newPositions[char.name] = { x, y };
      }
    });

    setCharacters(newPositions);
    animationRef.current = requestAnimationFrame(updateCharacterPositions);
  };

  useEffect(() => {
    // 현재 시간을 기준으로 시작
    startTimeRef.current = Date.now();
    
    // 초기 위치 설정
    const initialPositions = {};
    characterData.forEach(char => {
      if (char.daily_schedule && char.daily_schedule.length > 0) {
        const firstSchedule = char.daily_schedule[0];
        initialPositions[char.name] = {
          x: firstSchedule.location[0] * TILE_WIDTH,
          y: firstSchedule.location[1] * TILE_HEIGHT
        };
      }
    });
    setCharacters(initialPositions);

    animationRef.current = requestAnimationFrame(updateCharacterPositions);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 맵 그리기 */}
      {mapMatrix.map((row, y) => (
        <View key={y} style={styles.row}>
          {row.map((cell, x) => (
            <View
              key={`${x}-${y}`}
              style={[
                styles.cell,
                { backgroundColor: cell === 1 ? '#ccc' : '#fff' }
              ]}
            />
          ))}
        </View>
      ))}

      {/* 캐릭터 그리기 */}
      {Object.entries(characters).map(([name, position]) => (
        <View
          key={name}
          style={[
            styles.character,
            {
              left: position.x,
              top: position.y,
              backgroundColor: name === 'Joy' ? '#FFD700' : 
                             name === 'Anger' ? '#FF4500' : 
                             '#4682B4',
            }
          ]}
        >
          <Text style={styles.characterText}>{name}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: mapMatrix[0].length * TILE_WIDTH,
    height: mapMatrix.length * TILE_HEIGHT,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderWidth: 1,
    borderColor: '#eee',
  },
  character: {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: TILE_WIDTH / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default VillageV3;