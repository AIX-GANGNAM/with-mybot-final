import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Firebase Firestore 초기화
const db = getFirestore();

export const getUserUidByUserId = async (userId) => {
  console.log('GetOtherUserUidByUserId > getUserUidByUserId > userId : ', userId);
  try {
    // Firestore의 'users' 컬렉션에서 userId가 일치하는 문서 검색
    const userQuery = query(
      collection(db, 'users'),
      where('userId', '==', userId) // userId 필드가 일치하는 문서 찾기
    );

    // 쿼리 실행 및 결과 가져오기
    const querySnapshot = await getDocs(userQuery);

    // 문서가 존재하면 uid를 반환
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]; // 첫 번째 일치 문서
      const uid = userDoc.data().uid;
      console.log('GetOtherUserUidByUserId > getUserUidByUserId > uid : ', uid);
      return uid;
    } else {
      console.log('User not found with the given userId.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching uid:', error);
    return null;
  }
};

export default getUserUidByUserId;