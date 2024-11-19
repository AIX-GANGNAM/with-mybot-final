import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, FlatList, Image, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getFirestore, collection, query as fbQuery, where, getDocs, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import  sendNotificationToUser  from '../notification/SendNotification';

const FriendSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('id');
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();
  const db = getFirestore();
  const navigation = useNavigation();

  // debounce 함수 구현
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // handleSearch 함수를 useCallback으로 메모이제이션
  const handleSearch = useCallback(async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      let results = [];
      const currentUser = auth.currentUser;

      if (searchType === 'id') {
        // 아이디로 검색
        const idQueryRef = fbQuery(
          collection(db, 'users'),
          where('userId', '>=', searchText.toLowerCase()),
          where('userId', '<=', searchText.toLowerCase() + '\uf8ff')
        );
        const idSnapshot = await getDocs(idQueryRef);
        
        // 이름으로 검색
        const nameQueryRef = fbQuery(
          collection(db, 'users'),
          where('profile.userName', '>=', searchText),
          where('profile.userName', '<=', searchText + '\uf8ff')
        );
        const nameSnapshot = await getDocs(nameQueryRef);

        // 결과 합치기
        const combinedResults = new Map();
        
        idSnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) {
            combinedResults.set(doc.id, {
              id: doc.id,
              ...doc.data()
            });
          }
        });

        nameSnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) {
            combinedResults.set(doc.id, {
              id: doc.id,
              ...doc.data()
            });
          }
        });

        results = Array.from(combinedResults.values());
      } else {
        // MBTI로 검색
        const mbtiQueryRef = fbQuery(
          collection(db, 'users'),
          where('profile.mbti', '>=', searchText.toUpperCase()),
          where('profile.mbti', '<=', searchText.toUpperCase() + '\uf8ff')
        );
        const mbtiSnapshot = await getDocs(mbtiQueryRef);
        results = mbtiSnapshot.docs
          .filter(doc => doc.id !== currentUser.uid)
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
      }
      
      // 친구 목록 가져오기
      const friendsQueryRef = fbQuery(
        collection(db, 'friends'),
        where('userId', '==', currentUser.uid)
      );
      const friendsSnapshot = await getDocs(friendsQueryRef);
      const friendIds = new Set(friendsSnapshot.docs.map(doc => doc.data().friendId));
      
      // 친구 상태 표시하기
      results = results.map(user => ({
        ...user,
        isFriend: friendIds.has(user.id)
      }));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('검색 오류', '사용자 검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [searchType, auth.currentUser, db]);

  // debounced search 함수 생성
  const debouncedSearch = useCallback(
    debounce((query) => handleSearch(query), 300),
    [handleSearch]
  );

  // searchQuery가 변경될 때마다 검색 실행
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleAddFriend = async (userId) => {
    try {
      const currentUser = auth.currentUser;
      
      // 이미 친구 요청을 보냈는지 확인
      const requestQuery = fbQuery(
        collection(db, 'friendRequests'),
        where('fromId', '==', currentUser.uid),
        where('toId', '==', userId)
      );
      const requestSnapshot = await getDocs(requestQuery);
      
      if (!requestSnapshot.empty) {
        Alert.alert('알림', '이미 친구 요청을 보냈습니다.');
        return;
      }

      // 친구 요청 보내기
      await addDoc(collection(db, 'friendRequests'), {
        fromId: currentUser.uid,
        toId: userId,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      const reponse=sendNotificationToUser(userId, currentUser.uid, 'FriendRequest', '');
      console.log('친구요청 알람결과 > reponse : ', reponse);
      Alert.alert('성공', '친구 요청을 보냈습니다.');
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('오류', '친구 요청 중 오류가 발생했습니다.');
    }
  };

  const handleProfilePress = (userData) => {
    navigation.navigate('FriendProfile', {
      userId: userData.id,
      userName: userData.profile?.userName,
      userProfile: userData.profile,
      profileImg: userData.profileImg,
      mbti: userData.profile?.mbti,
      friendId: userData.userId
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#536471" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchType === 'id' ? "아이디 또는 이름으로 검색" : "MBTI로 검색"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize={searchType === 'mbti' ? "characters" : "none"}
        />
        {isLoading && (
          <ActivityIndicator size="small" color="#536471" style={styles.loadingIndicator} />
        )}
      </View>

      <View style={styles.searchTypeContainer}>
        <TouchableOpacity 
          style={[styles.typeButton, searchType === 'id' && styles.activeType]}
          onPress={() => setSearchType('id')}
        >
          <Text style={[styles.typeText, searchType === 'id' && styles.activeTypeText]}>
            아이디/이름
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, searchType === 'mbti' && styles.activeType]}
          onPress={() => setSearchType('mbti')}
        >
          <Text style={[styles.typeText, searchType === 'mbti' && styles.activeTypeText]}>
            MBTI
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={searchResults}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userItem}
            onPress={() => handleProfilePress(item)}
          >
            <View style={styles.profileSection}>
              <Image 
                source={item.profileImg 
                  ? { uri: item.profileImg } 
                  : require('../../assets/logo/mybot-log-color.png')
                }
                style={styles.profileImage} 
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {item.profile?.userName || '이름 없음'}
                </Text>
                <Text style={styles.userId}>@{item.userId}</Text>
                {item.profile?.mbti && (
                  <Text style={styles.mbti}>{item.profile.mbti}</Text>
                )}
              </View>
            </View>
            
            {!item.isFriend && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAddFriend(item.id)}
              >
                <Text style={styles.addButtonText}>친구 신청</Text>
              </TouchableOpacity>
            )}
            {item.isFriend && (
              <View style={styles.friendBadge}>
                <Text style={styles.friendBadgeText}>친구</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? '검색 결과가 없습니다.' : '새로운 친구를 찾아보세요'}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  typeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },
  activeType: {
    backgroundColor: '#000',
  },
  typeText: {
    fontSize: 14,
    color: '#536471',
  },
  activeTypeText: {
    color: '#FFFFFF',
  },
  listContainer: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  userId: {
    fontSize: 14,
    color: '#536471',
    marginBottom: 2,
  },
  mbti: {
    fontSize: 14,
    color: '#536471',
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#000',
    marginLeft: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  friendBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EFEFEF',
    marginLeft: 12,
  },
  friendBadgeText: {
    color: '#536471',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#536471',
    textAlign: 'center',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
});

export default FriendSearch;