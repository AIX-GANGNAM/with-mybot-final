import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import app from '../../firebaseConfig'; // Firebase 앱 인스턴스 import
import * as Yup from 'yup';
import { createUserProfile } from '../../firebaseConfig';
import { FontAwesome } from '@expo/vector-icons';
import NowPushToken from '../notification/NowPushToken';

// 토큰 발급
const SignupSchema = Yup.object().shape({
  email: Yup.string().email('올바른 이메일 형식을 입력해주세요').required('이메일을 입력해주세요'),
  password: Yup.string().min(8, '비밀번호는 8자리 이상이어야 합니다').required('비밀번호를 입력해주세요'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], '비밀번호가 일치하지 않습니다')
    .required('비밀번호 확인을 입력해주세요'),
});

const SignupForm = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    validateForm();
  }, [email, password, confirmPassword]);

  const validateForm = async () => {
    try {
      if (email === '' && password === '' && confirmPassword === '') {
        setErrors({});
        setIsFormValid(false);
        return;
      }
      await SignupSchema.validate({ email, password, confirmPassword }, { abortEarly: false });
      setErrors({});
      setIsFormValid(true);
    } catch (error) {
      const newErrors = {};
      error.inner.forEach((err) => {
        if (err.path === 'email' && email !== '') {
          newErrors[err.path] = err.message;
        }
        if (err.path === 'password' && password !== '') {
          newErrors[err.path] = err.message;
        }
        if (err.path === 'confirmPassword' && confirmPassword !== '') {
          newErrors[err.path] = err.message;
        }
      });
      setErrors(newErrors);
      setIsFormValid(false);
    }
  };

  const handleSignup = async () => {
    try {
      const auth = getAuth(app);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      const pushToken = await NowPushToken();

      await createUserProfile(user, { displayName: email.split('@')[0]}, pushToken); // 회원가입 완료 후 프로필 생성
      alert('회원가입이 완료되었습니다.');
      // 여기서 UserVerificationStep1으로 네비게이션을 변경합니다.
      navigation.navigate('UserVerificationStep0');
    } catch (error) {
      console.error(error);
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일 주소입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 주소입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }
      alert(errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={require('../../assets/logo/mybot-log-color.png')}
          style={styles.logo}
        />
        <Text style={styles.welcomeText}>AI와 함께 시작하세요</Text>
        <Text style={styles.subText}>지금 가입하고 AI와 함께 소통하세요</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#657786"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        {email !== '' && errors.email && 
          <Text style={styles.errorText}>{errors.email}</Text>
        }

        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#657786"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {password !== '' && errors.password && 
          <Text style={styles.errorText}>{errors.password}</Text>
        }

        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor="#657786"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {confirmPassword !== '' && errors.confirmPassword && 
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        }

        <TouchableOpacity 
          style={[styles.button, !isFormValid && styles.disabledButton]} 
          onPress={handleSignup}
          disabled={!isFormValid}
        >
          <Text style={styles.buttonText}>가입하기</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialLoginButton}>
          <FontAwesome name="google" size={20} color="#000" />
          <Text style={styles.socialLoginText}>Google로 가입하기</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          가입하면 World With MyBot 의{' '}
          <Text style={styles.termsLink}>서비스 약관</Text>과{' '}
          <Text style={styles.termsLink}>개인정보 보호정책</Text>에 동의하게 됩니다.
        </Text>
      </View>

      <View style={styles.bottomContainer}>
        <Text style={styles.bottomText}>이미 계정이 있으신가요?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>로그인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14171A',
    marginTop: 20,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#657786',
    marginTop: 10,
    textAlign: 'center',
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
    marginBottom: 15,
    fontSize: 16,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E8ED',
  },
  dividerText: {
    paddingHorizontal: 15,
    color: '#657786',
  },
  socialLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 25,
    marginBottom: 15,
  },
  socialLoginText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#14171A',
  },
  termsText: {
    fontSize: 13,
    color: '#657786',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: '#5271ff',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    paddingBottom: 30,
  },
  bottomText: {
    color: '#657786',
    fontSize: 14,
  },
  loginLink: {
    color: '#5271ff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  errorText: {
    color: '#E0245E',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 15,
  },
  disabledButton: {
    backgroundColor: '#AAB8C2',
  },
});

export default SignupForm;
