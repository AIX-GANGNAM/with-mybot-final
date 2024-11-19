import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);

const analytics = getAnalytics(app);
const storage = getStorage(app);

/**
 * 사용자 프로필 생성 및 pushTokens 업데이트 함수
 * @param {object} user - Firebase 인증 사용자 객체
 * @param {object} additionalData - 추가 사용자 데이터
 * @param {string} pushToken - 디바이스에서 가져온 PushToken
 */
const createUserProfile = async (user, additionalData, pushToken) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  // 사용자 문서가 존재하지 않는 경우 새로 생성
  if (!snapshot.exists()) {
    const { email } = user;
    const createdAt = new Date();

    try {
      await setDoc(userRef, {
        email,
        createdAt,
        uid: user.uid,
        pushTokens: pushToken ? [pushToken] : [], // pushToken 배열 생성
        ...additionalData,
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  } else {
    // 사용자 문서가 이미 존재하는 경우 pushToken 추가
    try {
      if (pushToken) {
        console.log("이미 사용자가 있음, pushToken 추가",pushToken);
        await updateDoc(userRef, {
          pushTokens: arrayUnion(pushToken), // 중복 없이 pushToken 추가
        });
      }
    } catch (error) {
      console.error('Error updating pushTokens:', error);
    }
  }

  return userRef;
};

export { auth, db, createUserProfile, storage, analytics };
export default app;