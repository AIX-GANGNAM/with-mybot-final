import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, Text } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProfileInfo from '../components/profile/ProfileInfo';
import ProfileGallery from '../components/profile/ProfileGallery';
import ProfileHighlights from '../components/profile/ProfileHighlights';

const FriendProfileScreen = ({ route }) => {
  console.log('FriendProfileScreen 실행');
  const [userData, setUserData] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const { userId, userName, profileImg, mbti, friendId } = route.params;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 친구 관계 확인
        const friendsQuery = query(
          collection(db, 'friends'),
          where('userId', '==', auth.currentUser.uid),
          where('friendId', '==', userId)
        );
        const friendSnapshot = await getDocs(friendsQuery);
        setIsFriend(!friendSnapshot.empty);

        // 사용자 데이터 설정
        setUserData({
          uid: userId,
          profileImg: profileImg,
          userId: friendId,
          profile: {
            userName: userName,
            mbti: mbti
          }
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleMessage = async () => {
    try {
      // 채팅방 ID 생성 (두 사용자 ID를 정렬하여 일관된 ID 생성)
      const chatId = [auth.currentUser.uid, userId].sort().join('_');
      
      navigation.navigate('ChatUser', {
        chatId: chatId,
        recipientId: userId,
        recipientName: userData?.profile?.userName || 'Unknown User',
        profileImg: profileImg
      });
    } catch (error) {
      console.error('Error navigating to chat:', error);
    }
  };

  if (!userData) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileContainer}>
        <ProfileInfo 
          user={userData}
          showAddFriend={!isFriend}
          targetUserId={userId}
        />
        {isFriend && (
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>메시지 보내기</Text>
          </TouchableOpacity>
        )}
      </View>
      <ProfileHighlights/>
      <ProfileGallery user={userData} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
    backgroundColor: '#FFFFFF',
  },
  profileContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    paddingBottom: 16,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5271FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  }
});

export default FriendProfileScreen;