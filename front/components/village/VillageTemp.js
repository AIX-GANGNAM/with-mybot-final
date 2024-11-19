import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TextInput,
  ScrollView,
  Easing,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
  orderBy,
  setDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useSelector } from "react-redux";
import app from "../../firebaseConfig";

// Firestore 초기화
const db = getFirestore(app);
const auth = getAuth(app);

// 맵 매트릭스 정의
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
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 타일 크기 정의
const Tile_HEIGHT = 33; // 픽셀 단위
const Tile_WIDTH = 30;
// 맵 타일 타입에 따른 색상 정의
const TILE_COLORS = {
  0: "rgba(0, 255, 0, 0.2)", // 이동 가능 구역 (초록색)
  1: "rgba(255, 0, 0, 0.3)", // 이동 불가 구역 (벽)
  2: "rgba(0, 0, 255, 0.3)", // Joy's Home
  3: "rgba(0, 255, 255, 0.3)", // Anger's Home
  4: "rgba(255, 255, 0, 0.3)", // Sadness's Home
  5: "rgba(255, 0, 255, 0.3)", // Fear's Home
  6: "rgba(128, 0, 128, 0.3)", // Shopping Center
  7: "rgba(0, 128, 128, 0.3)", // Discussion Room
  8: "rgba(0, 0, 0, 0.3)", // 출입구
  9: "rgba(128, 128, 0, 0.3)", // Cafe
  10: "rgba(0, 128, 0, 0.3)", // Cinema
  11: "rgba(128, 0, 0, 0.3)", // Restaurant
};

// 타일 타입별 설명
const TILE_DESCRIPTIONS = {
  0: "이동 가능",
  1: "이동 불가 (벽)",
  2: "Joy's Home",
  3: "Anger's Home",
  4: "Sadness's Home",
  5: "Fear's Home",
  6: "Shopping Center",
  7: "Discussion Room",
  8: "출입구",
  9: "Cafe",
  10: "Cinema",
  11: "Restaurant",
};

// 말풍선 컴포넌트 추가
const ChatBubble = ({ position, interactionData, onPress }) => {
  const [dots, setDots] = useState('...');

  // 말줄임표 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        styles.chatBubble,
        {
          position: 'absolute',
          left: position.x * Tile_WIDTH,
          top: position.y * Tile_HEIGHT - 40,
          zIndex: 9999,
        }
      ]}
    >
      <Text style={styles.chatBubbleText}>{dots}</Text>
    </TouchableOpacity>
  );
};

