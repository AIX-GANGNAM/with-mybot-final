import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, SectionList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import moment from 'moment';

const ActivityFeed = ({ navigation }) => {
  console.log("ActivityFeed.js > 호출됨");
  const [activitySections, setActivitySections] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("로그인된 사용자가 없습니다.");
        return;
      }

      const userEmail = currentUser.email;
      const pushTypes = ['friend', 'like', 'comment', 'PLAYGROUND'];
      let allNotifications = [];

      for (const pushType of pushTypes) {
        const storageKey = `${userEmail}_${pushType}`;
        const storedNotifications = await AsyncStorage.getItem(storageKey);
        if (storedNotifications) {
          allNotifications = [...allNotifications, ...JSON.parse(storedNotifications)];
        }
      }

      // 날짜순으로 정렬
      allNotifications.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

      // 날짜별로 분류
      const now = moment();
      const sections = [
        { title: 'Now', data: [] },
        { title: 'Previous', data: [] },
        { title: 'This Week', data: [] },
        { title: 'This Month', data: [] },
        { title: 'Yesterday', data: [] },
      ];

      allNotifications.forEach(notification => {
        const notificationDate = moment(notification.receivedAt);
        const diffMinutes = now.diff(notificationDate, 'minutes');
        const diffDays = now.diff(notificationDate, 'days');

        if (diffMinutes < 60) {
          sections[0].data.push(notification);
        } else if (diffDays === 0) {
          sections[1].data.push(notification);
        } else if (diffDays === 1) {
          sections[4].data.push(notification);
        } else if (now.isSame(notificationDate, 'week')) {
          sections[2].data.push(notification);
        } else if (now.isSame(notificationDate, 'month')) {
          sections[3].data.push(notification);
        }
      });

      // 빈 섹션 제거
      const filteredSections = sections.filter(section => section.data.length > 0);

      setActivitySections(filteredSections);
    } catch (error) {
      console.error("알림 로드 중 오류 발생:", error);
    }
  };

  const renderNotification = ({ item }) => {
    const { content } = item.request;
    const { pushType, whoSendMessage, highlightImage } = content.data;

    return (
      <View style={styles.notificationItem}>
        <Image
          source={{ uri: highlightImage }}
          style={styles.profileImage}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{getNotificationMessage(pushType, whoSendMessage)}</Text>
          <Text style={styles.notificationTime}>{moment(item.receivedAt).fromNow()}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleNotificationAction(pushType, item)}
        >
          <Text style={styles.actionButtonText}>보기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getNotificationMessage = (pushType, whoSendMessage) => {
    switch (pushType) {
      case 'friend':
        return `${whoSendMessage}님이 친구 요청을 보냈습니다.`;
      case 'FRIEND_REJECT':
        return `${whoSendMessage}님이 친구 요청을 거절했습니다.`;
      case 'FRIEND_ACCEPT':
        return `${whoSendMessage}님이 친구 요청을 수락했습니다.`;
      case 'PLAYGROUND':
        return `${whoSendMessage}님이 회원님을 팔로우하기 시작했습니다.`;
      default:
        return '새로운 알림이 있습니다.';
    }
  };

  const handleNotificationAction = (pushType, item) => {
    switch (pushType) {
      case 'friend':
        navigation.navigate('FriendProfile', { name: item.content.data.whoSendMessage });
        break;
      case 'like':
      case 'comment':
        navigation.navigate('Post', { postId: item.content.data.postId });
        break;
      case 'follow':
        navigation.navigate('Profile', { userId: item.content.data.userId });
        break;
      default:
        console.log('알 수 없는 알림 유형');
    }
  };

  return (
    <SectionList
      sections={activitySections}
      keyExtractor={(item, index) => item.id + index}
      renderItem={renderNotification}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
    />
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
  },
  notificationTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#3493D9',
    padding: 8,
    borderRadius: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
  },
});

export default ActivityFeed;
