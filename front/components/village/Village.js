import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Animated, TouchableOpacity, Text, StyleSheet, Modal, Dimensions, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';




    // 맵 매트릭스 정의
    const mapMatrix = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 2, 2, 0, 0, 0, 0, 3, 3, 3, 3, 0, 1],
        [1, 0, 2, 2, 2, 0, 0, 0, 0, 3, 3, 3, 3, 0, 1],
        [1, 0, 2, 8, 2, 0, 0, 0, 0, 3, 8, 3, 3, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 1],
        [1, 0, 0, 0, 5, 5, 5, 5, 0, 0, 4, 4, 4, 0, 1],
        [1, 0, 0, 0, 5, 5, 5, 5, 0, 0, 4, 4, 4, 0, 1],
        [1, 0, 0, 0, 5, 8, 5, 5, 0, 0, 8, 4, 4, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 6, 6, 6, 6, 0, 0, 7, 7, 7, 0, 0, 0, 1],
        [1, 0, 6, 6, 6, 6, 0, 0, 7, 7, 7, 0, 0, 0, 1],
        [1, 0, 6, 6, 6, 6, 0, 0, 7, 7, 7, 0, 0, 0, 1],
        [1, 0, 6, 8, 8, 6, 0, 0, 7, 8, 7, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 0, 1],
        [1, 0, 0,10,10,10,10,10, 0, 9, 9, 9, 9, 0, 1],
        [1, 0, 0,10,10,10,10,10, 0, 9, 9, 9, 9, 0, 1],
        [1, 0, 0,10,10, 8,10,10, 0, 9, 8, 9, 9, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0,11,11, 8,11, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0,11,11,11,11, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0,11,11,11,11, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ];
      
      // 타일 크기 정의
      const Tile_HEIGHT = 33; // 픽셀 단위
      const Tile_WIDTH = 30;
      // 맵 타일 타입에 따른 색상 정의
const TILE_COLORS = {
    0: 'rgba(0, 255, 0, 0.2)',    // 이동 가능 구역 (초록색)
    1: 'rgba(255, 0, 0, 0.3)',    // 이동 불가 구역 (빨간색)
    2: 'rgba(0, 0, 255, 0.3)',    // 물 구역 (파란색)
    3: 'cyan', // 입구 구역 (회색)
    4: 'rgba(255, 255, 0, 0.3)',   // 특별 구역 (노란색)
    5: 'rgba(255, 0, 255, 0.3)',   // 이벤트 구역 (보라색)
    8: 'black'
    // 필요한 만큼 추가
  };
  
  // 타일 타입별 설명
  const TILE_DESCRIPTIONS = {
    0: '이동 가능',
    1: '이동 불가',
    2: '물 구역',
    3: '절벽',
    4: '특별 구역',
    5: '이벤트 구역',
    // 필요한 만큼 추가
  };

