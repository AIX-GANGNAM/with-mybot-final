import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Text, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import app from '../../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slice/userSlice.js';

const UserVerification = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState(new Date());
  const [phone, setPhone] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const auth = getAuth(app);
  const db = getFirestore(app);

  const dispatch = useDispatch();

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const now = new Date();
        const profileData = {
          profile: {
            userId: username,
            userName: name,
            birthdate: birthdate.toISOString(),
            userPhone: phone,
            createdAt: now.toISOString(),
          }
        };
        await setDoc(userRef, profileData, { merge: true });
        dispatch(setUser({ uid: user.uid, ...profileData }));
        navigation.navigate('BottomTab', { screen: 'Home' });
      }
    } catch (error) {
      console.error('프로필 저장 중 오류 발생:', error);
      alert('프로필 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const onDateChange = (selectedDate) => {
    setTempDate(selectedDate);
  };

  const confirmDate = () => {
    setBirthdate(tempDate);
    setShowDatePicker(false);
  };

  const autoHyphen = (value) => {
    return value
      .replace(/[^0-9]/g, '')
      .replace(/^(\d{0,3})(\d{0,4})(\d{0,4})$/g, "$1-$2-$3")
      .replace(/(\-{1,2})$/g, "");
  };

  const handlePhoneChange = (text) => {
    setPhone(autoHyphen(text));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{flex: 1}}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={require('../../assets/logo/Instagram-logo.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>프로필 설정</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={[styles.input, styles.usernameInput]}
            placeholder="사용자 ID"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>
            {birthdate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>생년월일 선택</Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => onDateChange(selectedDate)}
                style={styles.datePicker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmDate} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <TextInput
          style={styles.input}
          placeholder="전화번호 (선택사항)"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="numeric"
          maxLength={13}
        />
        <TouchableOpacity style={styles.button} onPress={handleSaveProfile}>
          <Text style={styles.buttonText}>프로필 저장</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  logo: {
    width: 200,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#262626',
  },
  input: {
    width: '100%',
    height: 44,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 12,
    fontSize: 14,
  },
  dateText: {
    fontSize: 14,
    color: '#262626',
    paddingTop: 12,
  },
  button: {
    backgroundColor: '#3797EF',
    width: '100%',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  datePicker: {
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
  },
  modalButtonText: {
    color: '#3797EF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  atSymbol: {
    fontSize: 16,
    color: '#262626',
    marginRight: 5,
  },
  usernameInput: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  atSymbol: {
    fontSize: 16,
    color: '#262626',
    marginRight: 5,
  },
  usernameInput: {
    flex: 1,
  },
});

export default UserVerification;