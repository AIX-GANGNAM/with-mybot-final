import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import FriendRequestButton from './FriendRequestButton';

const ProfileInfo = ({ user, showAddFriend, targetUserId }) => {
 const [postsCount, setPostsCount] = useState(0);
 const [friendsCount, setFriendsCount] = useState(0);
 const db = getFirestore();
 const navigation = useNavigation();
 const auth = getAuth();

 useEffect(() => {
   if (!user?.uid) return;

   // 게시물 수 실시간 감시
   const postsQuery = query(
     collection(db, 'feeds'),
     where('userId', '==', user.uid)
   );

   const postsUnsubscribe = onSnapshot(postsQuery, (snapshot) => {
     setPostsCount(snapshot.size);
   });

   // 친구 수 실시간 감시
   const friendsQuery = query(
     collection(db, 'friends'),
     where('userId', '==', user.uid)
   );

   const friendsUnsubscribe = onSnapshot(friendsQuery, (snapshot) => {
     setFriendsCount(snapshot.size);
   });

   return () => {
     postsUnsubscribe();
     friendsUnsubscribe();
   };
 }, [user]);

 const handleFriendPress = () => {
   if (user.uid === auth.currentUser.uid) {
     navigation.navigate('FriendHeader');
   }
 };

 return (
   <View style={styles.container}>
     <View style={styles.topSection}>
       <View style={styles.profileImageContainer}>
         {user.profileImg ? (
           <Image 
             source={{ uri: user.profileImg }} 
             style={styles.profileImage} 
           />
         ) : (
           <View style={styles.placeholderImage}>
             <Ionicons name="person" size={40} color="#A0A0A0" />
           </View>
         )}
       </View>
       
       <View style={styles.statsContainer}>
         <View style={styles.statItem}>
           <Text style={styles.statNumber}>{postsCount}</Text>
           <Text style={styles.statLabel}>게시물</Text>
         </View>
         <TouchableOpacity 
           style={styles.statItem} 
           onPress={handleFriendPress}
         >
           <Text style={styles.statNumber}>{friendsCount}</Text>
           <Text style={styles.statLabel}>친구</Text>
         </TouchableOpacity>
       </View>
     </View>

     <View style={styles.infoSection}>
       <Text style={styles.name}>{user?.profile?.userName || '이름 없음'}</Text>
       
       <View style={styles.detailsContainer}>
         {user?.profile?.mbti && (
           <View style={styles.detailItem}>
             <Ionicons name="star-outline" size={16} color="#4A90E2" />
             <Text style={styles.detailText}>{user.profile.mbti}</Text>
           </View>
         )}
         {user?.profile?.personality && (
           <View style={styles.detailItem}>
             <Ionicons name="heart-outline" size={16} color="#4A90E2" />
             <Text style={styles.detailText}>{user.profile.personality}</Text>
           </View>
         )}
       </View>

       {showAddFriend && <FriendRequestButton targetUserId={targetUserId} />}
     </View>
   </View>
 );
};

const styles = StyleSheet.create({
 container: {
   padding: 16,
 },
 topSection: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   marginBottom: 20,
 },
 profileImageContainer: {
   marginRight: 20,
 },
 profileImage: {
   width: 86,
   height: 86,
   borderRadius: 43,
   borderWidth: 3,
   borderColor: '#4A90E2',
 },
 placeholderImage: {
   width: 86,
   height: 86,
   borderRadius: 43,
   backgroundColor: '#F8F9FA',
   justifyContent: 'center',
   alignItems: 'center',
 },
 statsContainer: {
   flex: 1,
   flexDirection: 'row',
   justifyContent: 'space-around',
 },
 statItem: {
   alignItems: 'center',
 },
 statNumber: {
   fontSize: 20,
   fontWeight: '700',
   color: '#1A1A1A',
 },
 statLabel: {
   fontSize: 14,
   color: '#6C757D',
   marginTop: 4,
 },
 infoSection: {
   marginTop: 4,
 },
 name: {
   fontSize: 18,
   fontWeight: '700',
   color: '#1A1A1A',
   marginBottom: 12,
 },
 detailsContainer: {
   flexDirection: 'row',
   flexWrap: 'wrap',
   marginTop: 8,
 },
 detailItem: {
   flexDirection: 'row',
   alignItems: 'center',
   backgroundColor: '#F8F9FA',
   paddingVertical: 6,
   paddingHorizontal: 12,
   borderRadius: 20,
   marginRight: 8,
   marginBottom: 8,
 },
 detailText: {
   marginLeft: 6,
   fontSize: 14,
   color: '#4A90E2',
 }
});

export default ProfileInfo;