export default function Village() {


  const auth = getAuth();
  
  const [characters, setCharacters] = useState([
    {
      id: 1,
      position: new Animated.ValueXY({ 
        x: Tile_WIDTH * 2,
        y: Tile_HEIGHT * 3
      }),
      image: require('../../assets/character/yellow.png'),
    },
    {
      id: 2,
      position: new Animated.ValueXY({ 
        x: Tile_WIDTH * 10,
        y: Tile_HEIGHT * 3
      }),
      image: require('../../assets/character/red.png'),
    },
    {
      id: 3,
      position: new Animated.ValueXY({ 
        x: Tile_WIDTH * 5,
        y: Tile_HEIGHT * 7
      }),
      image: require('../../assets/character/blue.png'),
    },
    {
      id: 4,
      position: new Animated.ValueXY({ 
        x: Tile_WIDTH * 8,
        y: Tile_HEIGHT * 12
      }),
      image: require('../../assets/character/jelda.png'),
    },
    {
      id: 5,
      position: new Animated.ValueXY({ 
        x: Tile_WIDTH * 9,
        y: Tile_HEIGHT * 16
      }),
      image: require('../../assets/character/black.png'),
    }
  ]);
  
  // 모달 관 상태
  

  const moveDistance = {
    x: Tile_WIDTH,
    y: Tile_HEIGHT
  }; 

  const [currentFrame, setCurrentFrame] = useState(0);
  const [direction, setDirection] = useState('down');
  const [isMoving, setIsMoving] = useState(false); // 움직임 상태 추가

  // 스프라이트 설정 수정
  const spriteConfig = {
    frameWidth: 30,  // 실제 프레임 크기에 맞게 조정
    frameHeight: 33,
    animations: {
      down_idle: { row: 0, frames: 3 },  // idle 애니메이션은 3프레임
      down: { row: 4, frames: 10 },
      left_idle: { row: 1, frames: 3 },
      left: { row: 5, frames: 10 },
      right_idle: { row: 3, frames: 3 },
      right: { row: 7, frames: 10 },
      up_idle: { row: 2, frames: 1 },
      up: { row: 6, frames: 10 },
    }
  };

  // 애니메이션 효과 수정
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setCurrentFrame((prev) => {
        const maxFrames = spriteConfig.animations[
          isMoving ? direction : `${direction}_idle`
        ].frames;
        return (prev + 1) % maxFrames;
      });
    }, isMoving ? 50 : 200);  // 움직일 때는 더 빠르게, idle일 때는 천천히

    return () => clearInterval(animationInterval);
  }, [isMoving, direction]);

  const handleMove = (moveDirection) => {
    const character = characters[0];
    const currentX = character.position.x._value;
    const currentY = character.position.y._value;
    
    const matrixX = Math.floor(currentX / Tile_WIDTH);
    const matrixY = Math.floor(currentY / Tile_HEIGHT);
    
    let newX = currentX;
    let newY = currentY;
    let targetX = matrixX;
    let targetY = matrixY;
    let canMove = false;

    switch (moveDirection) {
      case 'up':
        newY = currentY - moveDistance.y;
        targetY = matrixY - 1;
        break;
      case 'down':
        newY = currentY + moveDistance.y;
        targetY = matrixY + 1;
        break;
      case 'left':
        newX = currentX - moveDistance.x;
        targetX = matrixX - 1;
        break;
      case 'right':
        newX = currentX + moveDistance.x;
        targetX = matrixX + 1;
        break;
    }

    canMove = checkCollision(targetX, targetY);

    if (canMove) {
      setDirection(moveDirection);
      setIsMoving(true);
      moveCharacter(character.id, newX, newY);

      if (checkEntrance(targetX, targetY)) {
        setTimeout(() => {
          handleEnterBuilding(targetX, targetY);
        }, 300);
      }

      setTimeout(() => {
        setIsMoving(false);
        setCurrentFrame(0);
      }, 300);
    }
  };

  // 충돌 감지 함수
  const checkCollision = (x, y) => {
    // 맵 경계 체크
    if (x < 0 || x >= mapMatrix[0].length || y < 0 || y >= mapMatrix.length) {
      return false;
    }
    
    const tileType = mapMatrix[y][x];
    // 0은 이동 가능, 8은 출입구
    return tileType === 0 || tileType === 8;
  };

  // 건물 진입 처리 함수 수정
  const handleEnterBuilding = (x, y) => {
    // 각 출입구의 위치와 해당하는 건물 확인
    if (y === 3) {
      if (x === 3) {
        // Joy's Home 출입구
        console.log("Joy's Home에 진입했습니다.");
        // navigation.navigate('JoyHome');
      } else if (x === 10) {
        // Anger's Home 출입구
        console.log("Anger's Home에 진입했습니다.");
        // navigation.navigate('AngerHome');
      }
    } else if (y === 7) {
      if (x === 5) {
        // Sadness's Home 출입구
        console.log("Sadness's Home에 진입했습니다.");
        // navigation.navigate('SadnessHome');
      } else if (x === 9) {
        // Shopping Center 출입구
        console.log("Shopping Center에 진입했습니다.");
        // navigation.navigate('ShoppingCenter');
      }
    } else if (y === 12) {
      if (x === 3) {
        // Discussion Room 출입구
        console.log("Discussion Room에 진입했습니다.");
        // navigation.navigate('DiscussionRoom');
      } else if (x === 8) {
        // Fear's Home 출입
        console.log("Fear's Home에 진입했습니다.");
        // navigation.navigate('FearHome');
      }
    } else if (y === 16) {
      if (x === 5) {
        // Cafe 출입구
        console.log("Cafe에 진입했습니다.");
        // navigation.navigate('Cafe');
      } else if (x === 9) {
        // 영화관 출입구
        console.log("영화관에 진입했습니다.");
        // navigation.navigate('Cinema');
      }
    } else if (y === 18 && x === 10) {
      // Restaurant 출입구
      console.log("Restaurant에 진입했습니다.");
      // navigation.navigate('Restaurant');
    }
  };

  // 건물 타입 확인 함수 추가
  const getBuildingType = (x, y) => {
    const tileType = mapMatrix[y][x];
    switch (tileType) {
      case 2:
        return 'Joy_home';
      case 3:
        return 'Anger_home';
      case 4:
        return 'Sadness_home';
      case 5:
        return 'Fear_home';
      case 6:
        return 'Shopping_center';
      case 7:
        return 'Discussion_room';
      case 9:
        return 'Cafe';
      case 10:
        return 'Cinema';
      case 11:
        return 'Restaurant';
      default:
        return null;
    }
  };

  // checkEntrance 함수 수정 (선택사항: 출입구 근처에서만 진입 가능하도록)
  const checkEntrance = (x, y) => {
    if (x < 0 || x >= mapMatrix[0].length || y < 0 || y >= mapMatrix.length) {
      return false;
    }
    
    if (mapMatrix[y][x] === 8) {
      // 주변 타일 확인하여 어떤 건물의 출입구인지 체크
      const surroundingTiles = [
        { x: x-1, y: y },
        { x: x+1, y: y },
        { x: x, y: y-1 },
        { x: x, y: y+1 }
      ];

      for (const tile of surroundingTiles) {
        const buildingType = getBuildingType(tile.x, tile.y);
        if (buildingType) {
          return true;
        }
      }
    }
    return false;
  };

  // 캐릭터 이동 로직 수정
  const moveCharacter = (characterId, newX, newY) => {
    Animated.timing(characters.find(c => c.id === characterId).position, {
      toValue: { 
        x: Math.round(newX / Tile_WIDTH) * Tile_WIDTH, 
        y: Math.round(newY / Tile_HEIGHT) * Tile_HEIGHT
      },
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // 맵 컴포넌트 내부에 추가
  const MatrixOverlay = () => {
    return (
      <View style={styles.matrixOverlay}>
        {mapMatrix.map((row, y) => (
          <View key={y} style={styles.matrixRow}>
            {row.map((cell, x) => (
              <View
                key={`${x}-${y}`}
                style={[
                  styles.matrixCell,
                  {
                    backgroundColor: TILE_COLORS[cell] || 'rgba(0, 0, 0, 0.2)', // 정의되지 않은 숫자는 검정색으로
                  }
                ]}
              >
                <Text style={styles.coordText}>
                  {`${x},${y}\n${cell}`}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // 스케줄 이터 타입 정의
  const scheduleData = [
    {'type': 'activity', 'activity': '명상과 간단한 스트레칭', 'location': [1, 2], 'duration': 30, 'zone': 'Joy_home'}, 
    {'type': 'activity', 'activity': '아침 식사를 하며 하루의 계획 세우기', 'location': [1, 2], 'duration': 30, 'zone': 'Joy_home'}, 
    {'type': 'movement', 'path': [[1, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [8, 4], [8, 5], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [13, 5], [13, 4], [13, 3], [12, 3], [11, 3], [10, 3]], 'start_zone': 'Joy_home', 'end_zone': 'Discussion Room', 'duration': 22}, 
    {'type': 'activity', 'activity': '자원봉사 활동에 참여하거나 친구들과 만남', 'location': [10, 3], 'duration': 240, 'zone': 'Discussion Room'}, 
    {'type': 'movement', 'path': [[10, 3], [11, 3], [12, 3], [13, 3], [13, 4], [13, 5], [13, 6], [13, 7], [13, 8], [14, 8], [15, 8], [16, 8], [16, 9], [17, 9], [17, 10], [18, 10], [18, 9]], 'start_zone': 'Discussion Room', 'end_zone': 'Restaurant', 'duration': 16}, 
    {'type': 'activity', 'activity': '점심 먹기', 'location': [18, 9], 'duration': 60, 'zone': 'Restaurant'}, 
    {'type': 'movement', 'path': [[18, 9], [18, 10], [17, 10], [17, 9], [16, 9], [16, 8], [15, 8], [14, 8], [13, 8], [13, 7], [13, 6], [13, 5], [13, 4], [13, 3], [12, 3], [11, 3], [10, 3]], 'start_zone': 'Restaurant', 'end_zone': 'Discussion Room', 'duration': 16}, 
    {'type': 'activity', 'activity': '오후에도 자원봉사나 사회적 활동 계속하기', 'location': [10, 3], 'duration': 240, 'zone': 'Discussion Room'}, 
    {'type': 'movement', 'path': [[10, 3], [11, 3], [12, 3], [13, 3], [13, 4], [13, 5], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6], [8, 5], [8, 4], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3]], 'start_zone': 'Discussion Room', 'end_zone': 'Joy_home', 'duration': 20}, 
    {'type': 'activity', 'activity': '집에 돌아와 독서나 창작 활동', 'location': [2, 3], 'duration': 120, 'zone': 'Joy_home'}, 
    {'type': 'movement', 'path': [[2, 3], [3, 3], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [16, 9], [17, 9], [17, 10], [18, 10]], 'start_zone': 'Joy_home', 'end_zone': 'Restaurant', 'duration': 23}, 
    {'type': 'activity', 'activity': '저녁 식사', 'location': [18, 10], 'duration': 60, 'zone': 'Restaurant'}, 
    {'type': 'movement', 'path': [[18, 10], [17, 10], [17, 9], [16, 9], [16, 8], [15, 8], [14, 8], [13, 8], [13, 7], [13, 6], [13, 5], [13, 4], [13, 3], [12, 3], [11, 3], [10, 3]], 'start_zone': 'Restaurant', 'end_zone': 'Discussion Room', 'duration': 15}, 
    {'type': 'activity', 'activity': '친구들과의 영상 통화나 소셜 미디어 소통', 'location': [10, 3], 'duration': 60, 'zone': 'Discussion Room'}, 
    {'type': 'movement', 'path': [[10, 3], [11, 3], [12, 3], [13, 3], [13, 4], [13, 5], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6], [8, 5], [8, 4], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3]], 'start_zone': 'Discussion Room', 'end_zone': 'Joy_home', 'duration': 20}, 
    {'type': 'activity', 'activity': '편안한 음악을 듣거나 명상하며 하루 마무리', 'location': [2, 3], 'duration': 60, 'zone': 'Joy_home'}, 
    {'type': 'activity', 'activity': '취 준비 및 독서', 'location': [2, 3], 'duration': 30, 'zone': 'Joy_home'}
]
  // 시간 스케일 조정 (120분의 1)
  const TIME_SCALE = 1/120;

  // 스케줄 실행 위한 상태 추가
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
  const [isScheduleRunning, setIsScheduleRunning] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);

  // 스케줄 실행 함수
  const executeSchedule = async () => {
    const schedule = scheduleData[currentScheduleIndex];
    
    if (schedule.type === 'activity') {
      // 활동 실행
      console.log(`${schedule.activity} 시작 (${schedule.duration * TIME_SCALE}분)`);
      await new Promise(resolve => setTimeout(resolve, schedule.duration * TIME_SCALE * 1000));
      moveToNextSchedule();
    } else if (schedule.type === 'movement') {
      // 이동 실행
      moveAlongPath(schedule.path);
    }
  };

  // 경로를 따라 이동하는 함수
  const moveAlongPath = async () => {
    const schedule = scheduleData[currentScheduleIndex];
    const path = schedule.path;
    
    if (currentPathIndex < path.length - 1) {
      const currentPos = path[currentPathIndex];
      const nextPos = path[currentPathIndex + 1];
      
      // 이동 방향 결정
      let moveDirection;
      if (nextPos[0] > currentPos[0]) moveDirection = 'right';
      else if (nextPos[0] < currentPos[0]) moveDirection = 'left';
      else if (nextPos[1] > currentPos[1]) moveDirection = 'down';
      else if (nextPos[1] < currentPos[1]) moveDirection = 'up';
      
      // 이동 실행
      handleMove(moveDirection);
      
      // 다음 위치로 이동
      setTimeout(() => {
        setCurrentPathIndex(currentPathIndex + 1);
      }, 300); // 이동 니메이션 시간
    } else {
      // 경로 이동 완료
      setCurrentPathIndex(0);
      moveToNextSchedule();
    }
  };

  // 음 스케줄로 이동
  const moveToNextSchedule = () => {
    if (currentScheduleIndex < scheduleData.length - 1) {
      setCurrentScheduleIndex(currentScheduleIndex + 1);
    } else {
      setIsScheduleRunning(false);
      console.log('일과 완료');
    }
  };

  // 스케줄 시작 버튼 추가
  const startSchedule = () => {
    setIsScheduleRunning(true);
    setCurrentScheduleIndex(0);
    setCurrentPathIndex(0);
  };

  // useEffect로 스케줄 실행 감시
  useEffect(() => {
    if (isScheduleRunning) {
      executeSchedule();
    }
  }, [currentScheduleIndex, isScheduleRunning]);

  // useEffect로 경로 이동 감시
  useEffect(() => {
    if (isScheduleRunning && scheduleData[currentScheduleIndex]?.type === 'movement') {
      moveAlongPath();
    }
  }, [currentPathIndex, isScheduleRunning]);

  // 상태와 애니메이션 값 설정
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // 메뉴 토글 함수 수정
  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
      duration: 300
    }).start();
    
    setIsMenuOpen(!isMenuOpen);
  };

  // 버튼 데이터 정의
  // const menuButtons = [
  //   { icon: 'map', onPress: () => console.log('지도') },
  //   { icon: 'person', onPress: () => console.log('프로필') },
  //   { icon: 'settings', onPress: () => console.log('설정') },
  //   { icon: 'notifications', onPress: () => console.log('알림') },
  //   { icon: 'menu', onPress: () => console.log('메뉴') },
  // ];

  const [personaImage, setPersonaImage] = useState(null);

  useEffect(() => {
    const fetchPersonaImage = async () => {
      try {
        const db = getFirestore();
        const user_doc = collection(db, 'users');
        const result = await getDoc(doc(user_doc, auth.currentUser.uid));
        const personaData = result.data().persona;
        
        const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/mirrorgram-20713.appspot.com/o/%E2%80%94Pngtree%E2%80%94default%20avatar_5408436.png?alt=media&token=36f0736a-17cb-444f-8fe1-1bca085b28e2'; // 기본 이미지 URL
        
        const imageMap = personaData.reduce((acc, item) => {
          acc[item.Name] = item.IMG || defaultImage; // IMG가 없으면 기본 이미지 사용
          return acc;
        }, {});
        
        console.log('이미지 데이터 확인 ', imageMap);
        setPersonaImage(imageMap);
      } catch (error) {
        console.error('페르소나 이미지 가져오기 실패:', error);
      }
    };

    fetchPersonaImage();
  }, []);



  const menuButtons = [
    {
      image: { uri: personaImage?.clone },
      onPress: () => handlePersonaPress('clone'),
      type: 'clone'
    },
    {
      image: { uri: personaImage?.Joy },
      onPress: () => handlePersonaPress('Joy'),
      type: 'Joy'
    },
    {
      image: { uri: personaImage?.Anger },
      onPress: () => handlePersonaPress('Anger'),
      type: 'Anger'
    },
    {
      image: { uri: personaImage?.Sadness },
      onPress: () => handlePersonaPress('Sadness'),
      type: 'Sadness'
    },
    {
      image: { uri: personaImage?.custom },
      onPress: () => handlePersonaPress('custom'),
      type: 'custom'
    }
  ];

  // 모달 관련 상태 추가
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);

  // 페르소나 정보 데터 추가
  const personaInfo = {
    clone: {
      type: 'clone',
      name: "분신",
      description: "당신의 또 다른 모습",
      traits: ["적응력", "다면성", "유연성"],
      specialty: "상황에 따른 역할 전환"
    },
    Joy: {
      type: 'Joy',
      name: "기쁨",
      description: "긍정적 에너지의 원천",
      traits: ["낙관성", "열정", "친근함"],
      specialty: "즐거운 순간 만들기"
    },
    Anger: {
      type: 'Anger',
      name: "분노",
      description: "정의와 변화의 동력",
      traits: ["결단력", "추진력", "정직함"],
      specialty: "부당한 상황 개선하기"
    },
    Sadness: {
      type: 'Sadness',
      name: "슬픔",
      description: "공감과 치유의 매개체",
      traits: ["공감능력", "섬세함", "이해심"],
      specialty: "깊은 감정 이해하기"
    },
    custom: {
      type: 'custom',
      name: "사용자 정의",
      description: "나만의 특별한 페르소나",
      traits: ["창의성", "독창성", "자유로움"],
      specialty: "새로운 관점 제시하기"
    }
  };

  // 페르소나 선택 핸들러 추가
  const handlePersonaPress = (type) => {
    setSelectedPersona(personaInfo[type]);
    setModalVisible(true);
  };

  // 모달 닫기 핸들러 추가
  const handleCloseModal = async () => {
    setModalVisible(false);
    setSelectedPersona(null);

    setChatInput('');

    if (activeTab==='chat'){
      try {
        // exit 메시지 전송


        await axios.post('http://10.0.2.2:1919/chat/user', {
          param: JSON.stringify({
            uid: auth.currentUser.uid,
            message: 'exit',
            persona: selectedPersona.type
          })
        });
        
        // 모달 닫기
        
      } catch (error) {
        console.error('채팅 종료 메시지 전송 실패:', error);
        
      }
    }
  };

  // 화면 크기 가져오기
  const { width, height } = Dimensions.get('window');

  // 상단에 상태 추가
  const [activeTab, setActiveTab] = useState('log'); // 'log' 또는 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // 상단에 로딩 상태 추가
  const [isLoading, setIsLoading] = useState(false);

  // useEffect로 실시간 채팅 리스너 설정
  useEffect(() => {
    if (selectedPersona) {
      try {
        const db = getFirestore();
        const chatPath = `village/chat/users/${auth.currentUser.uid}/personas/${selectedPersona.type}/messages`;
        const chatRef = collection(db, chatPath);
        
        // 초기 경로 구조 생성
        const initializeChat = async () => {
          const userDocRef = doc(db, 'village/chat/users', auth.currentUser.uid);
          const personaDocRef = doc(db, `village/chat/users/${auth.currentUser.uid}/personas`, selectedPersona.type);
          
          try {
            await setDoc(userDocRef, { initialized: true }, { merge: true });
            await setDoc(personaDocRef, { 
              type: selectedPersona.type,
              initialized: true 
            }, { merge: true });
          } catch (error) {
            console.log("초기화 중 오류:", error);
          }
        };
        
        initializeChat();

        // 실시간 리스너 설정
        const q = query(chatRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate().toLocaleTimeString()
          }));
          setChatMessages(messages);
        }, (error) => {
          console.log("채팅 로드 중 오류:", error);
          setChatMessages([]);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("채팅 초기화 오류:", error);
        setChatMessages([]);
      }
    }
  }, [selectedPersona]);

  // 메시지 전송 함수
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    try {
      setIsLoading(true);
      const db = getFirestore();
      const chatPath = `village/chat/users/${auth.currentUser.uid}/personas/${selectedPersona.type}/messages`;
      const messagesRef = collection(db, chatPath);
      
      // 사용자 메시지 저장
      await addDoc(messagesRef, {
        message: chatInput,
        timestamp: serverTimestamp(),
        sender: 'user'
      });

      // AI 응답 요청

      // http://110.11.192.148:1919/chat/user
      // http://10.0.2.2:1919/chat/user
      const response = await axios.post('http://110.11.192.148:1919/chat/user', {
        param: JSON.stringify({
          uid: auth.currentUser.uid,
          message: chatInput,
          persona: selectedPersona.type
        })
      });

      // AI 응답 저장
      await addDoc(messagesRef, {
        message: response.data.message,
        timestamp: serverTimestamp(),
        sender: 'bot'
      });

      setChatInput('');
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 상단에 ref 추가
  const scrollViewRef = useRef();

  return (
    <View style={styles.container}>
      {/* 배경 맵 */}
      <Image 
        source={require('../../assets/map-background.gif')}
        style={styles.mapBackground}
      />
      
      {/* 캐릭터들 */}
      {characters.map((character) => (
        <Animated.View
          key={character.id}
          style={[
            styles.character,
            { 
              transform: character.position.getTranslateTransform(),
              width: spriteConfig.frameWidth,
              height: spriteConfig.frameHeight,
              overflow: 'hidden',
              position: 'absolute'
            }
          ]}
        >
          <Image
            source={character.image}
            style={{
              width: spriteConfig.frameWidth * 10,
              height: spriteConfig.frameHeight * 8,
              position: 'absolute',
              left: -spriteConfig.frameWidth * currentFrame,
              top: -spriteConfig.frameHeight * spriteConfig.animations[
                isMoving ? direction : `${direction}_idle`
              ].row,
            }}
          />
        </Animated.View>
      ))}
      
      {/* 방향키 컨트롤러 */}
      {/* <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={() => handleMove('up')}>
          <Text>↑</Text>
        </TouchableOpacity>
        <View style={styles.horizontalControls}>
          <TouchableOpacity style={styles.button} onPress={() => handleMove('left')}>
            <Text>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleMove('down')}>
            <Text>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleMove('right')}>
            <Text>→</Text>
          </TouchableOpacity>
        </View>
      </View> */}
      {/* <MatrixOverlay /> */}
      
      <TouchableOpacity 
        style={styles.startButton}
        onPress={startSchedule}
        disabled={isScheduleRunning}
      >
        <Text style={styles.startButtonText}>
          {isScheduleRunning ? '실행 중...' : '일과 시작'}
        </Text>
      </TouchableOpacity>

      {/* 메뉴 버튼들 */}
      {menuButtons.map((button, index) => {
        const offsetX = (index + 1) * 60;
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.floatingButton,
              styles.menuButton,
              {
                transform: [
                  {
                    translateX: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, offsetX]
                    })
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1]
                    })
                  }
                ],
                opacity: animation
              }
            ]}
          >
            <TouchableOpacity 
              onPress={button.onPress}
              style={{ width: '100%', height: '100%' }}
            >
              <Image 
                source={button.image}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: 28,
                  resizeMode: 'cover'
                }}
              />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* 메인 버튼 */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [
              {
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg']
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity onPress={toggleMenu}>
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* 페르소나 모달 추가 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 상단 헤더 추가 */}
            <View style={styles.modalHeader}>
              {selectedPersona && (
                <>
                  <Image 
                    source={menuButtons.find(btn => btn.type === selectedPersona.type)?.image}
                    style={styles.selectedPersonaImage}
                  />
                  <Text style={styles.selectedPersonaName}>
                    {selectedPersona.name}
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <Ionicons name="close-sharp" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* 기존 탭 버튼들 */}
            <View style={styles.tabButtons}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'log' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('log')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'log' && styles.activeTabButtonText
                ]}>로그</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'chat' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('chat')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'chat' && styles.activeTabButtonText
                ]}>채팅</Text>
              </TouchableOpacity>
            </View>

            {/* 탭 컨텐츠 */}
            {activeTab === 'log' ? (
              // 로그 탭 컨츠
              <View style={styles.tabContent}>
                {selectedPersona && (
                  <View style={styles.personaInfo}>
                    <Text style={styles.personaName}>{selectedPersona.name}</Text>
                    <Text style={styles.personaDescription}>
                      {selectedPersona.description}
                    </Text>
                    
                    <View style={styles.traitsContainer}>
                      <Text style={styles.sectionTitle}>특성</Text>
                      {selectedPersona.traits.map((trait, index) => (
                        <View key={index} style={styles.traitItem}>
                          <Text style={styles.traitText}>• {trait}</Text>
                        </View>
                      ))}
                    </View>
                    
                    <View style={styles.specialtyContainer}>
                      <Text style={styles.sectionTitle}>전문 분야</Text>
                      <Text style={styles.specialtyText}>
                        {selectedPersona.specialty}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              // 채팅 탭 컨텐츠
              <View style={styles.tabContent}>
                <ScrollView 
                  style={styles.chatContainer}
                  ref={scrollViewRef}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                  {chatMessages.map(message => (
                    <View 
                      key={message.id} 
                      style={[
                        styles.messageContainer,
                        message.sender === 'user' ? styles.userMessage : styles.botMessage
                      ]}
                    >
                      <View style={[
                        styles.messageBubble,
                        message.sender === 'user' ? styles.userBubble : styles.botBubble
                      ]}>
                        <Text style={[
                          styles.messageText,
                          message.sender === 'user' ? styles.userMessageText : styles.botMessageText
                        ]}>
                          {message.message}
                        </Text>
                      </View>
                      <Text style={styles.messageTime}>
                        {message.timestamp}
                      </Text>
                    </View>
                  ))}
                  {isLoading && (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>...</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="메시지를 입력하세요..."
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={handleSendMessage}
                  >
                    <Text style={styles.sendButtonText}>전송</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  character: {
    position: 'absolute',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  matrixOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,  // 맵 위에 표되도록
  },
  matrixRow: {
    flexDirection: 'row',
  },
  matrixCell: {
    width: Tile_WIDTH,
    height: Tile_HEIGHT,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendColor: {
    width: 20,
    height: 20,
    marginRight: 5,
    borderWidth: 1,
    borderColor: 'white',
  },
  legendText: {
    color: 'white',
    fontSize: 12,
  },
  coordText: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  startButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 255, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 1,
  },

  menuButton: {
    backgroundColor: '#FFFFFF',
    zIndex: 0,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    height: '70%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  personaInfo: {
    width: '100%',
    height: '100%',
    paddingTop: 40,
  },
  personaName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  personaDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  traitsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  traitItem: {
    marginVertical: 5,
  },
  traitText: {
    fontSize: 16,
    color: '#555',
  },
  specialtyContainer: {
    width: '100%',
  },
  specialtyText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  tabButtons: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 15,
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    width: '100%',
  },
  chatContainer: {
    flex: 1,
    width: '100%',
    marginBottom: 10,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
    width: '100%',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderTopRightRadius: 4,
    marginLeft: 'auto',
  },
  botBubble: {
    backgroundColor: '#E9ECEF',
    borderTopLeftRadius: 4,
    marginRight: 'auto',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 12,
    color: '#000000',
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  selectedPersonaImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedPersonaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'flex-start',
  },
  loadingText: {
    fontSize: 24,
    color: '#666666',
    marginLeft: 16,
  },
});
