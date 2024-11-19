import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

const loadNotifications = async (type) => {
  console.log("LoadNotifications.js 실행");
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log("로그인된 사용자가 없습니다. 알림을 불러올 수 없습니다.");
      return [];
    }

    const userEmail = currentUser.email;
    const storageKey = `${userEmail}_${type}`;

    // 저장된 알림 목록 가져오기
    const storedNotifications = await AsyncStorage.getItem(storageKey);
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];

    console.log(`${type} 알림 목록을 불러왔습니다:`, notifications);
    return notifications;
  } catch (error) {
    console.error(`${type} 알림 로드 실패:`, error);
    return [];
  }
}

export default loadNotifications;
