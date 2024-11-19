import * as Notifications from 'expo-notifications';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import NowPushToken from './NowPushToken';

const UpdatePushToken = async (userId) => {
  console.log("UpdatePushToken.js 실행");
  console.log("같은 사용자가 여러 기기에 로그인을 하는 경우가 있기 떄문에 토큰을 배열로 관리")
  try {
    if (!userId) {
      console.log("사용자 ID가 제공되지 않았습니다");
      return null;
    }

    // 현재 토큰 가져오기
    const nowExpoPushToken = await NowPushToken();

    // Firestore 문서 참조 및 데이터 가져오기
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // 사용자 문서가 없는 경우 새로 생성
      await updateDoc(userRef, {
        pushTokens: [nowExpoPushToken]
      });
      return nowExpoPushToken;
    }

    const userData = userDoc.data();
    
    // 기존 단일 pushToken 필드가 있는지 확인하고 마이그레이션
    if (userData.pushToken && !userData.pushTokens) {
      console.log("기존 pushToken을 pushTokens 배열로 마이그레이션");
      const initialTokens = userData.pushToken ? [userData.pushToken] : [];
      await updateDoc(userRef, {
        pushTokens: initialTokens,
        pushToken: null  // 기존 필드 제거 또는 null로 설정
      });
    }

    // 기존 토큰 배열 가져오기 (마이그레이션 후)
    const updatedDoc = await getDoc(userRef);
    const pushTokens = updatedDoc.data().pushTokens || [];
    console.log("저장된 토큰들:", pushTokens);

    // 현재 토큰이 이미 존재하는지 확인
    if (!pushTokens.includes(nowExpoPushToken)) {
      console.log("새로운 토큰 추가");
      // arrayUnion을 사용하여 새로운 토큰을 배열에 추가
      await updateDoc(userRef, {
        pushTokens: arrayUnion(nowExpoPushToken)
      });
      console.log("토큰 추가 완료:", nowExpoPushToken);
    }

    // 토큰 유효성 검증 함수
    const validateToken = async (token) => {
      try {
        // 여기에 토큰 유효성 검증 로직 추가
        // 예: Expo의 토큰 유효성 체크 API 사용
        return true;
      } catch (e) {
        console.log("유효하지 않은 토큰:", token);
        return false;
      }
    };

    // 주기적으로 유효하지 않은 토큰 제거
    for (const token of pushTokens) {
      if (token !== nowExpoPushToken && !(await validateToken(token))) {
        await updateDoc(userRef, {
          pushTokens: arrayRemove(token)
        });
        console.log("유효하지 않은 토큰 제거:", token);
      }
    }

    return nowExpoPushToken;
  } catch (e) {
    console.error("UpdatePushToken > 토큰 처리 중 오류:", e);
    console.error("에러 상세:", e.message);
    return null;
  }
};

export default UpdatePushToken;