// 대화 모달 컴포넌트 추가
const InteractionModal = ({ visible, interaction, onClose }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>대화 내용</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.interactionText}>
              {interaction?.content || "대화 내용이 없습니다."}
            </Text>
            {interaction?.participants && (
              <Text style={styles.participantsText}>
                참여자: {interaction.participants.join(', ')}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function VillageV2() {


  // 유저 정보
  const user = useSelector((state) => state.user.user);
  const auth = getAuth();


  // characters 상태 초기화를 useEffect 내부로 이동
  const [characters, setCharacters] = useState([]);

  // characterSchedules가 업데이트될 때 캐릭터 위치 설정 => 나중에 수정이 필요할듯(처음 위치 및 스프라이트 이미지 적용)
  useEffect(() => {
    if (Object.keys(characterSchedules).length > 0) {
      const initialCharacters = [
        {
          id: 1,
          name: "Joy",
          position: new Animated.ValueXY(),
          image: require("../../assets/character/yellow.png"),
          direction: 'down',
          isMoving: false,
          currentFrame: 0,
          currentPath: null,
          isInteracting: false,
          interactingWith: null
        },
        {
          id: 2,
          name: "Anger",
          position: new Animated.ValueXY(),
          image: require("../../assets/character/red.png"),
          direction: 'down',
          isMoving: false,
          currentFrame: 0,
          currentPath: null,
          isInteracting: false,
          interactingWith: null
        },
        {
          id: 3,
          name: "Sadness",
          position: new Animated.ValueXY(),
          image: require("../../assets/character/blue.png"),
          direction: 'down',
          isMoving: false,
          currentFrame: 0,
          currentPath: null,
          isInteracting: false,
          interactingWith: null
        },
      ];

      // 각 캐릭터의 초기 위치 설정
      initialCharacters.forEach(char => {
        const schedule = characterSchedules[char.name];
        if (schedule?.data[0]?.path) {
          // path가 있으면 시작점으로 설정
          const startPos = schedule.data[0].path[0];
          char.position.setValue({
            x: startPos[1] * Tile_WIDTH,
            y: startPos[0] * Tile_HEIGHT
          });
        } else if (schedule?.data[0]?.location) {
          // location이 으면 해당 위치로 설정
          char.position.setValue({
            x: schedule.data[0].location[1] * Tile_WIDTH,
            y: schedule.data[0].location[0] * Tile_HEIGHT
          });
        }
      });

      setCharacters(initialCharacters);
    }
  }, [characterSchedules]);


  
  

  // 스프라이트 설정 수정
  const spriteConfig = {
    frameWidth: 30, // 실제 프레임 크기에 맞게 조정
    frameHeight: 33,
    animations: {
      down: { row: 0, frames: 3 },
      up: { row: 3, frames: 3 },
      left: { row: 1, frames: 3 },
      right: { row: 2, frames: 3 },
      down_idle: { row: 0, frames: 3 },
      up_idle: { row: 3, frames: 3 },
      left_idle: { row: 1, frames: 3 },
      right_idle: { row: 2, frames: 3 }
    },
  };

  // 안전한 animation row 가져오기 함수
  const getAnimationRow = (direction, isMoving) => {
    const animationKey = isMoving ? direction : `${direction}_idle`;
    return spriteConfig.animations[animationKey]?.row ?? 0; // 기본값으로 0 사용
  };

  // 각 캐릭터별 애니메이션 효과 추가
  useEffect(() => {
    const animationIntervals = characters.map(character => {
      return setInterval(
        () => {
          setCharacters(prevCharacters => 
            prevCharacters.map(char => 
              char.id === character.id
                ? {
                    ...char,
                    currentFrame: (char.currentFrame + 1) % spriteConfig.animations[char.isMoving ? char.direction : `${char.direction}_idle`].frames
                  }
                : char
            )
          );
        },
        character.isMoving ? 50 : 200
      );
    });

    return () => {
      animationIntervals.forEach(interval => clearInterval(interval));
    };
  }, [characters]);

  
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
                    backgroundColor: TILE_COLORS[cell] || "rgba(0, 0, 0, 0.2)", // 정의되지 않은 숫자는 검정색으로
                  },
                ]}
              >
                <Text style={styles.coordText}>{`${x},${y}\n${cell}`}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // 시간 스케일 조정 (120분의 1)
  const TIME_SCALE = 1;

  // 스케줄 실행 위한 상태 추가
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
  const [isScheduleRunning, setIsScheduleRunning] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);


  // 다음 스케줄로 이동
  const moveToNextSchedule = (schedule) => {
    if (currentScheduleIndex < schedule.length - 1) {
      setCurrentScheduleIndex(currentScheduleIndex + 1);
    } else {
      setIsScheduleRunning(false);
      console.log("일과 완료");
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
    if (
      isScheduleRunning &&
      scheduleData[currentScheduleIndex]?.type === "movement"
    ) {
      moveAlongPath();
    }
  }, [currentPathIndex, isScheduleRunning]);


  // 플로팅 버튼 시작
  // 상태와 애니메이션 값 설정
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // 메뉴 토글 함수 수
  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
      duration: 300,
    }).start();

    setIsMenuOpen(!isMenuOpen);
  };

  // 페르소나 이미지 상태 추가
  const [personaImage, setPersonaImage] = useState(null);

  useEffect(() => {
    const fetchPersonaImage = async () => {
      try {
        const db = getFirestore();
        const user_doc = collection(db, "users");
        const result = await getDoc(doc(user_doc, auth.currentUser.uid));
        const personaData = result.data().persona;

        const defaultImage =
          "https://firebasestorage.googleapis.com/v0/b/mirrorgram-20713.appspot.com/o/%E2%80%94Pngtree%E2%80%94default%20avatar_5408436.png?alt=media&token=36f0736a-17cb-444f-8fe1-1bca085b28e2"; // 기본 이미지 URL

        const imageMap = personaData.reduce((acc, item) => {
          acc[item.Name] = item.IMG || defaultImage; // IMG가 없으면 기본 이미지 사용
          return acc;
        }, {});

        setPersonaImage(imageMap);
      } catch (error) {
        console.error("페르소나 이미지 가져오기 실패:", error);
      }
    };

    fetchPersonaImage();
  }, []);

  const menuButtons = [
    {
      image: { uri: personaImage?.clone },
      onPress: () => handlePersonaPress("clone"),
      type: "clone",
    },
    {
      image: { uri: personaImage?.Joy },
      onPress: () => handlePersonaPress("Joy"),
      type: "Joy",
    },
    {
      image: { uri: personaImage?.Anger },
      onPress: () => handlePersonaPress("Anger"),
      type: "Anger",
    },
    {
      image: { uri: personaImage?.Sadness },
      onPress: () => handlePersonaPress("Sadness"),
      type: "Sadness",
    },
    {
      image: { uri: personaImage?.custom },
      onPress: () => handlePersonaPress("custom"),
      type: "custom",
    },
  ];

  // 모달 관련 상태 추가
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [personaModalVisible, setPersonaModalVisible] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);

  // 페르소나 정보 데터 추가
  const personaInfo = {
    clone: {
      type: "clone",
      name: "분신",
      description: "당신의 또 다른 모습",
      traits: ["적응력", "다면성", "유연성"],
      specialty: "상황에 따른 역할 전환",
    },
    Joy: {
      type: "Joy",
      name: "기쁨",
      description: "긍정적 에너지의 원천",
      traits: ["낙관성", "열정", "친근함"],
      specialty: "즐거운 순간 만들기",
    },
    Anger: {
      type: "Anger",
      name: "분노",
      description: "정의와 변화의 동력",
      traits: ["결단력", "추진력", "정직함"],
      specialty: "부당한 상황 개선하기",
    },
    Sadness: {
      type: "Sadness",
      name: "슬픔",
      description: "공감과 치유의 매개체",
      traits: ["공감능", "섬세함", "이해심"],
      specialty: "깊은 감정 이해하기",
    },
    custom: {
      type: "custom",
      name: "사용자 정의",
      description: "나만의 특별한 페르소나",
      traits: ["창의성", "독창성", "자유로움"],
      specialty: "새로운 관점 제시하기",
    },
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

    setChatInput("");

    if (activeTab === "chat") {
      try {
        // exit 메시지 전송

        // http://221.148.97.237:1919/chat/user
        // http://110.11.192.148:1919/chat/user
        // http://10.0.2.2:1919/chat/user
        await axios.post("http://10.0.2.2:1919/chat/user", {
          param: JSON.stringify({
            uid: auth.currentUser.uid,
            message: "exit",
            persona: selectedPersona.type,
          }),
        });

        // 모달 닫기
      } catch (error) {
        console.error("채팅 종료 메시지 전송 실패:", error);
      }
    }
  };

  // 화면 크기 가져오기 => 이거 는가?
  // const { width, height } = Dimensions.get("window");

  // 상단에 상태 추가
  const [activeTab, setActiveTab] = useState("log"); // 'log' 또는 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

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
          const userDocRef = doc(
            db,
            "village/chat/users",
            auth.currentUser.uid
          );
          const personaDocRef = doc(
            db,
            `village/chat/users/${auth.currentUser.uid}/personas`,
            selectedPersona.type
          );

          try {
            await setDoc(userDocRef, { initialized: true }, { merge: true });
            await setDoc(
              personaDocRef,
              {
                type: selectedPersona.type,
                initialized: true,
              },
              { merge: true }
            );
          } catch (error) {
            console.log("초기화 중 오류:", error);
          }
        };

        initializeChat();

        // 실시간 리스너 설정
        const q = query(chatRef, orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const messages = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate().toLocaleTimeString(),
            }));
            setChatMessages(messages);
          },
          (error) => {
            console.log("채팅 로드 중 오류:", error);
            setChatMessages([]);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("채팅 초기화 오류:", error);
        setChatMessages([]);
      }
    }
  }, [selectedPersona]);

  // 메시 전송 함수
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
        sender: "user",
      });

      // AI 응답 요청

      // http://221.148.97.237:1919/chat/user
      // http://110.11.192.148:1919/chat/user
      // http://10.0.2.2:1919/chat/user
      const response = await axios.post("http://10.0.2.2:1919/chat/user", {
        param: JSON.stringify({
          uid: auth.currentUser.uid,
          message: chatInput,
          persona: selectedPersona.type,
        }),
      });

      // AI 응답 저장
      await addDoc(messagesRef, {
        message: response.data.message,
        timestamp: serverTimestamp(),
        sender: `${selectedPersona.type}`,
      });

      setChatInput("");
    } catch (error) {
      console.error("메시지 전송 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 상단에 ref 추가
  const scrollViewRef = useRef();
  // 플로팅 버튼 끝



  // 캐릭터별 스케줄 상태 관리
  const [characterSchedules, setCharacterSchedules] = useState({
    Joy: { currentIndex: 0, isRunning: false, data: [], completed: false },
    Anger: { currentIndex: 0, isRunning: false, data: [], completed: false },
    Sadness: { currentIndex: 0, isRunning: false, data: [], completed: false },
  });

  // 오늘 날짜 구하기
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0].replace(/-/g, "");
  };

  // 기상 시간에서 숫자만 추출하는 함수
  const extractHourFromWakeUpTime = (wakeUpTime) => {
    if (typeof wakeUpTime === "string") {
      // 숫자만 추출
      const hour = parseInt(wakeUpTime.replace(/[^0-9]/g, ""));
      return isNaN(hour) ? 7 : hour; // 파싱 실패시 기본값 7
    }
    return 7; // 문자열이 아닌 경우 기본값 7
  };

  // Firestore에서 스케줄 가져오기 및 실시간 업데이트 설정
  // 스케줄 시작 함수 중요
  useEffect(() => {
    console.log("useEffect 실행됨");

    const fetchAndSetupSchedule = async () => {
      console.log("fetchAndSetupSchedule 실행됨");
      try {
        console.log("현재 유저 정보:", {
          reduxUser: user,
          uid: user?.uid,
        });

        if (!user?.uid) {
          console.log("유 ID가 없음");
          return;
        }

        // Timestamp로 변환
        const today = Timestamp.fromDate(
          new Date(new Date().setHours(0, 0, 0, 0))
        );
        const tomorrow = Timestamp.fromDate(
          new Date(new Date().setHours(24, 0, 0, 0))
        );

        const schedulesRef = collection(db, "village", "schedule", "schedules");
        const q = query(
          schedulesRef,
          where("uid", "==", user.uid),
          where("date", ">=", today),
          where("date", "<", tomorrow)
        );

        // 실시간 업데이트 리스너 설정
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
          console.log("스냅샷 업데이 발생");

          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            const parsedSchedule = JSON.parse(data.schedule);

            console.log("parsedSchedule:", parsedSchedule);

            // 캐릭터별 스케줄 데이터 구성
            const newSchedules = {};
            parsedSchedule.forEach((characterData) => {
              newSchedules[characterData.name] = {
                currentIndex: 0,
                isRunning: false,
                data: characterData.daily_schedule,
                wakeUpTime: extractHourFromWakeUpTime(
                  characterData.wake_up_time
                ),
              };
            });

            setCharacterSchedules(newSchedules);
            console.log("스케줄 업데이트됨:", newSchedules);
          } else {
            console.log("스케줄 없음, 새로 생성 요청");
            try {
              const response = await axios.post("http://10.0.2.2:1919/start", {
                uid: user.uid,
                profile: {
                  mbti: user.profile.mbti,
                },
              });
              console.log("새 스케줄 생성 응답:", response.data);
            } catch (error) {
              console.error("스케줄 생성 요청 실패:", error);
            }
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("스케줄 가져오기 실패:", error);
      }
    };

    if (user?.uid) {
      fetchAndSetupSchedule();
    }
  }, [user]);


  // characterSchedules가 변경될 때마다 실행되는 useEffect 추가
  useEffect(() => {
    console.log("characterSchedules 변경됨:", characterSchedules);
  }, [characterSchedules]);



  // 각 캐릭터별 스케줄 실행기 생성
  const executeIndividualSchedule = async (characterName) => {
    console.log(`[${characterName}] Starting individual schedule execution`);
    
    const schedule = characterSchedules[characterName];
    if (!schedule || !schedule.data || schedule.completed) return;

    // 현재 태스크 실행
    const executeTask = async (taskIndex) => {
      if (taskIndex >= schedule.data.length) {
        // 모든 태스크 완료
        setCharacterSchedules(prev => ({
          ...prev,
          [characterName]: {
            ...prev[characterName],
            completed: true,
            isRunning: false
          }
        }));
        return;
      }

      const currentTask = schedule.data[taskIndex];
      console.log(`[${characterName}] Executing task ${taskIndex + 1}/${schedule.data.length}:`, currentTask);

      try {
        if (currentTask.type === "movement") {
          await moveCharacterAlongPath(characterName, currentTask.path);
        } else if (currentTask.type === "activity") {
          await performActivity(characterName, currentTask);
        }

        // 다음 태스크로 이동
        setCharacterSchedules(prev => ({
          ...prev,
          [characterName]: {
            ...prev[characterName],
            currentIndex: taskIndex + 1,
            isRunning: true
          }
        }));

        // 재귀적으로 다음 태스크 실행
        await executeTask(taskIndex + 1);

      } catch (error) {
        console.error(`[${characterName}] Error executing task:`, error);
      }
    };

    // 첫 태스크부터 시작
    await executeTask(schedule.currentIndex);
  };

  // 개별 캐릭터의 경로 이동 함수
  const moveCharacterAlongPath = async (characterName, path) => {
    const character = characters.find(c => c.name === characterName);
    if (!character || !path || path.length < 2) return;

    for (let i = 0; i < path.length - 1; i++) {
      const currentPos = path[i];
      const nextPos = path[i + 1];

      // 방향 계산
      const dx = nextPos[1] - currentPos[1];
      const dy = nextPos[0] - currentPos[0];
      const direction = getDirection(dx, dy);

      // 현재 캐릭터의 상태만 업데이트
      setCharacters(prev => prev.map(char => 
        char.name === characterName
          ? { ...char, direction, isMoving: true }
          : char
      ));

      await new Promise((resolve) => {
        Animated.timing(character.position, {
          toValue: {
            x: nextPos[1] * Tile_WIDTH,
            y: nextPos[0] * Tile_HEIGHT
          },
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(resolve);
      });

      // 매 이동마다 근접 체크
      const newCollisions = checkCharacterCollisions();
      if (newCollisions.length > 0) {
        handleCharacterCollisions(newCollisions);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 이동 완료 후 해당 캐릭터만 상태 업데이트
    setCharacters(prev => prev.map(char => 
      char.name === characterName
        ? { ...char, isMoving: false }
        : char
    ));
  };

  // 활동 수행 함수
  const performActivity = async (characterName, task) => {
    const character = characters.find(c => c.name === characterName);
    if (!character || !task.location) return;

    // 활동 위치로 이동
    await new Promise((resolve) => {
      Animated.timing(character.position, {
        toValue: {
          x: task.location[1] * Tile_WIDTH,
          y: task.location[0] * Tile_HEIGHT
        },
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(resolve);
    });

    // 활동 시간 대기
    await new Promise(resolve => 
      setTimeout(resolve, task.duration * TIME_SCALE * 1000)
    );
  };

  // 방향 계산 헬퍼 함수
  const getDirection = (dx, dy) => {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    }
    return dy > 0 ? "down" : "up";
  };

  // 스케줄 시작 함수 수정
  const startAllSchedules = () => {
    console.log("Starting all schedules");
    
    // 각 캐릭터의 스케줄 초기화 및 시작
    Object.keys(characterSchedules).forEach(characterName => {
      setCharacterSchedules(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          currentIndex: 0,
          isRunning: true,
          completed: false
        }
      }));
      
      // 각 캐릭터의 스케줄 독립적으로 실행
      executeIndividualSchedule(characterName);
    });
  };

  // useEffect 수정 - 각 캐릭터의 스케줄 상태 변경 감지
  useEffect(() => {
    Object.entries(characterSchedules).forEach(([characterName, schedule]) => {
      if (schedule.isRunning && !schedule.completed && schedule.currentIndex < schedule.data.length) {
        executeIndividualSchedule(characterName);
      }
    });
  }, []); // 의존성 배열을 비워서 초기에만 실행되도록 함

  // 스케줄 완료 상태를 체크하는 함수 추가
  const checkAllSchedulesCompleted = () => {
    return Object.values(characterSchedules).every(schedule => schedule.completed);
  };

  // 전체 스케줄 완료 감시
  useEffect(() => {
    if (checkAllSchedulesCompleted()) {
      console.log("All schedules completed!");
      // 필요한 경우 여기에 완료 후 처리 로직 추가
    }
  }, [characterSchedules]);

  // 캐릭터 상태 업데이트 함수
  const updateCharacterState = (characterId, updates) => {
    setCharacters(prev => 
      prev.map(char => 
        char.id === characterId 
          ? { ...char, ...updates }
          : char
      )
    );
  };

  // 캐릭터 위치 체크를 위한 상태 추가
  const [characterCollisions, setCharacterCollisions] = useState([]);

  // 캐릭터 위치 체크 함수 수정
  const checkCharacterCollisions = () => {
    const collisions = [];
    
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const char1 = characters[i];
        const char2 = characters[j];
        
        const char1Pos = {
          x: Math.round(char1.position.x._value / Tile_WIDTH),
          y: Math.round(char1.position.y._value / Tile_HEIGHT)
        };
        
        const char2Pos = {
          x: Math.round(char2.position.x._value / Tile_WIDTH),
          y: Math.round(char2.position.y._value / Tile_HEIGHT)
        };

        // 맨해튼 거리 계산 (가로 + 세로 거리의 합)
        const distance = Math.abs(char1Pos.x - char2Pos.x) + Math.abs(char1Pos.y - char2Pos.y);

        // 거리가 1일 때 (인접한 타일)
        if (distance === 1) {
          collisions.push({
            characters: [
              { name: char1.name, position: char1Pos },
              { name: char2.name, position: char2Pos }
            ],
            distance: distance,
            timestamp: new Date().getTime()
          });
        }
      }
    }
    
    return collisions;
  };

  // 캐릭터 충돌 처리 함수 수정
  const handleCharacterCollisions = (collisions) => {
    collisions.forEach(collision => {
      const [char1, char2] = collision.characters;
      console.log(
        `캐릭터 근접 감지: ${char1.name}(${char1.position.x},${char1.position.y})와 ` +
        `${char2.name}(${char2.position.x},${char2.position.y})가 인해있습니다.`
      );
      
      // Firestore에 이벤트 기록
      // const saveProximityEvent = async () => {
      //   try {
      //     const eventRef = collection(db, 'village', 'events', 'proximities');
      //     await addDoc(eventRef, {
      //       characters: [
      //         { name: char1.name, position: char1.position },
      //         { name: char2.name, position: char2.position }
      //       ],
      //       distance: collision.distance,
      //       timestamp: serverTimestamp(),
      //       userId: user.uid,
      //       // 추가적인 이벤트 데이터
      //       eventType: 'proximity',
      //       status: 'detected'
      //     });
      //   } catch (error) {
      //     console.error('근접 이벤트 저장 실패:', error);
      //   }
      // };

      // saveProximityEvent();

      // 여기에 근접 시 실행할 추가 이벤트 로직 추가
      // 예: 대화 시작, 특별 애니메이션, 상호작용 UI 표시 등
      handleProximityInteraction(char1, char2);
    });
  };

  // 로그 저장 함수 수정
  const saveCharacterLog = async (character, activity, type = 'activity', additionalData = {}) => {
    try {
      const db = getFirestore();
      
      // 위치 정보 안전하게 추출
      let coordinates = {
        x: 0,
        y: 0
      };
      
      try {
        coordinates = {
          x: Math.floor(character.position.x._value / Tile_WIDTH),
          y: Math.floor(character.position.y._value / Tile_HEIGHT)
        };
      } catch (error) {
        console.warn('위치 정보 추출 중 오류:', error);
      }

      const logRef = collection(
        db, 
        'village/logs',
        user.uid,
        character.name,
        'history'
      );

      const logData = {
        timestamp: serverTimestamp(),
        activity: activity,
        type: type,
        location: {
          coordinates: coordinates,
          zone: getCurrentZone(character.position)
        },
        ...additionalData
      };

      await addDoc(logRef, logData);
      console.log(`${character.name}의 로그가 저장되었습니다:`, logData);
    } catch (error) {
      console.error('로그 저장 중 오류:', error);
    }
  };

  // getCurrentZone 함수 수정
  const getCurrentZone = (position) => {
    if (!position || !position.x || !position.y) {
      return '알 수 없는 위치';
    }

    try {
      const x = Math.floor(position.x._value / Tile_WIDTH);
      const y = Math.floor(position.y._value / Tile_HEIGHT);

      // 구역 정의
      const zones = {
        "기쁨의 집": { x: [2, 4], y: [2, 4] },
        "분노의 집": { x: [6, 8], y: [2, 4] },
        "슬픔의 집": { x: [10, 12], y: [2, 4] },
        "두려움의 집": { x: [2, 4], y: [6, 8] },
        "쇼핑센터": { x: [6, 8], y: [6, 8] },
        "토론장": { x: [10, 12], y: [6, 8] },
        "카페": { x: [2, 4], y: [10, 12] },
        "영화관": { x: [6, 8], y: [10, 12] },
        "레스토랑": { x: [10, 12], y: [10, 12] }
      };

      // 현재 위치가 어느 구역에 속하는지 확인
      for (const [zoneName, area] of Object.entries(zones)) {
        if (x >= area.x[0] && x <= area.x[1] && y >= area.y[0] && y <= area.y[1]) {
          return zoneName;
        }
      }

      return '일반 구역';
    } catch (error) {
      console.error('Zone 확인 중 오류:', error);
      return '알 수 없는 위치';
    }
  };

  // handleProximityInteraction 함수에 로그 저장 추가
  const handleProximityInteraction = async (char1, char2) => {
    console.log('근접 감지 시작:', {
      char1: char1.name,
      char2: char2.name
    });

    // 즉시 상호작용 상태 업데이트
    setCharacters(prevCharacters => {
      return prevCharacters.map(char => {
        if (char.name === char1.name || char.name === char2.name) {
          console.log(`${char.name} 상호작용 상태 true로 변경`);
          return {
            ...char,
            isInteracting: true,
            interactingWith: char.name === char1.name ? char2.name : char1.name
          };
        }
        return char;
      });
    });

    // 상호작용 타이머 설정
    setTimeout(() => {
      setCharacters(prevCharacters => 
        prevCharacters.map(char => {
          if (char.name === char1.name || char.name === char2.name) {
            return {
              ...char,
              isInteracting: false,
              interactingWith: null
            };
          }
          return char;
        })
      );
    }, 500000);

    // API 호출이나 다른 로직은 여기서 계속 진행
    try {
      const response = await axios.post("http://10.0.2.2:1919/chat/persona", {
        param : JSON.stringify({
          uid : user.uid,
          characters: [
            {
              name: char1.name,
              position: char1.position,
              currentState: char1.isMoving ? 'moving' : 'idle'
            },
            {
              name: char2.name,
              position: char2.position,
              currentState: char2.isMoving ? 'moving' : 'idle'
            }
          ],
          timestamp: new Date().toISOString(),
          interactionType: 'proximity'
        })
      })

      // 대화 로그 저장
      const conversationLog = `${char2.name}와(과) 대화를 나눴습니다.`;
      await saveCharacterLog(char1, conversationLog, 'conversation');
      await saveCharacterLog(char2, conversationLog, 'conversation');

    } catch (error) {
      console.error('상호작용 처리 중 오류:', error);
    }
  };

  // 컴포넌트 상단에 state 추가
  const [characterLogs, setCharacterLogs] = useState([]);

  // 로그 불러오기 함수 수정
  const fetchCharacterLogs = async (characterName) => {
    try {
      const db = getFirestore();
      console.log('Fetching logs for character:', characterName);
      console.log('User ID:', user.uid);
      
      const logsRef = collection(
        db,
        'village/logs',
        user.uid,
        characterName,
        'history'
      );
      
      const q = query(logsRef, orderBy('timestamp', 'desc'));
      console.log('Query path:', logsRef.path);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Snapshot received, document count:', snapshot.docs.length);
        const logs = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Log data:', data);
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate()
          };
        });
        console.log('Processed logs:', logs);
        setCharacterLogs(logs);
      }, (error) => {
        console.error('Snapshot listener error:', error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('로그 불러오기 중 오류:', error);
      setCharacterLogs([]);
      return () => {};
    }
  };

  useEffect(()=>{
    if(modalVisible && selectedPersona && activeTab === 'log'){
      fetchCharacterLogs(selectedPersona.type);
    }
  },[modalVisible, selectedPersona, activeTab])

  // useEffect 수정
  // useEffect(() => {
  //   let unsubscribe = () => {};

  //   if (modalVisible && selectedPersona && activeTab === 'log') {
  //     unsubscribe = fetchCharacterLogs(selectedPersona.type);
  //   }

  //   return () => {
  //     unsubscribe();
  //   };
  // }, [modalVisible, selectedPersona, activeTab]);

  // handleChatBubblePress 함수 추가
  const handleChatBubblePress = (character) => {
    console.log("Chat bubble pressed for character:", character.name);
    const interactionData = {
      content: `${character.name}와 ${character.interactingWith}의 대화\n\n"서로의 일정에 대해 이야기를 나누고 있습니다."`,
      participants: [character.name, character.interactingWith]
    };
    setSelectedInteraction(interactionData);
    setPersonaModalVisible(true);
  };

  // 렌더링 부분 수정
  return (
    <View style={styles.container}>
      {/* 배경 맵 */}
      <Image
        source={require("../../assets/map-background.gif")}
        style={styles.mapBackground}
      />

      {/* 캐릭터들 */}
      {characters.map((character) => (
        <React.Fragment key={character.id}>
          <Animated.View
            style={[styles.character, {
              transform: character.position.getTranslateTransform(),
              width: spriteConfig.frameWidth,
              height: spriteConfig.frameHeight,
              overflow: "hidden",
              position: "absolute",
              zIndex: 100,
            }]}
          >
            <Image
              source={character.image}
              style={{
                width: spriteConfig.frameWidth * 10,
                height: spriteConfig.frameHeight * 8,
                position: "absolute",
                left: -spriteConfig.frameWidth * (character.currentFrame || 0),
                top: -spriteConfig.frameHeight * getAnimationRow(character.direction, character.isMoving),
              }}
            />
          </Animated.View>
          
          {character.isInteracting && (
            <ChatBubble
              position={{
                x: character.position.x._value / Tile_WIDTH,
                y: character.position.y._value / Tile_HEIGHT
              }}
              interactionData={{
                content: `${character.name}와 ${character.interactingWith}의 대화`,
                participants: [character.name, character.interactingWith]
              }}
              onPress={() => handleChatBubblePress(character)}
            />
          )}
        </React.Fragment>
      ))}
      {/* <MatrixOverlay /> */}

      <TouchableOpacity
        style={styles.startButton}
        onPress={startAllSchedules}
        disabled={Object.values(characterSchedules).some((s) => s.isRunning)}
      >
        <Text style={styles.startButtonText}>
          {Object.values(characterSchedules).some((s) => s.isRunning)
            ? "실행 중..."
            : "일과 시작"}
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
                      outputRange: [0, offsetX],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
                opacity: animation,
              },
            ]}
          >
            <TouchableOpacity
              onPress={button.onPress}
              style={{ width: "100%", height: "100%" }}
            >
              <Image
                source={button.image}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 28,
                  resizeMode: "cover",
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
                  outputRange: ["0deg", "45deg"],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={toggleMenu}>
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

                  {/* 모달 추가 */}
