import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ProgressBar from './ProgressBar';
import { commonStyles } from './commonStyles';

const UserVerificationStep3 = () => {
  console.log("UserVerificationStep3.js > 호출됨");
  const [birthdate, setBirthdate] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { username, name, gender } = route.params;

  const handleNext = () => {
    if (isValidDate(birthdate)) {
      navigation.navigate('UserVerificationStep4', { username, name, birthdate, gender });
    } else {
      alert('올바른 생년월일 형식을 입력해주세요. (예: 1990-01-01)');
    }
  };

  const isValidDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    return true;
  };

  const formatDate = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += cleaned.substr(0, 4);
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.substr(4, 2);
        if (cleaned.length > 6) {
          formatted += '-' + cleaned.substr(6, 2);
        }
      }
    }
    return formatted;
  };

  const handleDateChange = (text) => {
    setBirthdate(formatDate(text));
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.innerContainer}>
        <ProgressBar step={4} totalSteps={5} />
        
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>생년월일을 입력해주세요</Text>
          <Text style={commonStyles.headerSubtitle}>
            이 정보는 프로필에 표시되지 않습니다
          </Text>
        </View>

        <View style={commonStyles.content}>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={birthdate}
            onChangeText={handleDateChange}
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor="#657786"
          />
          <Text style={styles.hint}>예: 1990-01-01</Text>
        </View>

        <TouchableOpacity 
          style={[commonStyles.button, !isValidDate(birthdate) && commonStyles.disabledButton]} 
          onPress={handleNext}
          disabled={!isValidDate(birthdate)}
        >
          <Text style={commonStyles.buttonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#14171A',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#657786',
    marginTop: 10,
  },
});

export default UserVerificationStep3;
