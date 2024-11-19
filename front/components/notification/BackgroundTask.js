// // import * as BackgroundFetch from 'expo-background-fetch';
// import * as TaskManager from 'expo-task-manager';
// import * as Notifications from 'expo-notifications';

// export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
//   try {
//     // 여기에 새로운 알림을 확인하는 로직을 구현하세요
//     const hasNewNotifications = await checkForNewNotifications();

//     if (hasNewNotifications) {
//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: "새로운 알림",
//           body: "백그라운드에서 확인된 새로운 알림이 있습니다.",
//         },
//         trigger: null,
//       });
//     }

//     return BackgroundFetch.BackgroundFetchResult.NewData;
    
//   } catch (error) {
//     console.error("Background task error:", error);
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// async function checkForNewNotifications() {
//   // 아마 여기에 fastapi백엔드에서, 알림이 저장된 firebase를 조회하는 로직을 하는 거 같다
//   // 여기에 서버에서 새로운 알림을 확인하는 로직을 구현하세요
//   // 예: const response = await fetch('your-api-endpoint');
//   // return response.hasNewNotifications;
//   return false; // 임시 반환값
// }

// export const setupBackgroundTask = async () => {
//   try {
//     // 기존 백그라운드 작업 등록 해제
//     await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
//     await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

//     // 새로운 백그라운드 작업 등록
//     await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
//       minimumInterval: 15 * 60, // 15분마다 실행 (최소 간격)
//       stopOnTerminate: true, // 앱이 종료되면 작업 중지
//       startOnBoot: true, // 기기 재시작 시 자동 시작
//     });

//     console.log('백그라운드 작업 등록 완료');
//   } catch (error) {
//     console.error('백그라운드 작업 등록 실패:', error);
//   }
// };
