import { getFirestore, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import NowPushToken from './NowPushToken';

const RemovePushToken = async (userId) => {
  console.log("RemovePushToken.js 실행");
  console.log("userId:", userId);
  try {
    if (!userId) {
      console.log("사용자 ID가 제공되지 않았습니다");
      return false;
    }

    // 현재 기기의 토큰 가져오기
    const currentToken = await NowPushToken();
    console.log("제거할 현재 기기 토큰:", currentToken);

    // Firestore 문서 참조 및 데이터 가져오기
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log("사용자 문서가 존재하지 않습니다");
      return false;
    }

    const userData = userDoc.data();
    
    // 기존 단일 pushToken이 있는 경우에 대한 처리
    if (userData.pushToken) {
      // 기존 토큰이 현재 토큰과 일치하면 제거
      if (userData.pushToken === currentToken) {
        await updateDoc(userRef, {
          pushToken: null,
          pushTokens: []
        });
        console.log("기존 단일 토큰 제거 완료");
        return true;
      }
    }
    
    // pushTokens 배열에서 현재 토큰 제거
    const pushTokens = userData.pushTokens || [];
    if (pushTokens.includes(currentToken)) {
      console.log("토큰 배열에서 현재 토큰 제거 시작");
      
      // arrayRemove를 사용하여 현재 기기의 토큰만 제거
      await updateDoc(userRef, {
        pushTokens: arrayRemove(currentToken)
      });
      
      console.log("토큰 제거 완료");
      return true;
    }

    console.log("제거할 토큰을 찾을 수 없습니다");
    return false;

  } catch (e) {
    console.error("RemoveDeviceToken > 토큰 제거 중 오류:", e);
    console.error("에러 상세:", e.message);
    return false;
  }
};

export default RemovePushToken;