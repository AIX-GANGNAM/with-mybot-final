import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  SafeAreaView, 
  StyleSheet,
  Image 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { commonStyles } from './commonStyles';

const UserVerificationStep4 = () => {
  console.log("UserVerificationStep4.js > 호출됨");
  const [phone, setPhone] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { username, name, birthdate, gender } = route.params;

  const handleNext = () => {
    navigation.navigate('UserVerificationSummary', { username, name, birthdate, phone, gender });
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
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.innerContainer}>
        <ProgressBar step={5} totalSteps={5} />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>전화번호 추가</Text>
          <Text style={styles.headerSubtitle}>
            페르소나의 스마트 알림 기능을 위해 사용됩니다
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.featureBox}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={24} color="#5271FF" />
            </View>
            <Text style={styles.featureTitle}>스마트 알림 기능</Text>
            <Text style={styles.featureDescription}>
              페르소나가 캘린더의 중요 일정을 파악하여{'\n'}
              맞춤형 메시지를 보내드립니다
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+82</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="전화번호 입력"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              maxLength={13}
              placeholderTextColor="#8E8E8E"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleNext}
          >
            <Text style={styles.skipButtonText}>나중에 하기</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.nextButton, !phone && styles.disabledButton]} 
            onPress={handleNext}
            disabled={!phone}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#737373',
    textAlign: 'center',
  },
  content: {
    width: '100%',
    gap: 24,
  },
  featureBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCode: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 15,
    color: '#262626',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#262626',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  skipButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#737373',
  },
  nextButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#5271FF',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#E8E8E8',
  },
});

export default UserVerificationStep4;
