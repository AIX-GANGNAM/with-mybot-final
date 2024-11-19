import axios from 'axios';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';  // 정확한 경로로 수정해주세요

const findProfileImageByFromUid = async (fromUid) => {
  console.log("보내는 사람의 대표 이미지 찾기");
  const userDocRef = doc(db, 'users', fromUid);
  const userDoc = await getDoc(userDocRef);
  switch(fromUid){
    case 'custom':
      console.log('findProfileImageByFromUid > Custom : ', userDoc.data().persona[0].IMG);
      return userDoc.data().persona[0].IMG;
    case 'clone':
      console.log('findProfileImageByFromUid > Clone : ', userDoc.data().persona[1].IMG);
      return userDoc.data().persona[1].IMG;
    case 'joy':
      console.log('findProfileImageByFromUid > Joy : ', userDoc.data().persona[2].IMG);
      return userDoc.data().persona[2].IMG;
    case 'anger':
      console.log('findProfileImageByFromUid > Anger : ', userDoc.data().persona[3].IMG);
      return userDoc.data().persona[3].IMG;
    case 'sadness':
      console.log('findProfileImageByFromUid > Sadness : ', userDoc.data().persona[4].IMG);
      return userDoc.data().persona[4].IMG;
    
  }
  const profileImage = userDoc.data()?.profileImg;
  if(!profileImage){
    return 'https://example.com/default-image.jpg'; // 기본 이미지
  }
  console.log('findProfileImageByFromUid > profileImage : ', profileImage);
  return profileImage;
}

const findUserDisplayNameFromUid = async (fromUid ) => {  
  const userDocRef = doc(db, 'users', fromUid);
  const userDoc = await getDoc(userDocRef);
  console.log('findUserDisplayNameFromUid > fromUid : ', fromUid);
  if(fromUid === 'System'){ // 시스템이 알람을 보낼 때 ex) 이미지 생성 완료, 피드 생성 완료, 친구 요청 수락 등등
    return '시스템';
  }
  if(['joy', 'anger', 'sadness'].includes(fromUid)){ // 페르소나가 알람을 보낼 때
    return fromUid;
  }
  if(fromUid === 'clone'){ // 클론이 알람을 보낼 때
    return userDoc.data().persona[0].DPNAME;
  }
  if(fromUid === 'custom'){ // 커스텀이 알람을 보낼 때
    return userDoc.data().persona[1].DPNAME;
  }

  try {
    const userDocRef = doc(db, 'users', fromUid);
    const userDoc = await getDoc(userDocRef);
    console.log('findUserDisplayNameFromUid > userDoc : ', userDoc);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const displayName = userData.displayName || '알 수 없는 사용자';
      console.log('findUserDisplayNameFromUid > displayName : ', displayName);
      return displayName;
    }
    return '알 수 없는 사용자';
  } catch (error) {
    console.error('Error fetching user displayName:', error);
    return '알 수 없는 사용자';
  }
};

// 알림 타입별 메시지 포맷 정의
const SCREEN_TYPES = {
  Playground: {
    type: 'Playground',
    getMessage: () => `이미지 생성을 완료했습니다.`
  },
  Like: {
    type: 'Like',
    getMessage: (data) => `${data.userName}님이 회원님의 게시물을 좋아합니다.`
  },
  FriendRequest: {
    type: 'FriendRequest',
    getMessage: (data) => `${data.userName}님이 친구 요청을 보냈습니다.`
  },
  FriendAccept: {
    type: 'FriendAccept',
    getMessage: (data) => `${data.userName}님이 친구 요청을 수락했습니다.`
  },
  FriendReject: {
    type: 'FriendReject',
    getMessage: (data) => `${data.userName}님이 친구 요청을 거절했습니다.`
  },
  PersonaChat: {
    type: 'PersonaChat',
    getMessage: (data) => `${data.userName}님이 새로운 메시지를 보냈습니다: ${data.message}`
  },
  PostComment: {
    type: 'PostComment',
    getMessage: (data) => `${data.userName}님이 회원님의 게시물에 댓글을 남겼습니다.`
  },
  ChatUserScreen: {
    type: 'ChatUserScreen',
    getMessage: (data) => `${data.userName}님이 새로운 메시지를 보냈습니다: ${data.message}`
  },
  CompletedGeneratePersona: {
    type: 'CompletedGeneratePersona',
    getMessage: (data) => `${data.userName}님이 페르소나를 생성했습니다.`
  },
  Calendar:{
    type: 'Calendar',
    getMessage: () => `새로운 일정을 추가했습니다`  
  },
};

// (누구에게, 누가, 어떤 화면, 어떤 URL)
// 특정 유저에게 알림 보내기
const sendNotificationToUser = async (targetUserUid, fromUid, inputScreenType, URL) => {
  console.log('sendNotificationToUser > targetUserUid : ', targetUserUid);
  console.log('sendNotificationToUser > fromUid : ', fromUid);
  try {
    const whoSendMessage = await findUserDisplayNameFromUid(fromUid); // 내가 상대방에게 알람을 보내는데, 상대방에게 표시되는 내 이름
    const profileImage = await findProfileImageByFromUid(fromUid); // 내 프로필 이미지
    console.log('sendNotificationToUser > whoSendMessage : ', whoSendMessage);

    if (!targetUserUid || !whoSendMessage) {
      throw new Error('targetUserUid 또는 whoSendMessage가 없습니다.');
    }

    const screenType = SCREEN_TYPES[inputScreenType];
    console.log('sendNotificationToUser > screenType : ', screenType);
    if (!screenType) {
      throw new Error(`잘못된 화면 타입입니다 : ${inputScreenType}`);
    }

    // 서버 모델과 정확히 일치하는 데이터 구조
    const requestData = {
      targetUid: targetUserUid,
      fromUid: fromUid,
      whoSendMessage: whoSendMessage,
      profileImage: profileImage,
      message: screenType.getMessage({ userName: whoSendMessage }),
      screenType: screenType.type,
      URL: URL || '없음'
    };

    console.log('전송 데이터 확인:', requestData);

    // 모든 필드가 존재하는지 확인
    const requiredFields = ['targetUid', 'fromUid', 'whoSendMessage', 'message', 'screenType', 'URL'];
    for (const field of requiredFields) {
      if (!requestData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    console.log('targetUserUid : ', targetUserUid);
    console.log('fromUid : ', fromUid);
    const response = await axios.post(
      'http://192.168.0.229:8000/notification', 
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;

  } catch (error) {
    if (error.response) {
      console.error('서버 에러 응답:', {
        status: error.response.status,
        data: error.response.data,
        detail: error.response.data.detail
      });
    }
    throw error;
  }
};

export default sendNotificationToUser;