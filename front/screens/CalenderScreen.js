import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, Platform, StatusBar, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios'; // axios 추가
import { useSelector } from 'react-redux'; // redux useSelector 추가
import sendNotificationToUser from '../components/notification/SendNotification';

const CalendarScreen = () => {
  console.log('CalendarScreen 실행');
  const [schedule, setSchedule] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', time: new Date() });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;
  const reduxUser = useSelector((state) => state.user.user); // redux user 정보 가져오기

  const fetchSchedule = async () => {
    if (user) {
      const userRef = doc(db, 'calendar', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setSchedule(userDoc.data().events || []);
      }
    }
  };

  // 화면에 진입할 때마다 스케줄을 불러옴
  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [user])
  );

  const addEvent = async () => {
    if (newEvent.title.trim() === '') {
      Alert.alert('오류', '유효한 일정 제목을 입력하세요.');
      return;
    }

    const event = { ...newEvent, date: selectedDate, starred: false };
    setSchedule([...schedule, event]);
    setNewEvent({ title: '', time: new Date() });
    setModalVisible(false);

    if (user) {
      const userRef = doc(db, 'calendar', user.uid);
      await updateDoc(userRef, {
        events: arrayUnion(event),
      }).catch(async (error) => {
        if (error.code === 'not-found') {
          await setDoc(userRef, { events: [event] });
        }
      });
    }
    console.log("알람 전송");
    sendNotificationToUser(user.uid, 'System', 'Calendar', '');

    resetModalState();
  };

  const toggleStarEvent = async (event) => {
    const updatedEvent = { ...event, starred: !event.starred };
    const updatedSchedule = schedule.map((e) => (e === event ? updatedEvent : e));
    setSchedule(updatedSchedule);

    if (user) {
      const userRef = doc(db, 'calendar', user.uid);
      await updateDoc(userRef, {
        events: arrayRemove(event),
      });
      await updateDoc(userRef, {
        events: arrayUnion(updatedEvent),
      });
    }

    // 별표 상태 변경 시 서버에 통신 (redux에서 userPhone 존재 시에만 요청)
    if (reduxUser.userPhone && reduxUser.userPhone.trim() !== "") {
      console.log("reduxUser.userPhone", reduxUser.userPhone);
      console.log("user.uid", user.uid);
      console.log("event.title", event.title);
      console.log("updatedEvent.starred", updatedEvent.starred);
      console.log("event.time", event.time instanceof Date ? event.time.toISOString() : event.time.toDate().toISOString());
      try {
        await axios.post('http://localhost:8000/star-event', {
          uid: user.uid,
          eventId: event.title, // 고유한 식별자가 필요하다면 별도의 ID 사용 고려
          starred: updatedEvent.starred,
          time: event.time instanceof Date ? event.time.toISOString() : event.time.toDate().toISOString(),
          userPhone : reduxUser.userPhone,
        });
      } catch (error) {
        console.error('별표 상태 변경 오류:', error);
      }
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (hour, minute) => {
    const ampm = hour >= 12 ? '오후' : '오전';
    const formattedHour = hour % 12 || 12;
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${ampm} ${formattedHour}:${formattedMinute}`;
  };

  // 시간 선택 확인 핸들러
  const handleTimeConfirm = () => {
    const newTime = new Date();
    newTime.setHours(selectedHour);
    newTime.setMinutes(selectedMinute);
    setNewEvent({ ...newEvent, time: newTime });
    setTimePickerVisible(false);
  };

  // 상태 초기화 함수 추가
  const resetModalState = () => {
    setModalVisible(false);
    setTimePickerVisible(false);
    setNewEvent({ title: '', time: new Date() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>일정 관리</Text>
      </View>
      
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: '#6366f1' },
            ...schedule.reduce((acc, event) => {
              acc[event.date] = { marked: true, dotColor: '#6366f1' };
              return acc;
            }, {}),
          }}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#1f2937',
            selectedDayBackgroundColor: '#6366f1',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#6366f1',
            dayTextColor: '#1f2937',
            textDisabledColor: '#d1d5db',
            dotColor: '#6366f1',
            monthTextColor: '#1f2937',
            arrowColor: '#6366f1',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600'
          }}
        />
      </View>

      <View style={styles.timelineWrapper}>
        <Text style={styles.timelineTitle}>
          {new Date(selectedDate).toLocaleDateString('ko-KR', { 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </Text>
        <ScrollView style={styles.timelineContainer}>
          {schedule
            .filter(event => event.date === selectedDate)
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timeIndicator}>
                  <View style={styles.timeDot} />
                  <View style={styles.timeLine} />
                </View>
                <View style={styles.eventContent}>
                  <View style={styles.timelineItemHeader}>
                    <Text style={styles.timelineEventTitle}>{event.title}</Text>
                    <TouchableOpacity 
                      style={styles.starButton} 
                      onPress={() => toggleStarEvent(event)}
                    >
                      <Icon
                        name={event.starred ? 'star' : 'star-outline'}
                        size={20}
                        color={event.starred ? '#eab308' : '#9ca3af'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timelineEventTime}>
                    {event.time instanceof Date
                      ? event.time.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true })
                      : event.time.toDate
                      ? event.time.toDate().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true })
                      : '시간 미정'}
                  </Text>
                </View>
              </View>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setModalVisible(true)}
      >
        <Icon name="add" size={30} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetModalState}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={resetModalState}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalView}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <TouchableOpacity 
                    onPress={resetModalState}
                    style={styles.modalCloseButton}
                  >
                    <Icon name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>일정 추가</Text>
                </View>
                <TouchableOpacity 
                  onPress={addEvent}
                  style={[styles.modalSaveButton, 
                    !newEvent.title.trim() && styles.modalSaveButtonDisabled]}
                  disabled={!newEvent.title.trim()}
                >
                  <Text style={[styles.modalSaveText, 
                    !newEvent.title.trim() && styles.modalSaveTextDisabled]}>
                    저장
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.titleInput}
                    placeholder="제목"
                    placeholderTextColor="#9CA3AF"
                    value={newEvent.title}
                    onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
                  />
                </View>

                <View style={styles.eventDetailsSection}>
                  <TouchableOpacity 
                    style={styles.eventDetailRow}
                    onPress={(e) => {
                      e.stopPropagation();
                      // 여기에 날짜 선택 로직 추가
                    }}
                  >
                    <Icon name="calendar-outline" size={22} color="#6366f1" style={styles.detailIcon} />
                    <Text style={styles.eventDetailText}>
                      {new Date(selectedDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.eventDetailRow}
                    onPress={(e) => {
                      e.stopPropagation();
                      setTimePickerVisible(true);
                    }}
                  >
                    <Icon name="time-outline" size={22} color="#6366f1" style={styles.detailIcon} />
                    <Text style={styles.eventDetailText}>
                      {newEvent.time instanceof Date 
                        ? formatTime(newEvent.time.getHours(), newEvent.time.getMinutes()) 
                        : '시간 선택'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

      {timePickerVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={timePickerVisible}
          onRequestClose={() => setTimePickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setTimePickerVisible(false)}
            >
              <View style={styles.timePickerModal}>
                <View style={styles.timePickerHeader}>
                  <Text style={styles.timePickerTitle}>시간 선택</Text>
                  <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                    <Icon name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.timePickerContent}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>시</Text>
                    <ScrollView 
                      style={styles.timePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.timePickerItem,
                            selectedHour === i && styles.timePickerItemSelected
                          ]}
                          onPress={() => setSelectedHour(i)}
                        >
                          <Text style={[
                            styles.timePickerItemText,
                            selectedHour === i && styles.timePickerItemTextSelected
                          ]}>
                            {i.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>분</Text>
                    <ScrollView 
                      style={styles.timePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {Array.from({ length: 60 }).map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.timePickerItem,
                            selectedMinute === i && styles.timePickerItemSelected
                          ]}
                          onPress={() => setSelectedMinute(i)}
                        >
                          <Text style={[
                            styles.timePickerItemText,
                            selectedMinute === i && styles.timePickerItemTextSelected
                          ]}>
                            {i.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.timePickerConfirmButton}
                  onPress={handleTimeConfirm}
                >
                  <Text style={styles.timePickerConfirmButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight + 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  timelineWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  timelineContainer: {
    flex: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timeIndicator: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  timeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#6366f1',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    height: Platform.OS === 'ios' ? 88 : 56,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 16,
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalSaveTextDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    padding: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  inputIcon: {
    marginRight: 12,
  },
  titleInput: {
    fontSize: 24,
    color: '#111827',
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  timeSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeSelectText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },

  // TimePicker 모달 스타일 수정
  timePickerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 20,
    maxHeight: '60%',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 200,
    marginTop: 10,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
  },
  timePickerScroll: {
    height: 160,
    width: 80,
  },
  timePickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  timePickerItemSelected: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  timePickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  timePickerItemTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  timePickerConfirmButton: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  timePickerConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  timeSelectButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  modalButtonContainer: {
    marginTop: 'auto',
  },
  modalConfirmButton: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timelineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineEventTime: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  starButton: {
    marginLeft: 10,
  },
  eventDetailsSection: {
    paddingHorizontal: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  eventDetailText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
});

export default CalendarScreen;