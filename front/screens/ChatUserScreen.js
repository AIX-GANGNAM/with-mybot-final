import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { checkUserOnlineStatus } from '../utils/presenceSystem';

import sendNotificationToUser from '../components/notification/SendNotification';

// 네비게이션 프로필 친구 친구리스트 메시지 보내기 누르면 나오는곳
const ChatUserScreen = ({ route, navigation }) => {
  console.log('ChatUserScreen 실행');
  console.log("ChatUserScreen 호출"); // 실제 회원 <-> 실제 회원 // if 사용자가 
   const { 
    chatId, // 채팅방 고유
    recipientId, 
    recipientName = 'Unknown User',
    profileImg 
  } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector(state => state.user.user);
  const flatListRef = useRef(null);
  const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5분

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const chatRef = doc(db, 'chat', chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists()) {
          // 채팅방 생성
          await setDoc(chatRef, {
            info: {
              participants: [currentUser.uid, recipientId],
              createdAt: new Date(),
              lastMessage: '',
              lastMessageTime: new Date(),
              lastSenderId: ''
            }
          });
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
  }, [chatId, currentUser.uid, recipientId]);

  useEffect(() => {
    // 메시지 실시간 리스닝
    const q = query(
      collection(db, `chat/${chatId}/messages`), 
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);


  const sendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    const messageToSend = inputMessage;
    setInputMessage(''); // 즉시 입력창 초기화

    try {
        const isRecipientOnline = await checkUserOnlineStatus(recipientId);

        console.log('isRecipientOnline:', isRecipientOnline);
        
        const messageData = {
            text: messageToSend,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp(),
            isRead: false
        };

        if (isRecipientOnline) {
            // 사용자가 온라인인 경우 - Firestore에 직접 저장
            const messagesRef = collection(db, `chat/${chatId}/messages`);
            const response =await addDoc(messagesRef, messageData);
            console.log("온라인 일 때, firevase에 대화 저장 후 반환 값:", response);
            const sendNotificationResponse = sendNotificationToUser(recipientId, currentUser.uid, 'ChatUserScreen', chatId);
            console.log('sendNotificationResponse : ', sendNotificationResponse);

            // 채팅방 정보 업데이트
            const chatRef = doc(db, 'chat', chatId);
            await updateDoc(chatRef, {
                'info.lastMessage': messageToSend,
                'info.lastMessageTime': serverTimestamp(),
                'info.lastSenderId': currentUser.uid
            });
        } else {
            // 사용자가 오프라인인 경우 - 서버로 전송
            const serverMessageData = {
                message: messageToSend,
                senderId: currentUser.uid,
                recipientId: recipientId,
                chatId: chatId,
                timestamp: new Date().toISOString(),
                isRead: false,
                senderName: currentUser.displayName || '',
                senderProfileImage: currentUser.photoURL || ''
            };
            
            console.log('서버로 보내는 데이터:', serverMessageData);
            
            const response = await axios.post('http://localhost:8000/clone-chat', serverMessageData);
            
            if (response.status !== 200) {
                throw new Error('메시지 전송 실패');
            }
            else {
              console.log("서버로 보내는 데이터 전송 성공:", response);
              // 알림 보내기 (누구에게, 내가, 어떤 화면, 화면의 정확한 위치)
              sendNotificationToUser(currentUser.uid,"clone", "ChatUserScreen", chatId); // 이건 나에게 보내기
              sendNotificationToUser(recipientId,currentUser.uid, "ChatUserScreen", chatId); // 이건 상대방에게 보내기
            }
        }

    } catch (error) {
        console.error('메시지 전송 실패:', error);
        if (error.response) {
            console.error('에러 응답:', error.response.data);
        }
        alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    // Firestore Timestamp 객체인 경우
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Date 객체인 경우
    if (timestamp instanceof Date) {
      return timestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    // timestamp가 숫자(밀리초)인 경우
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    return '';
  };

  const renderMessage = ({ item, index }) => {
    const isAIMessage = item.isAI;
    
    const currentTime = item.timestamp ? formatTime(item.timestamp) : '';
    const previousTime = index > 0 && messages[index - 1].timestamp ? 
      formatTime(messages[index - 1].timestamp) : '';

    return (
      <View key={item.id}>
        {(index === 0 || currentTime !== previousTime) && currentTime ? (
          <Text style={styles.timeStamp}>{currentTime}</Text>
        ) : null}
        <View style={[
          styles.messageBubble,
          item.senderId === currentUser.uid ? styles.userMessage : styles.otherMessage,
          isAIMessage && styles.aiMessage
        ]}>
          {isAIMessage && (
            <Text style={styles.aiLabel}>AI 응답</Text>
          )}
          <Text style={[
            styles.messageText,
            isAIMessage ? styles.aiMessageText : 
            item.senderId === currentUser.uid ? styles.userMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0095f6" />;
  }

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
          <TouchableOpacity style={styles.profileContainer}>
            <Image 
              source={{ uri: profileImg || 'default_image_url' }} 
              style={styles.profileImage} 
            />
            <Text style={styles.headerTitle}>{recipientName}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            onLayout={() => flatListRef.current?.scrollToEnd()}
          />
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="메시지 보내기..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          {inputMessage.length > 0 ? (
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
  chatContainer: {
    flex: 1,
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
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 20,
  },
  aiMessage: {
    backgroundColor: '#E8F5E9',
  },
  aiMessageText: {
    color: '#000',
  },
  aiLabel: {
    fontSize: 10,
    color: '#4CAF50',
    marginBottom: 4,
  }
});

export default ChatUserScreen;