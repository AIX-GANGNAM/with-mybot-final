import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

const clearAllNotifications = async () => {
  console.log("ClearAllNotifications.js 실행");
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log("로그인된 사용자가 없습니다. 알림을 삭제할 수 없습니다.");
      return;
    }

    const userEmail = currentUser.email;

    // 모든 AsyncStorage 키 가져오기
    const allKeys = await AsyncStorage.getAllKeys();

    // 현재 사용자의 알림 키만 필터링
    const userNotificationKeys = allKeys.filter(key => key.startsWith(`${userEmail}_`));

    if (userNotificationKeys.length === 0) {
      console.log("삭제할 알림이 없습니다.");
      return;
    }

    // 필터링된 키에 해당하는 모든 항목 삭제
    await AsyncStorage.multiRemove(userNotificationKeys);

    console.log("모든 알림이 성공적으로 삭제되었습니다.");
    setNotificationList([]);
  } catch (error) {
    console.error("알림 삭제 중 오류 발생:", error);
  }
};

export default clearAllNotifications;
