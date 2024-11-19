// Firebase 관련 모듈 import
const functions = require('firebase-functions');
const admin = require('firebase-admin');
// 알림 전송 기능 import
const sendNotificationToUser = require('./utils/SendNotification');

// Firebase Admin 초기화
admin.initializeApp();

// 1분마다 캘린더 일정 체크하는 함수
exports.checkCalendarSchedule = functions.pubsub
   .schedule('every 1 minutes')  // 1분 주기로 실행
   .timeZone('Asia/Seoul')      // 한국 시간대 설정
   .onRun(async (context) => {
     try {
       // 현재 시간 계산 (한국 시간)
       const now = new Date();
       const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));  // UTC+9 변환
       const currentHour = koreaTime.getHours();    // 현재 시간
       const currentMinute = koreaTime.getMinutes(); // 현재 분
       
       // Firestore에서 모든 캘린더 문서 가져오기
       const calendarSnapshot = await admin.firestore()
         .collection('calendar')
         .get();

       // 각 사용자의 캘린더 문서 순회
       for (const doc of calendarSnapshot.docs) {
         // 이벤트 목록 가져오기
         const events = doc.data().events;
         if (!events) continue;  // 이벤트가 없으면 다음 문서로

         // 각 이벤트 순회
         for (const event of Object.values(events)) {
           // 이벤트 시간 파싱
           const eventTime = new Date(event.time);
           const eventHour = eventTime.getHours();    // 이벤트 시간
           const eventMinute = eventTime.getMinutes(); // 이벤트 분

           // 현재 시간과 이벤트 시간이 일치하는지 확인
           if (currentHour === eventHour && currentMinute === eventMinute) {
             // 알림 전송
             await sendNotificationToUser(
               doc.id,        // targetUserUid: 알림을 받을 사용자 ID
               'System',      // fromUid: 시스템에서 보내는 알림
               'Calendar',    // inputScreenType: 캘린더 화면 타입
               '',           // URL: 추가 URL (필요한 경우 사용)
               event.title   // 이벤트 제목
             );
             // 알림 전송 로그
             console.log(`알림 전송 완료: ${doc.id}, 이벤트: ${event.title}`);
           }
         }
       }

       return null;  // 함수 정상 종료
     } catch (error) {
       // 에러 처리
       console.error('Schedule check error:', error);
       return null;
     }
   });