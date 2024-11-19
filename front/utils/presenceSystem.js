import { db } from '../firebaseConfig';
import { doc, onDisconnect, set, serverTimestamp, getDoc } from 'firebase/firestore';

export const initializePresence = async (userId) => {
  if (!userId) return;

  const userStatusRef = doc(db, 'status', userId);
  
  // 온라인 상태 설정
  const isOnlineData = {
    state: 'online',
    lastSeen: serverTimestamp(),
  };

  // 오프라인 상태 설정
  const isOfflineData = {
    state: 'offline',
    lastSeen: serverTimestamp(),
  };

  // 연결이 끊어졌을 때 오프라인으로 상태 변경
  await onDisconnect(userStatusRef).set(isOfflineData);

  // 현재 온라인 상태로 설정
  await set(userStatusRef, isOnlineData);
};

export const checkUserOnlineStatus = async (userId) => {
  try {
    const userStatusRef = doc(db, 'status', userId);
    const statusSnap = await getDoc(userStatusRef);
    
    if (statusSnap.exists()) {
      const status = statusSnap.data();
      return status.state === 'online';
    }
    return false;
  } catch (error) {
    console.error('상태 확인 실패:', error);
    return false;
  }
}; 