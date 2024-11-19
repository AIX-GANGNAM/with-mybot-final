import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet  
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NewChat = () => {
  const [friends, setFriends] = useState([]);
  const [displayedFriends, setDisplayedFriends] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({});
  const auth = getAuth();
  const db = getFirestore();
  const navigation = useNavigation();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'friends'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const friendPromises = snapshot.docs.map(async (docSnapshot) => {
          const friendData = docSnapshot.data();
          
          try {
            const userDoc = await getDoc(doc(db, 'users', friendData.friendId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const isOnline = await checkOnlineStatus(friendData.friendId);
              setOnlineStatus(prev => ({
                ...prev,
                [friendData.friendId]: isOnline
              }));
              
              return {
                id: docSnapshot.id,
                userName: userData.profile?.userName || '이름 없음',
                profileImg: userData.profileImg || null,
                friendId: friendData.friendId,
                userId: userData.userId,
                profile: userData.profile,
                isFavorite: friendData.isFavorite || false,
                lastActivity: userData.lastActivity || null,
                ...friendData
              };
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          return null;
        });

        let friendsData = (await Promise.all(friendPromises)).filter(friend => friend !== null);
        
        // 최근 대화 정보로 정렬
        friendsData = await getRecentChats(friendsData);
        
        // 즐겨찾기 우선 정렬
        friendsData = sortFriends(friendsData);
        
        setFriends(friendsData);
      } catch (error) {
        console.error('Error processing friends data:', error);
        Alert.alert('오류', '친구 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    });

    // 온라인 상태 주기적 업데이트 (1분마다)
    const onlineStatusInterval = setInterval(() => {
      friends.forEach(async friend => {
        const isOnline = await checkOnlineStatus(friend.friendId);
        setOnlineStatus(prev => ({
          ...prev,
          [friend.friendId]: isOnline
        }));
      });
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(onlineStatusInterval);
    };
  }, [auth.currentUser]);

  useEffect(() => {
    const filtered = search
      ? friends.filter(friend =>
          friend.userName.toLowerCase().includes(search.toLowerCase())
        )
      : friends;
    setDisplayedFriends(showAll ? filtered : filtered.slice(0, 10));
  }, [friends, search, showAll]);

  const checkOnlineStatus = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      if (!userData?.lastActivity) return false;
      
      const lastActivity = userData.lastActivity.toDate();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return lastActivity > fiveMinutesAgo;
    } catch (error) {
      console.error('Error checking online status:', error);
      return false;
    }
  };

  const getRecentChats = async (friendsData) => {
    try {
      const chatRef = collection(db, 'chat');
      const q = query(
        chatRef,
        where('info.participants', 'array-contains', auth.currentUser.uid),
        orderBy('info.lastMessageTime', 'desc')
      );
      
      const chatsSnapshot = await getDocs(q);
      const recentChats = new Map(); // using Map to store lastMessageTime
      
      chatsSnapshot.docs.forEach(doc => {
        const chatData = doc.data();
        const otherParticipant = chatData.info.participants.find(
          p => p !== auth.currentUser.uid
        );
        recentChats.set(otherParticipant, chatData.info.lastMessageTime);
      });
      
      return friendsData.sort((a, b) => {
        const aTime = recentChats.get(a.friendId);
        const bTime = recentChats.get(b.friendId);
        if (aTime && !bTime) return -1;
        if (!aTime && bTime) return 1;
        if (aTime && bTime) {
          return bTime.seconds - aTime.seconds;
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting recent chats:', error);
      return friendsData;
    }
  };

  const toggleFavorite = async (friendId) => {
    try {
      const friendDoc = friends.find(f => f.id === friendId);
      if (!friendDoc) return;

      await updateDoc(doc(db, 'friends', friendId), {
        isFavorite: !friendDoc.isFavorite
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('오류', '즐겨찾기 설정 중 오류가 발생했습니다.');
    }
  };

  const sortFriends = (friendsData) => {
    return [...friendsData].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });
  };

  const toggleFriendSelection = (friendId) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const startChat = async (friend) => {
    try {
      if (isGroupMode) {
        toggleFriendSelection(friend.friendId);
        return;
      }

      const chatRef = collection(db, 'chat');
      const q = query(
        chatRef,
        where('info.participants', 'array-contains', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      let existingChat = null;
      querySnapshot.docs.forEach(doc => {
        const chatData = doc.data();
        if (!chatData.info.isGroup && chatData.info.participants.includes(friend.friendId)) {
          existingChat = { id: doc.id, ...chatData };
        }
      });

      if (existingChat) {
        navigation.navigate('ChatUser', {
          chatId: existingChat.id,
          recipientId: friend.friendId,
          recipientName: friend.userName,
          profileImg: friend.profileImg
        });
      } else {
        const newChatRef = await addDoc(collection(db, 'chat'), {
          info: {
            participants: [auth.currentUser.uid, friend.friendId],
            isGroup: false,
            lastMessage: '',
            lastMessageTime: serverTimestamp(),
            createdAt: serverTimestamp()
          }
        });

        navigation.navigate('ChatUser', {
          chatId: newChatRef.id,
          recipientId: friend.friendId,
          recipientName: friend.userName,
          profileImg: friend.profileImg
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('오류', '채팅방을 만드는 중 오류가 발생했습니다.');
    }
  };

  const createGroupChat = async () => {
    if (selectedFriends.size < 2) {
      Alert.alert('알림', '그룹 채팅은 2명 이상의 친구를 선택해야 합니다.');
      return;
    }

    try {
      const participants = [...selectedFriends, auth.currentUser.uid];
      const selectedFriendsData = friends.filter(friend => 
        selectedFriends.has(friend.friendId)
      );
      
      const groupName = selectedFriendsData
        .map(friend => friend.userName)
        .join(', ')
        .slice(0, 20) + (selectedFriendsData.length > 2 ? '...' : '');

      const newGroupChatRef = await addDoc(collection(db, 'chat'), {
        info: {
          participants,
          isGroup: true,
          groupName,
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp()
        }
      });

      setIsGroupMode(false);
      setSelectedFriends(new Set());
      
      navigation.navigate('ChatUser', {
        chatId: newGroupChatRef.id,
        isGroup: true,
        groupName
      });
    } catch (error) {
      console.error('Error creating group chat:', error);
      Alert.alert('오류', '그룹 채팅방을 만드는 중 오류가 발생했습니다.');
    }
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.friendItem,
        isGroupMode && selectedFriends.has(item.friendId) && styles.selectedFriend
      ]}
      onPress={() => startChat(item)}
    >
      <View style={styles.avatarContainer}>
        {item.profileImg ? (
          <Image 
            source={{ uri: item.profileImg }} 
            style={styles.profileImage} 
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Ionicons name="person" size={24} color="#A0A0A0" />
          </View>
        )}
        {onlineStatus[item.friendId] && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.friendInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.friendName}>{item.userName}</Text>
          {item.isFavorite && (
            <Ionicons name="star" size={16} color="#FFD700" style={styles.favoriteIcon} />
          )}
        </View>
        {item.profile?.mbti && (
          <Text style={styles.mbti}>{item.profile.mbti}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => toggleFavorite(item.id)}
      >
        <Ionicons 
          name={item.isFavorite ? "star" : "star-outline"} 
          size={24} 
          color={item.isFavorite ? "#FFD700" : "#8e8e8e"} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (isGroupMode) {
            setIsGroupMode(false);
            setSelectedFriends(new Set());
          } else {
            navigation.goBack();
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#262626" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {isGroupMode ? '그룹 채팅 만들기' : '새로운 메시지'}
      </Text>
      <TouchableOpacity
        style={styles.groupButton}
        onPress={() => {
          if (isGroupMode) {
            createGroupChat();
          } else {
            setIsGroupMode(true);
          }
        }}
      >
        <Ionicons 
          name={isGroupMode ? "checkmark" : "people"} 
          size={24} 
          color="#5271ff" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8e8e8e" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="친구 검색"
          placeholderTextColor="#8e8e8e"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5271ff" />
          <Text style={styles.loadingText}>친구 목록을 불러오는 중...</Text>
        </View>
      ) : friends.length > 0 ? (
        <FlatList
          data={displayedFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            friends.length > 10 && !showAll ? (
              <TouchableOpacity 
                style={styles.showMoreButton}
                onPress={() => setShowAll(true)}
              >
                <Text style={styles.showMoreText}>
                  +더보기 ({friends.length - 10}명)
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#A0A0A0" />
          <Text style={styles.emptyText}>아직 친구가 없습니다.</Text>
          <Text style={styles.emptySubText}>친구찾기 탭에서 새로운 친구를 찾아보세요!</Text>
        </View>
      )}
    </View>
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
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#efefef',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#262626',
      flex: 1,
      textAlign: 'center',
    },
    backButton: {
      padding: 8,
    },
    groupButton: {
      padding: 8,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: '#f1f1f1',
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      height: 40,
      color: '#262626',
    },
    listContainer: {
      padding: 16,
    },
    friendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#EFEFEF',
    },
    selectedFriend: {
      backgroundColor: '#E3EAFD',
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 16,
    },
    profileImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    profileImagePlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#F8F9FA',
      justifyContent: 'center',
      alignItems: 'center',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#4CAF50',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    friendInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    friendName: {
      fontSize: 16,
      color: '#1A1A1A',
      fontWeight: '500',
      marginRight: 8,
    },
    favoriteIcon: {
      marginLeft: 4,
    },
    mbti: {
      fontSize: 14,
      color: '#536471',
      marginTop: 2,
    },
    actionButton: {
      padding: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#5271ff',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1A1A1A',
      marginVertical: 8,
    },
    emptySubText: {
      fontSize: 14,
      color: '#6C757D',
      textAlign: 'center',
    },
    showMoreButton: {
      alignItems: 'center',
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: '#EFEFEF',
      marginTop: 8,
    },
    showMoreText: {
      fontSize: 14,
      color: '#5271ff',
      fontWeight: '600',
    },
    recentIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#5271ff',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    recentText: {
      color: '#FFFFFF',
      fontSize: 12,
    }
  });
export default NewChat;