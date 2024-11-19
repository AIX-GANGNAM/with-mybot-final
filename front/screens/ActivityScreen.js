import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  TouchableOpacity, 
  View, 
  ScrollView, 
  Text, 
  Platform, 
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ActivityScreen = ({ navigation }) => {
  console.log('ActivityScreen 실행');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  const db = getFirestore();
  const auth = getAuth();

  const getTimestamp = (firestoreTimestamp) => {
    if (!firestoreTimestamp) {
      return new Date();
    }
    if (firestoreTimestamp.toDate) {
      return firestoreTimestamp.toDate();
    }
    if (firestoreTimestamp instanceof Date) {
      return firestoreTimestamp;
    }
    if (firestoreTimestamp.seconds) {
      return new Date(firestoreTimestamp.seconds * 1000);
    }
    return new Date();
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString();
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

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchActivities = async () => {
      try {
        const friendRequestsQuery = query(
          collection(db, 'friendRequests'),
          where('toId', '==', auth.currentUser.uid),
          where('status', '==', 'pending')
        );

        const likesQuery = query(
          collection(db, 'likes'),
          where('toId', '==', auth.currentUser.uid),
          where('status', '==', 'unread')
        );

        const friendRequestsSnapshot = await getDocs(friendRequestsQuery);
        const friendRequestsPromises = friendRequestsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const userDoc = await getDoc(doc(db, 'users', data.fromId));
          const userData = userDoc.data() || {};
          
          return {
            id: docSnapshot.id,
            type: 'friendRequest',
            ...data,
            userId: userData.userId || '사용자',
            profileImg: userData.profileImg || null,
            timestamp: getTimestamp(data.timestamp)
          };
        });

        const likesSnapshot = await getDocs(likesQuery);
        const likesPromises = likesSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const userDoc = await getDoc(doc(db, 'users', data.fromId));
          const userData = userDoc.data() || {};
          
          return {
            id: docSnapshot.id,
            type: 'like',
            ...data,
            userId: userData.userId || '사용자',
            profileImg: userData.profileImg || null,
            timestamp: getTimestamp(data.timestamp)
          };
        });

        const [friendRequests, likes] = await Promise.all([
          Promise.all(friendRequestsPromises),
          Promise.all(likesPromises)
        ]);

        setActivities([...friendRequests, ...likes].sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ));
        
      } catch (error) {
        console.error('Error fetching activities:', error);
        Alert.alert('오류', '알림을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [auth.currentUser]);

  const handleAcceptFriendRequest = async (request) => {
    if (processingId) return;
    setProcessingId(request.id);

    try {
      const timestamp = serverTimestamp();

      await addDoc(collection(db, 'friends'), {
        userId: auth.currentUser.uid,
        friendId: request.fromId,
        createdAt: timestamp
      });

      await addDoc(collection(db, 'friends'), {
        userId: request.fromId,
        friendId: auth.currentUser.uid,
        createdAt: timestamp
      });

      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted',
        processedAt: timestamp
      });

      setActivities(prev => prev.filter(activity => activity.id !== request.id));
      Alert.alert('성공', '친구 요청을 수락했습니다.');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('오류', '친구 요청 수락 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectFriendRequest = async (request) => {
    if (processingId) return;
    setProcessingId(request.id);

    try {
      await deleteDoc(doc(db, 'friendRequests', request.id));
      setActivities(prev => prev.filter(activity => activity.id !== request.id));
      Alert.alert('성공', '친구 요청을 거절했습니다.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('오류', '친구 요청 거절 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleClearLike = async (like) => {
    try {
      await updateDoc(doc(db, 'likes', like.id), {
        status: 'read',
        readAt: serverTimestamp()
      });
      setActivities(prev => prev.filter(activity => activity.id !== like.id));
    } catch (error) {
      console.error('Error clearing like:', error);
      Alert.alert('오류', '알림 처리 중 오류가 발생했습니다.');
    }
  };

  const renderActivityItem = (activity) => {
    const isProcessing = processingId === activity.id;

    return (
      <View style={styles.activityItemContainer}>
        <View style={styles.activityItem}>
          {/* 프로필 이미지 */}
          <View style={styles.profileContainer}>
            {activity.profileImg ? (
              <Image source={{ uri: activity.profileImg }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <AntDesign name="user" size={20} color="#999" />
              </View>
            )}
            <View style={styles.activeIndicator} />
          </View>
          
          {/* 텍스트 영역 */}
          <View style={styles.textContainer}>
            <Text numberOfLines={1} style={styles.activityText}>
              <Text style={styles.userName}>{activity.userId}</Text>
              <Text style={styles.messageText}>
                {activity.type === 'friendRequest' 
                  ? '님이 친구 요청을 보냈습니다'
                  : '님이 회원님의 게시물을 좋아합니다'}
              </Text>
            </Text>
            <Text style={styles.timeText}>
              {formatDate(activity.timestamp)}
            </Text>
          </View>

          {/* 버튼 영역 */}
          {activity.type === 'friendRequest' ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptFriendRequest(activity)}
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
                onPress={() => handleRejectFriendRequest(activity)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <AntDesign name="close" size={14} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.likeContainer}
              onPress={() => handleClearLike(activity)}
            >
              <AntDesign name="heart" size={20} color="#000" style={styles.likeIcon} />
            </TouchableOpacity>
          )}
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
        <Text style={styles.headerTitle}>알림</Text>
		<Image 
    source={require('../assets/logo/mybot-logo.png')}
    style={styles.headerLogo}
  />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AntDesign name="notification" size={48} color="#DDD" />
            <Text style={styles.emptyText}>새로운 알림이 없습니다</Text>
          </View>
        ) : (
          activities.map(activity => (
            <View key={activity.id}>
              {renderActivityItem(activity)}
            </View>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
		justifyContent: 'space-between',
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
		width: 40,  // 추가
		alignItems: 'center',  // 추가
	  },
	  headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#000000',
		flex: 1,
		textAlign: 'center',
		marginLeft: -40,  // 백 버튼 너비만큼 보정
	  },
	  headerLogo: {  // 새로 추가
		width: 60,
		height: 60,
		resizeMode: 'contain',
	  },
	content: {
	  flex: 1,
	},
	activityItemContainer: {
	  paddingHorizontal: 16,
	  paddingVertical: 8,
	  backgroundColor: '#FFFFFF',
	},
	activityItem: {
	  flexDirection: 'row',
	  alignItems: 'center',
	  paddingVertical: 8,
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
	activityText: {
	  fontSize: 14,
	  lineHeight: 20,
	  color: '#000000',
	  marginBottom: 4,
	},
	userName: {
	  fontWeight: '600',
	  color: '#000000',
	},
	messageText: {
	  color: '#666666',
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
	likeContainer: {
	  width: 32,
	  height: 32,
	  borderRadius: 16,
	  justifyContent: 'center',
	  alignItems: 'center',
	  backgroundColor: '#F8F8F8',
	},
	likeIcon: {
	  marginLeft: 0,
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
	bottomPadding: {
	  height: 40,
	}
   });

export default ActivityScreen;