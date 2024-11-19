import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getFirestore, collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

const DebateChat = ({ route, navigation }) => {
  console.log('DebateChat 실행');
  const { debateId, title = '토론', personaName = '' } = route?.params || {};
  const [messages, setMessages] = useState([]);
  const [debateInfo, setDebateInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef();
  const auth = getAuth();
  const db = getFirestore();
  
  const user = useSelector(state => state.user.user);
  // personas 객체 수정
  const getPersonaInfo = (speakerType) => {
    // user.persona 배열에서 해당하는 페르소나 찾기
    const personaData = user.persona.find(p => p.Name === speakerType);
    
    const defaultColors = {
      Joy: '#FFD93D',
      Anger: '#FF6B6B',
      Sadness: '#4DABF7',
      custom: '#5271FF',
      clone: '#69DB7C',
      Moderator: '#868E96'
    };

    if (!personaData) {
      return {
        name: '진행자',
        color: defaultColors.Moderator,
        image: null,
        dpname: '진행자'
      };
    }

    return {
      name: personaData.DPNAME,
      color: defaultColors[speakerType],
      image: personaData.IMG || null, // 이미지가 없을 경우 null
      dpname: personaData.DPNAME
    };
  };

  useEffect(() => {
    console.log('DebateChat params:', route?.params);
    const currentUser = auth.currentUser;
    if (!currentUser || !debateId) {
      console.error('Required params missing:', { currentUser, debateId });
      navigation.goBack();
      return;
    }

    // 토론 정보 가져오기 (personachat/{uid}/debates/{debateId})
    const debateRef = doc(db, 'personachat', currentUser.uid, 'debates', debateId);
    const unsubscribeDebate = onSnapshot(debateRef, (doc) => {
      if (doc.exists()) {
        console.log('Debate data:', doc.data());
        setDebateInfo(doc.data());
      } else {
        console.error('No debate found:', debateId);
      }
    });

    // 메시지 가져오기 (personachat/{uid}/debates/{debateId}/messages)
    const messagesRef = collection(db, 'personachat', currentUser.uid, 'debates', debateId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        speaker: doc.data().speaker,
        speakerName: doc.data().speakerName,
        text: doc.data().text,
        messageType: doc.data().messageType,
        timestamp: doc.data().timestamp?.toDate()
      }));
      console.log('Messages loaded:', messageList.length);
      setMessages(messageList);
      setLoading(false);
    });

    return () => {
      unsubscribeDebate();
      unsubscribeMessages();
    };
  }, [debateId]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <View style={styles.headerTitle}>
        <Text style={styles.headerText}>{debateInfo?.title || '토론'}</Text>
        <Text style={styles.headerStatus}>
          {debateInfo?.status === 'completed' ? '종료된 토론' : '진행 중인 토론'}
        </Text>
      </View>
      <View style={styles.headerRight} />
    </View>
  );

  // renderMessage 함수 수정
  const renderMessage = ({ item }) => {
    const personaInfo = getPersonaInfo(item.speaker);
    const isModeratorMessage = item.speaker === 'Moderator';

    if (isModeratorMessage) {
      return (
        <View style={styles.moderatorContainer}>
          <View style={styles.moderatorContent}>
            <Icon name="chatbubbles" size={24} color="#868E96" />
            <Text style={styles.moderatorText}>{item.text}</Text>
          </View>
          <Text style={styles.timestamp}>
            {item.timestamp?.toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.messageContainer}>
        <View style={styles.messageSender}>
          <View style={[styles.personaIcon, { backgroundColor: personaInfo.color }]}>
            {personaInfo.image ? (
              <Image 
                source={{ uri: personaInfo.image }} 
                style={styles.personaImage}
              />
            ) : (
              <Text style={styles.personaEmoji}>
                {item.speaker === 'custom' ? '👤' : '🎭'}
              </Text>
            )}
          </View>
          <Text style={styles.senderName}>{personaInfo.dpname}</Text>
        </View>
        <View style={[styles.messageBubble, { borderLeftColor: personaInfo.color }]}>
          <Text style={styles.messageText}>{item.text}</Text>
          {item.messageType === 'analysis' && (
            <View style={styles.analysisTag}>
              <Text style={styles.analysisTagText}>분석</Text>
            </View>
          )}
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp?.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0095f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
      />
      {debateInfo?.status === 'completed' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>토론 결과</Text>
          <View style={styles.resultContent}>
            <Text style={styles.resultWinner}>
              최종 선택: {getPersonaInfo(debateInfo.selectedPersona)?.name || '알 수 없음'}
            </Text>
            <Text style={styles.resultMessage}>{debateInfo.finalComment}</Text>
            <Text style={styles.resultReason}>{debateInfo.reason}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 24,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageSender: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  personaImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  personaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden', // 이미지가 둥근 모서리를 벗어나지 않도록
  },
  personaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  personaEmoji: {
    fontSize: 18,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageBubble: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    marginLeft: 40,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 40,
  },
  moderatorContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  moderatorContent: {
    backgroundColor: '#f1f3f5',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 16,
  },
  moderatorText: {
    fontSize: 13,
    color: '#495057',
  },
  analysisTag: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  analysisTagText: {
    fontSize: 12,
    color: '#495057',
  },
  resultContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#efefef',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  resultWinner: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  resultReason: {
    fontSize: 13,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DebateChat;