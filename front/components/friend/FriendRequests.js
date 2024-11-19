import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
// Firebase 관련 기능 import - 중 복 제거 하고 하나로 통합
import { 
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getFirestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import sendNotificationToUser from '../notification/SendNotification';

const FriendRequests = ({ navigation }) => {  // navigation prop 추가
  console.log("FriendRequests.js 실행");
  // 상태 관리를 위한 state 선언
  const [requests, setRequests] = useState([]); // 친구 요청 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [processingId, setProcessingId] = useState(null); // 현재 처리 중인 요청 ID

  
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const fetchFriendRequests = async () => {
    console.log("fetchFriendRequests (친구 요청 목록 가져오기) 실행");
    if (!auth.currentUser) return; // 로그인 상태 확인

    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('toId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(requestsQuery);
      const requestPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const requestData = docSnapshot.data();
        const userDoc = await getDoc(doc(db, 'users', requestData.fromId));
        const userData = userDoc.data() || {};
        
        return {
          id: docSnapshot.id,
          ...requestData,
          userId: userData.userId || '사용자',
          profileImg: userData.profileImg || null,
          timestamp: requestData.timestamp || new Date()
        };
      });

      const requestsData = await Promise.all(requestPromises);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      Alert.alert('오류', '친구 요청을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request) => {
    if (processingId) return;
    setProcessingId(request.id);

    try {
      console.log("친구 요청 수락 처리 시작");
      console.log("request.fromId : ", request.fromId);
      // 양방향 친구 관계 생성 (현재 사용자 -> 요청 보낸 사용자)

      await addDoc(collection(db, 'friends'), {
        userId: auth.currentUser.uid,
        friendId: request.fromId,
        createdAt: new Date().toISOString()
      });
      // 친구 요청 수락 알림 보내기 (누구에게, 내가, 자세한 화면 위치, 화면 위치)
      sendNotificationToUser(request.fromId, auth.currentUser.uid, '', 'FriendAccept');

      // 양방향 친구 관계 생성 (요청 보낸 사용자 -> 현재 사용자)

      await addDoc(collection(db, 'friends'), {
        userId: request.fromId,
        friendId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted',
        processedAt: new Date().toISOString()
      });

      setRequests(prevRequests => 
        prevRequests.filter(req => req.id !== request.id)
      );

      Alert.alert('성공', '친구 요청을 수락했습니다.');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('오류', '친구 요청 수락 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (request) => {
    if (processingId) return;
    setProcessingId(request.id);

    try {
      console.log("친구 요청 거절 처리 시작");
      console.log("request.fromId : ", request.fromId);
      // 친구 요청 거절 알림 보내기 (누구에게, 내가, 자세한 화면 위치, 화면 위치)
      sendNotificationToUser(request.fromId, auth.currentUser.uid, '', 'FriendReject');
      // 친구 요청 문서 삭제
      await deleteDoc(doc(db, 'friendRequests', request.id));
      setRequests(prevRequests => 
        prevRequests.filter(req => req.id !== request.id)
      );
      Alert.alert('성공', '친구 요청을 거절했습니다.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('오류', '친구 요청 거절 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(date).toLocaleDateString();
    } else if (days > 0) {
      return `${days}일 전`;
    } else if (hours > 0) {
      return `${hours}시간 전`;
    } else if (minutes > 0) {
      return `${minutes}분 전`;
    } else {
      return '방금 전';
    }
  };

  const renderRequestItem = ({ item }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.requestItemContainer}>
        <View style={styles.requestItem}>
          {/* 프로필 이미지 */}
          <View style={styles.profileContainer}>
            {item.profileImg ? (
              <Image source={{ uri: item.profileImg }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <AntDesign name="user" size={20} color="#999" />
              </View>
            )}
            <View style={styles.activeIndicator} />
          </View>
          
          {/* 텍스트 영역 */}
          <View style={styles.textContainer}>
            <Text numberOfLines={1} style={styles.userName}>
              {item.userId}
            </Text>
            <Text style={styles.timeText}>
              {formatDate(item.timestamp)}
            </Text>
          </View>

          {/* 버튼 영역 */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptRequest(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <AntDesign name="check" size={14} color="#FFF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectRequest(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <AntDesign name="close" size={14} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <AntDesign name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>친구 요청</Text>
        <Image 
    source={require('../../assets/logo/mybot-logo.png')}
    style={styles.headerLogo}
  />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AntDesign name="usergroup-add" size={48} color="#DDD" />
          <Text style={styles.emptyText}>받은 친구 요청이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between', // 변경
  paddingHorizontal: 16,
  paddingVertical: 16,
  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: '#F5F5F5',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: {
      elevation: 3,
    },
  }),
},
backButton: {
  padding: 8,
  marginRight: 8,
  borderRadius: 20,
},
headerTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#000000',
  flex: 1, // 추가
  textAlign: 'center', // 추가
  marginLeft: -32, // 추가: 백 버튼의 공간만큼 왼쪽으로 이동
},
headerLogo: { // 새로 추가
  width: 60,
  height: 60,
  resizeMode: 'contain',
},

  content: {
    padding: 16,
  },
  requestItemContainer: {
    paddingVertical: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8F8',
  },
  profileImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#999999',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  acceptButton: {
    backgroundColor: '#000000',
  },
  rejectButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
});

export default FriendRequests;