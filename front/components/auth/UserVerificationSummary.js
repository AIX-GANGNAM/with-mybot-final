import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app from '../../firebaseConfig';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slice/userSlice.js';
import { commonStyles } from './commonStyles';
import { Ionicons } from '@expo/vector-icons';

const UserVerificationSummary = ({ setIsAuthenticated }) => {
  console.log("UserVerificationSummary.js > 호출됨");
  const navigation = useNavigation();
  const route = useRoute();
  const { username, name, birthdate, phone, gender } = route.params;
  const auth = getAuth(app);
  const db = getFirestore(app);
  const dispatch = useDispatch();

  const handleSaveProfile = async () => {
    console.log(route.params);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const profileData = {
          userPhone: phone,
          userId: username,
          profile: {
            userName: name,
            birthdate: birthdate,
            gender: gender,
          },
          lastActivity: serverTimestamp(),
          isOnline: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          settings: {
            notifications: phone ? true : false,
            privacy: 'public',
          }
        };

        await setDoc(userRef, profileData, { merge: true });
        dispatch(setUser({ uid: user.uid, ...profileData }));
        setIsAuthenticated(true);
        navigation.navigate('CreatePersona');
      }
    } catch (error) {
      console.error('프로필 저장 중 오류 발생:', error);
      alert('프로필 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.innerContainer}>
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>프로필 확인</Text>
          <Text style={commonStyles.headerSubtitle}>
            입력하신 정보를 확인해주세요
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>사용자 ID</Text>
            <Text style={styles.summaryValue}>@{username}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>이름</Text>
            <Text style={styles.summaryValue}>{name}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>생년월일</Text>
            <Text style={styles.summaryValue}>
              {new Date(birthdate).toLocaleDateString('ko-KR')}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>전화번호</Text>
            <Text style={styles.summaryValue}>
              {phone || '(입력하지 않음)'}
            </Text>
          </View>
        </View>

        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#657786" />
          <Text style={styles.noticeText}>
            프로필은 언제든지 설정에서 수정할 수 있습니다
          </Text>
        </View>

        <TouchableOpacity 
          style={commonStyles.button}
          onPress={handleSaveProfile}
        >
          <Text style={commonStyles.buttonText}>프로필 저장하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: '#F5F8FA',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#657786',
  },
  summaryValue: {
    fontSize: 16,
    color: '#14171A',
    fontWeight: '500',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 14,
    color: '#657786',
    marginLeft: 10,
    flex: 1,
  },
});

export default UserVerificationSummary;
