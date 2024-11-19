import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, BackHandler, TouchableOpacity, Modal, Animated, Alert, Platform, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getFirestore, collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';

import Header from '../components/home/Header';
import ProfileHighlights from '../components/profile/ProfileHighlights';
import Post from '../components/home/Post';

const HomeScreen = () => {
  console.log('HomeScreen 실행');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const user = useSelector((state) => state.user.user);
  const [slideAnimation] = useState(new Animated.Value(0));
  const [isModalVisible, setModalVisible] = useState(false);

  const navigation = useNavigation();
  const db = getFirestore();
  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    if (!user.profile?.mbti) {
      console.log('mbti 없음');
      setModalVisible(true);
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [user, slideAnimation]);

  const handleLater = () => {
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const handleInputNow = () => {
    handleLater();
    navigation.navigate('UserInfoStep1');
  };

  const fetchPosts = useCallback(async (isLoadingMore = false) => {
    if (!user?.uid || (!isLoadingMore && isLoading)) return;

    try {
      if (!isLoadingMore) {
        setIsLoading(true);
      }

      // 1. 친구 목록 가져오기
      const friendsRef = collection(db, 'friends');
      const friendsQuery = query(friendsRef, where('userId', '==', user.uid));
      const friendsSnapshot = await getDocs(friendsQuery);
      const friendIds = friendsSnapshot.docs.map(doc => doc.data().friendId);
      
      // 검색할 ID 목록에 자신의 ID도 포함
      const searchIds = [user.uid, ...friendIds];

      // 2. 피드 쿼리 생성
      let feedQuery;
      if (isLoadingMore && lastVisible) {
        feedQuery = query(
          collection(db, 'feeds'),
          where('userId', 'in', searchIds),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(POSTS_PER_PAGE)
        );
      } else {
        feedQuery = query(
          collection(db, 'feeds'),
          where('userId', 'in', searchIds),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE)
        );
      }

      const feedSnapshot = await getDocs(feedQuery);
      
      // 마지막 문서 저장
      const lastVisibleDoc = feedSnapshot.docs[feedSnapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      
      // 더 불러올 게시물이 있는지 확인
      setHasMorePosts(feedSnapshot.docs.length === POSTS_PER_PAGE);

      const newPosts = feedSnapshot.docs.map(doc => ({
        folderId: doc.id,
        ...doc.data()
      }));

      if (isLoadingMore) {
        setPosts(prevPosts => [...prevPosts, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
    } catch (error) {
      console.error('포스트 데이터 가져오기 실패:', error);
      Alert.alert('오류', '포스트를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, lastVisible]);

  const loadMorePosts = async () => {
    if (!hasMorePosts || isLoadingMore) return;
    
    setIsLoadingMore(true);
    await fetchPosts(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMorePosts(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLastVisible(null);
      setHasMorePosts(true);
      fetchPosts();
    }, [])
  );

  useEffect(() => {
    if (user?.uid) {
      setLastVisible(null);
      setHasMorePosts(true);
      fetchPosts();
    }
  }, [user]);

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#D2691E" />
        <Text style={styles.loadingText}>더 많은 게시물 불러오는 중...</Text>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.highlightsContainer}>
      <ProfileHighlights />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <Post post={item} navigation={navigation} />
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={renderFooter}
        keyExtractor={(item) => item.folderId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        stickyHeaderIndices={[]}
      />
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={handleLater}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: slideAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.modalTitle}>AI 분신 맞춤 설정</Text>
            <Text style={styles.modalText}>
              당신의 성향과 가치관을 반영하여{'\n'}
              더 진정성 있는 AI 분신을 만들어보세요.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={handleLater}>
                <Text style={styles.buttonText}>나중에 하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleInputNow}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  지금 설정하기
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
    backgroundColor: '#fff',
  },
  highlightsContainer: {
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#FFF5E6',
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    height: '40%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#8B4513',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#A0522D',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D2691E',
    width: '48%',
  },
  buttonText: {
    color: '#D2691E',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#D2691E',
  },
  primaryButtonText: {
    color: 'white',
  },
  loadingFooter: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  }
});

export default HomeScreen;