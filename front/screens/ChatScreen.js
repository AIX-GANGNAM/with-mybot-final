import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, addDoc } from "firebase/firestore";
import { useSelector } from 'react-redux';
import axios from 'axios';
//메인 화면에서 채팅방으로 이동하는곳
const db = getFirestore();

const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

const ChatScreen = ({ route, navigation }) => {
  console.log('ChatScreen 실행');
  const { highlightTitle, highlightImage, persona } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();

  const user = useSelector(state => state.user.user);
  const userPersona = user.persona.find(p => p.Name === persona);

  const testNetworkConfig = async () => {
    // 1. HTTP 통신 테스트 - 네트워크 보안 설정 확인
    try {
      const response = await axios.get('http://httpstat.us/200');
      if (response.status === 200) {
        console.log("Network security config 적용됨: HTTP 요청 성공");
      } else {
        console.log("HTTP 요청 실패:", response.status);
      }
    } catch (error) {
      console.error("HTTP 요청 실패 - network_security_config 미적용 가능성:", {
        message: error.message,
        config: error.config,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        } : null,
      });
    }
  
    // 2. Base URL 설정 로깅
    const isRunningInADB = Boolean(global.isRunningInADB); // adb 디버깅 여부 확인
    const baseURL = Platform.select({
      ios: 'http://192.168.0.229:8000',
      android: 'http://192.168.0.229:8000',
      default: isRunningInADB ? 'http://10.0.2.2:8000' : 'http://localhost:8000'
    });
    console.log("testNetworkConfig baseURL:", baseURL, "| ADB 디버깅 상태:", isRunningInADB);
  
    // 3. 엔드포인트에 연결 시도
    try {
      const response = await axios.get(`${baseURL}/v2/networkcheck`, {
        timeout: 5000, // 타임아웃 설정 (필요 시 조정)
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
  
      // 요청 성공 여부 확인
      if (response.data && response.data.status === "success") {
        console.log("endpoint 호출 성공:", {
          data: response.data,
          status: response.status,
          headers: response.headers
        });
      } else {
        console.log("endpoint 호출 실패 - 서버에서 성공 응답을 받지 못함:", {
          data: response.data,
          status: response.status
        });
      }
    } catch (error) {
      console.error("endpoint 호출 실패 - network_security_config 미적용 가능성:", {
        message: error.message,
        config: error.config,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        } : null,
      });
    }
  };



  useEffect(() => {
    // 네트워크 통신 설정 확인
    testNetworkConfig();
  }, []);
  

  useEffect(() => {
    loadChatHistory(user.uid, persona);
  }, [user.uid, persona]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const loadChatHistory = (uid, personaName, limitCount = 50) => {
    const chatRef = collection(db, "chats", uid, "personas", personaName, "messages");
    const q = query(
      chatRef,
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    onSnapshot(q, (snapshot) => {
      const loadedMessages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        let timestamp = new Date();
        if (data.timestamp) {
          if (typeof data.timestamp.toDate === 'function') {
            timestamp = data.timestamp.toDate();
          } else {
            timestamp = new Date(data.timestamp);
          }
        }

        loadedMessages.push({
          id: doc.id,
          text: data.text || data.message,
          sender: data.sender === 'user' ? 'user' : 'other',
          timestamp: timestamp
        });
      });

      setMessages(loadedMessages.sort((a, b) => a.timestamp - b.timestamp));
    });
  };

  const sendMessage = async () => {
    console.log("sendMessage 실행하고 있어요");
    if (inputText.trim().length > 0) {
      const userMessage = {
        text: inputText,
        sender: 'user',
        timestamp: new Date()
      };

      try {
        // Firestore 경로 수정: "chats/{uid}/personas/{persona}/messages"
        const chatRef = collection(db, "chats", user.uid, "personas", persona, "messages");
        await addDoc(chatRef, userMessage);

        setInputText('');
        setIsTyping(true);


         // Platform과 ADB 디버깅 여부에 따른 URL 설정
       const isRunningInADB = Boolean(global.isRunningInADB); // adb 디버깅 여부 확인
       const baseURL = Platform.select({
         ios: 'http://localhost:8000',
         android: 'http://192.168.0.229:8000',
         default: isRunningInADB ? 'http://10.0.2.2:8000' : 'http://localhost:8000'
       });
       console.log("sendMessage 함수 baseURL", baseURL);


        // 백엔드에 메시지 전송
        const response = await axios.post(`${baseURL}/v2/chat`,  {
          persona_name: userPersona.Name,
          user_input: inputText, // 백엔드가 'input' 필드를 기대함
          uid: user.uid ,// 백엔드가 'uid'를 기대함
          tone: userPersona.tone,
          example: userPersona.example,
          description: userPersona.description
        },
        {
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        },);

        if (response.data && response.data.response) {
          const botResponse = {
            text: response.data.response,
            sender: 'other', // persona_name이 아닌 'other'로 설정
            timestamp: new Date()
          };
          // Firestore에 봇 응답 메시지 저장
          await addDoc(chatRef, botResponse);
        }
      } catch (error) {
        console.error('sendMessage 에러 발생:', {
          message: error.message,
          code: error.code,
          config: error.config,
          response: error.response ? {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          } : null,
        });
      } finally {
        setIsTyping(false);
      }
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }) => (
    <View key={item.id}>
      {index === 0 || formatTime(item.timestamp) !== formatTime(messages[index - 1].timestamp) ? (
        <Text style={styles.timeStamp}>{formatTime(item.timestamp)}</Text>
      ) : null}
      <View style={[styles.messageBubble, item.sender === 'user' ? styles.userMessage : styles.otherMessage]}>
        <Text style={[styles.messageText, item.sender === 'user' ? styles.userMessageText : styles.otherMessageText]}>{item.text}</Text>
      </View>
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageBubble, styles.otherMessage]}>
      <View style={styles.typingContainer}>
        <View style={[styles.typingDot, styles.typingDot1]} />
        <View style={[styles.typingDot, styles.typingDot2]} />
        <View style={[styles.typingDot, styles.typingDot3]} />
      </View>
    </View>
  );

  const renderLoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="small" color="#0095f6" />
      <Text style={styles.loadingText}>응답을 작성 중입니다...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('PersonaProfile', {
                persona: {
                  title: highlightTitle,
                  image: highlightImage,
                  interests: [],
                  persona: persona,
                },
                userId: user.uid
              })
            }
            style={styles.profileContainer}
          >
            <Image source={{ uri: highlightImage }} style={styles.profileImage} />
            <Text style={styles.headerTitle}>{highlightTitle}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
          />
          {isTyping && renderTypingIndicator()}
          {isTyping && renderLoadingOverlay()}
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지 보내기..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          {inputText.length > 0 ? (
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={24} color="#0095f6" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic-outline" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 25,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginRight: 10,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageList: {
    paddingVertical: 10,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 20,
    marginVertical: 2,
    marginHorizontal: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0095f6',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  timeStamp: {
    alignSelf: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 10,
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cameraButton: {
    marginRight: 10,
    padding: 5,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginHorizontal: 8,
  },
  sendButton: {
    padding: 5,
    marginLeft: 5,
  },
  micButton: {
    padding: 5,
    marginLeft: 5,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    width: 60,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginHorizontal: 2,
    opacity: 0.6,
  },
  typingDot1: {
    animationName: 'bounce',
    animationDuration: '0.6s',
    animationDelay: '0s',
    animationIterationCount: 'infinite',
  },
  typingDot2: {
    animationName: 'bounce',
    animationDuration: '0.6s',
    animationDelay: '0.2s',
    animationIterationCount: 'infinite',
  },
  typingDot3: {
    animationName: 'bounce',
    animationDuration: '0.6s',
    animationDelay: '0.4s',
    animationIterationCount: 'infinite',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

// 애니메이션 키프레임 정의 (React Native Animated API로 구현 필요)
const bounceKeyframes = {
  '0%, 100%': {
    transform: [{ translateY: 0 }],
  },
  '50%': {
    transform: [{ translateY: -5 }],
  },
};

export default ChatScreen;
