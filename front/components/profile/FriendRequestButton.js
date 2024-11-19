import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FriendRequestButton = ({ targetUserId }) => {
 const [isRequesting, setIsRequesting] = useState(false);
 const [requestStatus, setRequestStatus] = useState('none'); // none, pending, friends
 const db = getFirestore();
 const auth = getAuth();

 useEffect(() => {
   if (!targetUserId || !auth.currentUser) return;

   // 친구 상태 실시간 감시
   const friendsQuery = query(
     collection(db, 'friends'),
     where('userId', '==', auth.currentUser.uid),
     where('friendId', '==', targetUserId)
   );

   const friendsUnsubscribe = onSnapshot(friendsQuery, (snapshot) => {
     if (!snapshot.empty) {
       setRequestStatus('friends');
       return;
     }

     // 친구 요청 상태 실시간 감시
     const requestQuery = query(
       collection(db, 'friendRequests'),
       where('fromId', '==', auth.currentUser.uid),
       where('toId', '==', targetUserId),
       where('status', '==', 'pending')
     );

     const requestUnsubscribe = onSnapshot(requestQuery, (snapshot) => {
       setRequestStatus(snapshot.empty ? 'none' : 'pending');
     });

     return () => requestUnsubscribe();
   });

   return () => friendsUnsubscribe();
 }, [targetUserId]);

 const handleAddFriend = async () => {
   if (requestStatus !== 'none' || isRequesting) return;

   try {
     setIsRequesting(true);
     const currentUser = auth.currentUser;
     
     await addDoc(collection(db, 'friendRequests'), {
       fromId: currentUser.uid,
       toId: targetUserId,
       status: 'pending',
       timestamp: new Date().toISOString(),
       fromUserName: currentUser.displayName || '',
       fromUserPhoto: currentUser.photoURL || ''
     });
     
     Alert.alert('성공', '친구 요청을 보냈습니다.');
   } catch (error) {
     console.error('Error adding friend:', error);
     Alert.alert('오류', '친구 요청 중 오류가 발생했습니다.');
   } finally {
     setIsRequesting(false);
   }
 };

 const getButtonContent = () => {
   switch (requestStatus) {
     case 'friends':
       return (
         <View style={styles.disabledButton}>
           <Text style={styles.disabledButtonText}>친구</Text>
         </View>
       );
     case 'pending':
       return (
         <View style={styles.disabledButton}>
           <Text style={styles.disabledButtonText}>요청됨</Text>
         </View>
       );
     default:
       return (
         <TouchableOpacity 
           style={[styles.addFriendButton, isRequesting && styles.requestingButton]}
           onPress={handleAddFriend}
           disabled={isRequesting}
         >
           {isRequesting ? (
             <ActivityIndicator color="#FFFFFF" size="small" />
           ) : (
             <Text style={styles.addFriendButtonText}>친구 추가</Text>
           )}
         </TouchableOpacity>
       );
   }
 };

 return getButtonContent();
};

const styles = StyleSheet.create({
 addFriendButton: {
   backgroundColor: '#5271ff',
   padding: 10,
   borderRadius: 20,
   alignItems: 'center',
   marginTop: 16,
   minWidth: 100,
 },
 requestingButton: {
   opacity: 0.7,
 },
 disabledButton: {
   backgroundColor: '#E0E0E0',
   padding: 10,
   borderRadius: 20,
   alignItems: 'center',
   marginTop: 16,
   minWidth: 100,
 },
 addFriendButtonText: {
   color: '#FFFFFF',
   fontSize: 16,
   fontWeight: '600',
 },
 disabledButtonText: {
   color: '#666666',
   fontSize: 16,
   fontWeight: '600',
 },
});

export default FriendRequestButton;