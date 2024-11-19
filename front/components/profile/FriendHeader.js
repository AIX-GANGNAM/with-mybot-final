import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FriendHeader = ({ onTabChange, activeTab }) => {
  const navigation = useNavigation();
  const [friendCount, setFriendCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    if (!auth.currentUser) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', auth.currentUser.uid)
    );

    const friendsUnsubscribe = onSnapshot(friendsQuery, (snapshot) => {
      setFriendCount(snapshot.size);
    });

    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('toId', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    );

    const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      setPendingRequests(snapshot.size);
    });

    return () => {
      friendsUnsubscribe();
      requestsUnsubscribe();
    };
  }, [auth.currentUser]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo/mybot-log-color.png')} 
            style={styles.logo}
          />
        </View>
        
        <TouchableOpacity 
  onPress={() => navigation.navigate('FriendRequests')} 
  style={styles.notificationButton}
>
  <View>
    <Ionicons name="notifications-outline" size={34} color="#000" />
    {pendingRequests > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{pendingRequests}</Text>
      </View>
    )}
  </View>
</TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          onPress={() => onTabChange('friends')} 
          style={[styles.tabButton, activeTab === 'friends' && styles.activeTabButton]}
        >
          <Text style={styles.tabText}>
            {friendCount} 친구
          </Text>
          {activeTab === 'friends' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onTabChange('ProfileSearch')} 
          style={[styles.tabButton, activeTab === 'ProfileSearch' && styles.activeTabButton]}
        >
          <Text style={styles.tabText}>친구찾기</Text>
          {activeTab === 'ProfileSearch' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,  // 로고 크기를 적절히 조절하세요
    height: 100,  // 로고 크기를 적절히 조절하세요
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 4,
  },
  notificationButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 24,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#536471',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#000',
    borderRadius: 3,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default FriendHeader;