<InteractionModal 
  visible={personaModalVisible}
  interaction={selectedInteraction}
  onClose={() => {
    setPersonaModalVisible(false);
    setSelectedInteraction(null);
  }}
/>

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
                    source={
                      menuButtons.find(
                        (btn) => btn.type === selectedPersona.type
                      )?.image
                    }
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
                  activeTab === "log" && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab("log")}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "log" && styles.activeTabButtonText,
                  ]}
                >
                  활동 내역
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "chat" && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab("chat")}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "chat" && styles.activeTabButtonText,
                  ]}
                >
                  채팅
                </Text>
              </TouchableOpacity>
            </View>



            {/* 탭 컨텐츠 */}
            {activeTab === "log" ? (
              // 로그 탭 컨텐츠
              <View style={styles.tabContent}>
                <ScrollView style={styles.logContainer}>
                  {characterLogs.length > 0 ? (
                    characterLogs.map((log) => (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logHeader}>
                          <Text style={styles.logTime}>
                            {log.timestamp ? log.timestamp.toLocaleTimeString() : '시간 정보 없음'}
                          </Text>
                          <Text style={styles.logLocation}>
                            📍 {log.location?.zone || '위치 정보 없음'}
                          </Text>
                        </View>
                        <View style={styles.logContent}>
                          <Text style={styles.logText}>{log.activity}</Text>
                          {log.location?.coordinates && (
                            <Text style={styles.logCoordinates}>
                              좌표: ({log.location.coordinates.x}, {log.location.coordinates.y})
                            </Text>
                          )}
                          {log.scheduleName && (
                            <Text style={styles.scheduleInfo}>
                              일정: {log.scheduleName}
                            </Text>
                          )}
                          {log.duration && (
                            <Text style={styles.durationInfo}>
                              소요 시간: {log.duration / 1000}초
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noLogsContainer}>
                      <Text style={styles.noLogsText}>아직 기록된 활동이 없습니다.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : (
              // 채팅 탭 컨츠
              <View style={styles.tabContent}>
                <ScrollView
                  style={styles.chatContainer}
                  ref={scrollViewRef}
                  onContentSizeChange={() =>
                    scrollViewRef.current?.scrollToEnd({ animated: true })
                  }
                >
                  {chatMessages.map((message) => (
                    <View
                      key={message.id}
                      style={[
                        styles.messageContainer,
                        message.sender === "user"
                          ? styles.userMessage
                          : styles.botMessage,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          message.sender === "user"
                            ? styles.userBubble
                            : styles.botBubble,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            message.sender === "user"
                              ? styles.userMessageText
                              : styles.botMessageText,
                          ]}
                        >
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
    width: "100%",
    height: "100%",
  },
  mapBackground: {
    width: "100%",
    height: "100%",
    position: "absolute",
    resizeMode: "cover",
  },
  character: {
    position: "absolute",
  },
  controls: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    zIndex: 5,
  },
  horizontalControls: {
    flexDirection: "row",
    justifyContent: "center",
  },
  button: {
    width: 50,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  matrixOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // 맵 위에 표되도록
  },
  matrixRow: {
    flexDirection: "row",
  },
  matrixCell: {
    width: Tile_WIDTH,
    height: Tile_HEIGHT,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    borderRadius: 5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  legendColor: {
    width: 20,
    height: 20,
    marginRight: 5,
    borderWidth: 1,
    borderColor: "white",
  },
  legendText: {
    color: "white",
    fontSize: 12,
  },
  coordText: {
    fontSize: 10,
    color: "white",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  startButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 255, 0.7)",
    padding: 10,
    borderRadius: 5,
  },
  startButtonText: {
    color: "white",
    fontSize: 16,
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 1,
  },

  menuButton: {
    backgroundColor: "#FFFFFF",
    zIndex: 0,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    height: "70%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 10,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "bold",
  },
  personaInfo: {
    width: "100%",
    height: "100%",
    paddingTop: 40,
  },
  personaName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  personaDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
    marginBottom: 10,
  },
  traitsContainer: {
    width: "100%",
    marginBottom: 20,
  },
  traitItem: {
    marginVertical: 5,
  },
  traitText: {
    fontSize: 16,
    color: "#555",
  },
  specialtyContainer: {
    width: "100%",
  },
  specialtyText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 22,
  },
  tabButtons: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 15,
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#4A90E2",
  },
  tabButtonText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabButtonText: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
  tabContent: {
    flex: 1,
    width: "100%",
  },
  chatContainer: {
    flex: 1,
    width: "100%",
    marginBottom: 10,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
    width: "100%",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 20,
    zIndex: 10000
  },
  userMessage: {
    alignItems: "flex-end",
  },
  botMessage: {
    alignItems: "flex-start",
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderTopRightRadius: 4,
    marginLeft: "auto",
  },
  botBubble: {
    backgroundColor: "#E9ECEF",
    borderTopLeftRadius: 4,
    marginRight: "auto",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  botMessageText: {
    color: "#000000",
  },
  messageTime: {
    fontSize: 12,
    color: "#000000",
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  loadingContainer: {
    padding: 16,
    alignItems: "flex-start",
  },
  loadingText: {
    fontSize: 24,
    color: "#666666",
    marginLeft: 16,
  },
  chatBubble: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 8,
    minWidth: 40,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  chatBubbleText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  logContainer: {
    flex: 1,
    padding: 16,
  },
  logItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  logLocation: {
    fontSize: 12,
    color: '#666',
  },
  logContent: {
    marginTop: 4,
  },
  logText: {
    fontSize: 14,
    color: '#333',
  },
  logCoordinates: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  noLogsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noLogsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  logType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  logTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleInfo: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 4,
  },
  durationInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
    width: '100%',
    padding: 15,
  },
  interactionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 10,
  },
  participantsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
});



