import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  getFirestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Header = () => {
  console.log("home > Header.js > 호출됨");
  const navigation = useNavigation();
  const [notificationCount, setNotificationCount] = useState(0);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    if (!auth.currentUser) return;

    try {
      // 친구 요청 쿼리
      const friendRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('toId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );

      // 좋아요 알림 쿼리
      const likesQuery = query(
        collection(db, 'likes'),
        where('toId', '==', auth.currentUser.uid),
        where('status', '==', 'unread')
      );

      // 실시간 리스너 설정
      const unsubscribeFriendRequests = onSnapshot(friendRequestsQuery, (snapshot) => {
        const friendRequestCount = snapshot.docs.length;
        updateTotalCount(friendRequestCount, 'friendRequests');
      }, (error) => {
        console.log("Friend requests listener error:", error);
      });

      const unsubscribeLikes = onSnapshot(likesQuery, (snapshot) => {
        const likesCount = snapshot.docs.length;
        updateTotalCount(likesCount, 'likes');
      }, (error) => {
        console.log("Likes listener error:", error);
      });

      // 클린업 함수
      return () => {
        unsubscribeFriendRequests();
        unsubscribeLikes();
      };
    } catch (error) {
      console.log("Error setting up listeners:", error);
    }
  }, [auth.currentUser]);

  // 알림 카운트를 개별적으로 관리
  const [counts, setCounts] = useState({
    friendRequests: 0,
    likes: 0
  });

  // 개별 카운트 업데이트 함수
  const updateTotalCount = (count, type) => {
    setCounts(prev => ({
      ...prev,
      [type]: count
    }));
  };

  // 전체 알림 카운트 계산
  useEffect(() => {
    const total = counts.friendRequests + counts.likes;
    setNotificationCount(total);
  }, [counts]);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Image 
          style={styles.logo} 
          source={require('../../assets/logo/logo-color.png')}
        />
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => navigation.navigate('CreatePersona')}
        >
          <Ionicons name="add-circle-outline" size={26} color="#1A1A1A" />
        </TouchableOpacity>

        <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => navigation.navigate('Activity')}
      >
        <Ionicons name="notifications-outline" size={26} color="#1A1A1A" />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        )}
      </TouchableOpacity>

        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => navigation.navigate('ChatList')}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    marginTop: 10,
    height: 32,
    width: 100,
    resizeMode: 'contain',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    padding: 6,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginRight: 10,
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#FF3250',
    borderRadius: 100,
    left: 20,
    bottom: 22,
    height: 22,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  badgeText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 10,
  },
});

export default Header;