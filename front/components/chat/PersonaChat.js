// components/chat/PersonaChat.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { createPersonaPairName, PERSONA_ORDER } from '../../utils/utils'; // 유틸리티 함수 import
import axios from 'axios';

const PersonaChat = ({ route, navigation }) => {
  console.log("PersonaChat.js > 호출됨");
  const { pairName: initialPairName, personas } = route.params; // pairName 예: "Fear_Joy"
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const flatListRef = useRef();
  const auth = getAuth();
  const db = getFirestore();

  const user = useSelector(state => state.user.user);

  // Modal 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 요청 진행 상태

  // 페르소나 쌍 이름을 일관되게 생성 (정렬된 순서)
  const pairName = createPersonaPairName(personas[0].persona, personas[1].persona);

  useEffect(() => {
    const currentUser = auth.currentUser;
    

    if (!currentUser) {
      console.log('No current user.');
      setLoading(false);
      setError(new Error('사용자가 인증되지 않았습니다.'));
      return;
    }

    const messagesRef = collection(db, 'personachat', currentUser.uid, pairName);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('onSnapshot callback triggered.');

      try {
        const msgs = [];
        const batch = writeBatch(db);

        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          console.log('Fetched message data:', data);

          let timestamp;

          if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
              // Firestore Timestamp 객체인 경우
              timestamp = data.timestamp.toDate();
            } else {
              // Firestore Timestamp 객체가 아닌 경우 (예: 문자열, 숫자)
              timestamp = new Date(data.timestamp);
            }
          } else {
            // timestamp 필드가 없는 경우 현재 시간으로 설정
            timestamp = new Date();
          }

          const messageData = {
            id: docSnapshot.id,
            text: data.text,
            speaker: data.speaker,
            timestamp: timestamp,
          };
          msgs.push(messageData);

          // isRead가 false인 경우 true로 업데이트
          if (data.isRead === false) {
            const docRef = doc(db, 'personachat', currentUser.uid, pairName, docSnapshot.id);
            batch.update(docRef, { isRead: true });
          }
        });

        // 배치 업데이트 실행
        if (batch._mutations && batch._mutations.length > 0) {
          await batch.commit();
        }

        setMessages(msgs);
        console.log('Messages set:', msgs);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err);
        setLoading(false);
      }
    }, (err) => {
      console.error('Snapshot error:', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pairName, auth, db]);

  useEffect(() => {
    // 메시지가 업데이트된 후 자동으로 스크롤
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessage = ({ item }) => {
    const isSpeaker1 = item.speaker === personas[0].persona; // personas[0]이 주 발화자
    const personaData = personas.find(p => p.persona === item.speaker);
    const personaName = personaData ? personaData.name : item.speaker;
    const personaImage = personaData ? personaData.image : null;

    return (
      <View style={styles.messageWrapper}>
        <View style={[styles.messageContainer, isSpeaker1 ? styles.rightMessage : styles.leftMessage]}>
          {isSpeaker1 ? (
            <View style={styles.senderInfoRight}>
              <Text style={styles.senderName}>{personaName}</Text>
              <Image source={{ uri: personaImage }} style={styles.messageImage} />
            </View>
          ) : (
            <View style={styles.senderInfoLeft}>
              <Image source={{ uri: personaImage }} style={styles.messageImage} />
              <Text style={styles.senderName}>{personaName}</Text>
            </View>
          )}
          <View style={[styles.messageBubble, isSpeaker1 ? styles.userBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isSpeaker1 ? styles.userMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
          </View>
          <Text style={[styles.messageTimestamp, isSpeaker1 ? styles.timestampRight : styles.timestampLeft]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      // 오늘이면 시간만 표시
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else {
      // 오늘이 아니면 날짜만 표시
      return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    }
  };

  // 새로운 주제 전송 함수
  const sendNewTopic = async () => {
    if (newTopic.trim() === '') {
      Alert.alert('주제 입력', '주제를 입력해주세요.');
      return;
    }

    setModalVisible(false); // 모달 닫기
    setIsSubmitting(true); // 요청 시작

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('인증 오류', '사용자가 인증되지 않았습니다.');
        setIsSubmitting(false);
        return;
      }

      const rounds = Math.floor(Math.random() * 3) + 2; // 2에서 4 사이의 랜덤 정수

      // persona1과 persona2의 순서 수정
      const requestData = {
        uid: currentUser.uid,
        topic: newTopic.trim(),
        persona1: personas[1].persona, // personas[1]을 persona1으로 변경
        persona2: personas[0].persona, // personas[0]을 persona2으로 변경
        rounds: rounds,
      };

      // Axios 요청
      const response = await axios.post('http://localhost:8000/v3/persona-chat', requestData);

      if (response.status === 200) {
        // 성공 메시지 추가
        Alert.alert('성공', '새로운 주제가 성공적으로 전송되었습니다.');
        setNewTopic('');
      } else {
        Alert.alert('오류', '주제 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error sending new topic:', error);
      Alert.alert('오류', '주제 전송 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false); // 요청 완료
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          {/* 헤더에 겹친 이미지 추가 */}
          <View style={styles.headerImages}>
            {personas.map((persona, index) => (
              <Image
                key={index}
                source={{ uri: persona.image }}
                style={[
                  styles.headerImage,
                  { marginLeft: index !== 0 ? -10 : 0 } // 이미지 겹치기
                ]}
              />
            ))}
          </View>
          <Text style={styles.headerTitle}>{personas[0].name} & {personas[1].name}</Text>
          {/* 새로운 주제 던지기 버튼 */}
          <TouchableOpacity 
            onPress={() => setModalVisible(true)} 
            style={styles.newTopicButton}
          >
            <Icon name="add-circle-outline" size={28} color="#0095f6" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          {/* 헤더에 겹친 이미지 추가 */}
          <View style={styles.headerImages}>
            {personas.map((persona, index) => (
              <Image
                key={index}
                source={{ uri: persona.image }}
                style={[
                  styles.headerImage,
                  { marginLeft: index !== 0 ? -10 : 0 } // 이미지 겹치기
                ]}
              />
            ))}
          </View>
          <Text style={styles.headerTitle}>{personas[0].name} & {personas[1].name}</Text>
          {/* 새로운 주제 던지기 버튼 */}
          <TouchableOpacity 
            onPress={() => setModalVisible(true)} 
            style={styles.newTopicButton}
          >
            <Icon name="add-circle-outline" size={28} color="#0095f6" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>메시지를 불러오는 중 오류가 발생했습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          {/* 헤더에 겹친 이미지 추가 */}
          <View style={styles.headerImages}>
            {personas.map((persona, index) => (
              <Image
                key={index}
                source={{ uri: persona.image }}
                style={[
                  styles.headerImage,
                  { marginLeft: index !== 0 ? -10 : 0 } // 이미지 겹치기
                ]}
              />
            ))}
          </View>
          <Text style={styles.headerTitle}>{personas[0].name} & {personas[1].name}</Text>
          {/* 새로운 주제 던지기 버튼 */}
          <TouchableOpacity 
            onPress={() => setModalVisible(true)} 
            style={styles.newTopicButton}
          >
            <Icon name="add-circle-outline" size={28} color="#0095f6" />
          </TouchableOpacity>
        </View>

        {/* 채팅창 로딩 인디케이터 */}
        {isSubmitting && (
          <View style={styles.chatLoadingContainer}>
            <ActivityIndicator size="small" color="#0095f6" />
            <Text style={styles.chatLoadingText}>주제 생성 중...</Text>
          </View>
        )}

        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
        />

        {/* 주제 입력 모달 */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            if (!isSubmitting) {
              setModalVisible(false);
              setNewTopic('');
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>새로운 주제 입력</Text>
              <Text style={styles.modalSubtitle}>
                {personas[0].name} & {personas[1].name} 가 {user.profile.userName} 님이 입력하신 주제에 대해 이야기 할거에요
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="주제를 입력하세요..."
                value={newTopic}
                onChangeText={setNewTopic}
                editable={!isSubmitting} // 요청 중일 때 편집 불가
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    if (!isSubmitting) {
                      setModalVisible(false);
                      setNewTopic('');
                    }
                  }}
                  disabled={isSubmitting} // 요청 중일 때 버튼 비활성화
                >
                  <Text style={styles.modalButtonTextCancel}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButtonSubmit, isSubmitting && styles.buttonDisabled]}
                  onPress={sendNewTopic}
                  disabled={isSubmitting} // 요청 중일 때 버튼 비활성화
                >
                  <Text style={styles.modalButtonTextSubmit}>전송</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
    backgroundColor: '#fff',
  },
  header: {
    height: 60, // 헤더 높이 증가
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
    paddingHorizontal: 15,
    backgroundColor: '#fff', // 인스타그램처럼 깔끔한 흰색 배경
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative', // 겹친 이미지를 위한 위치 설정
  },
  backButton: {
    marginRight: 10,
  },
  headerImages: {
    flexDirection: 'row',
    position: 'absolute',
    left: 60, // backButton 위치에 맞게 조정
  },
  headerImage: {
    width: 35, // 헤더 이미지 크기 증가
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#ddd', // 이미지가 없을 때 배경색
  },
  headerTitle: {
    fontSize: 20, // 헤더 타이틀 폰트 크기 증가
    fontWeight: '700',
    color: '#333',
    marginLeft: 90, // 겹친 이미지 크기와 맞게 조정
  },
  newTopicButton: {
    position: 'absolute',
    right: 15,
  },
  messageList: {
    paddingVertical: 10,
    paddingBottom: 60, // 키보드 올라올 때 메시지가 가려지지 않도록 충분한 패딩
  },
  messageWrapper: {
    marginVertical: 5,
    marginHorizontal: 15,
  },
  messageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  leftMessage: {
    alignItems: 'flex-start',
  },
  rightMessage: {
    alignItems: 'flex-end',
  },
  senderInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderInfoRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageImage: {
    width: 35, // 메시지 이미지 크기 증가
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
    marginLeft: 10,
  },
  senderName: {
    fontSize: 14, // 폰트 크기 증가
    fontWeight: '600',
    color: '#555',
    marginLeft: 5,
    marginRight: 5,
  },
  messageBubble: {
    maxWidth: '80%', // 말풍선 최대 너비 증가
    borderRadius: 20, // 말풍선 라운드 조정
    paddingVertical: 10, // 패딩 증가
    paddingHorizontal: 15, // 패딩 증가
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#0095f6',
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#f1f1f1',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16, // 폰트 크기 유지 또는 약간 증가
    lineHeight: 22, // 라인 높이 조정
  },
  userMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTimestamp: {
    fontSize: 12, // 폰트 크기 증가
    color: '#888',
    marginTop: 4,
  },
  timestampLeft: {
    alignSelf: 'flex-start',
    marginLeft: 45, // 이미지 너비(35) + 마진(10)
  },
  timestampRight: {
    alignSelf: 'flex-end',
    marginRight: 45, // 이미지 너비(35) + 마진(10)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff0000',
    textAlign: 'center',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15, // 모달 컨테이너 라운드 증가
    padding: 25,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  modalInput: {
    height: 50, // 입력 필드 높이 증가
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10, // 입력 필드 라운드 증가
    paddingHorizontal: 15,
    fontSize: 16, // 폰트 크기 증가
    marginBottom: 25,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#ccc', // 취소 버튼 색상 변경
    paddingVertical: 12, // 버튼 패딩 증가
    borderRadius: 10, // 버튼 라운드 증가
    alignItems: 'center',
  },
  modalButtonSubmit: {
    flex: 1,
    backgroundColor: '#0095f6',
    paddingVertical: 12, // 버튼 패딩 증가
    borderRadius: 10, // 버튼 라운드 증가
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#fff',
    fontSize: 16, // 폰트 크기 증가
    fontWeight: '700',
  },
  modalButtonTextSubmit: {
    color: '#fff',
    fontSize: 16, // 폰트 크기 증가
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: '#7aaefc', // 버튼 비활성화 시 색상 변경
  },
  // 채팅창 로딩 인디케이터 스타일
  chatLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#f9f9f9',
  },
  chatLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
});

export default PersonaChat;
