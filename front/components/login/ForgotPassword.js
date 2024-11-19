import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('올바른 이메일 형식이 아닙니다')
    .required('이메일을 입력해주세요'),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const auth = getAuth();

  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);
      
      // 이메일 유효성 검사
      await ForgotPasswordSchema.validate({ email });
      
      // 비밀번호 재설정 이메일 전송
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert(
        "이메일 전송 완료",
        "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
        [{ text: "확인", onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      if (err.name === 'ValidationError') {
        setError(err.message);
      } else {
        setError('비밀번호 재설정 이메일 전송에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#14171A" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Image
          source={require('../../assets/logo/mybot-log-color.png')}
          style={styles.logo}
        />
        
        <Text style={styles.title}>비밀번호를 잊으셨나요?</Text>
        <Text style={styles.subtitle}>
          가입했던 이메일을 입력하시면{'\n'}
          비밀번호 재설정 링크를 보내드립니다.
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#657786"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              (!email || loading) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!email || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>재설정 링크 받기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14171A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#657786',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#5271ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#AAB8C2',
  },
  errorText: {
    color: '#E0245E',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 15,
  },
});

export default ForgotPassword;