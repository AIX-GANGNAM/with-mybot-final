import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Text, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import app from '../../firebaseConfig';
import * as Yup from 'yup';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slice/userSlice.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdatePushToken from '../notification/UpdatePushToken';
import NowPushToken from '../notification/NowPushToken';

WebBrowser.maybeCompleteAuthSession();

// 로그인 유효성 검사를 위한 Yup 스키마
const LoginSchema = Yup.object().shape({
  email: Yup.string().email('올바른 이메일 형식이 아닙니다').required('이메일을 입력해주세요'),
  password: Yup.string().min(8, '비밀번호는 8자리 이상이어야 합니다').required('비밀번호를 입력해주세요'),
});

const LoginForm = ({ isAuthenticated, setIsAuthenticated }) => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const dispatch = useDispatch();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID',
    scopes: ['profile', 'email']
  });

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    console.log('LoginForm 컴포넌트가 마운트되었습니다.');
    loadSavedCredentials();
  }, []);

  // 저장된 로그인 정보 불러오기
  const loadSavedCredentials = async () => {
    try {
      console.log('저장된 로그인 정보 불러오기 시작');
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');
      
      if (savedRememberMe === 'true' && savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        console.log('저장된 로그인 정보 불러옴');
      }
    } catch (error) {
      console.error('저장된 로그인 정보를 불러오는데 실패했습니다:', error);
    }
  };

  // 인증 데이터 저장
  const saveAuthData = async (user, userData) => {
    try {
      console.log('인증 데이터 저장 시작');
      
      // 로그인 정보 기억하기
      if (rememberMe) {
        await AsyncStorage.multiSet([
          ['savedEmail', email],
          ['savedPassword', password],
          ['rememberMe', 'true']
        ]);
        console.log('로그인 정보 저장됨');
      }
  
      // 자동 로그인 정보 저장
      if (autoLogin) {
        await AsyncStorage.multiSet([
          ['autoLogin', 'true'],
          ['userUid', user.uid],
          ['userData', JSON.stringify(userData)]
        ]);
        console.log('자동 로그인 정보 저장됨');
      }
    } catch (error) {
      console.error('인증 데이터 저장 중 오류 발생:', error);
    }
  };
  

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      console.log('로그아웃 시작');
      await auth.signOut();
      
      // 로그인 정보 기억하기 해제 시에만 삭제
      if (!rememberMe) {
        await AsyncStorage.multiRemove([
          'savedEmail',
          'savedPassword',
          'rememberMe'
        ]);
      }
      
      // 자동 로그인 정보는 항상 삭제
      await AsyncStorage.multiRemove([
        'autoLogin',
        'userUid',
        'userData'
      ]);
      
      dispatch(setUser(null));
      setIsAuthenticated(false);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  // 폼 유효성 검사
  useEffect(() => {
    validateForm();
  }, [email, password]);

  const validateForm = async () => {
    try {
      if (email === '' && password === '') {
        setErrors({});
        setIsFormValid(false);
        return;
      }
      await LoginSchema.validate({ email, password }, { abortEarly: false });
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
      });
      setErrors(newErrors);
      setIsFormValid(false);
    }
  };

  // 로그인 처리
  const handleLogin = async () => {
    try {
      console.log('로그인 시도');
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const userDataWithId = { uid: user.uid, ...userData };
        
        console.log('로그인 성공, 데이터 저장 시작');
        await saveAuthData(user, userDataWithId);
        dispatch(setUser(userDataWithId));
        setIsAuthenticated(true);
        UpdatePushToken(user.uid);
        navigation.navigate('BottomTab', { screen: 'Home' });
      } else {
        console.log('신규 사용자, 인증 단계로 이동');
        navigation.navigate('UserVerificationStep0');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('Google 로그인 시도');
      const result = await promptAsync();
      
      if (result?.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        const userRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          const userDataWithId = { uid: user.uid, ...userData };
          
          await saveAuthData(user, userDataWithId);
          dispatch(setUser(userDataWithId));
          setIsAuthenticated(true);
          UpdatePushToken(user.uid);
          NowPushToken();
          navigation.navigate('BottomTab', { screen: 'Home' });
        } else {
          const newUserData = {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            provider: 'google'
          };
          
          await setDoc(userRef, newUserData);
          const userDataWithId = { uid: user.uid, ...newUserData };
          
          await saveAuthData(user, userDataWithId);
          dispatch(setUser(userDataWithId));
          setIsAuthenticated(true);
          UpdatePushToken(user.uid);
          NowPushToken();
          navigation.navigate('BottomTab', { screen: 'Home' });
        }
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      alert('Google 로그인에 실패했습니다.');
    }
  };

  const handleGithubSignIn = () => {
    alert('기능 개발 예정입니다 ㅠㅠ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={require('../../assets/logo/mybot-log-color.png')}
          style={styles.logo}
        />
        <Text style={styles.welcomeText}>AI와 함께하는 소셜 네트워크</Text>
        <Text style={styles.subText}>지금 일어나고 있는 일을 AI와 함께 공유하세요</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#657786"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
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
          autoCapitalize="none"
        />
        {password !== '' && errors.password && 
          <Text style={styles.errorText}>{errors.password}</Text>
        }

        <View style={styles.checkboxContainer}>
        {/* 왼쪽 체크박스 */}
        <TouchableOpacity 
        style={styles.checkboxWrapper}
        onPress={() => setRememberMe(!rememberMe)}
        >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && <FontAwesome name="check" size={12} color="#fff" />}
        </View>
        <Text style={styles.checkboxText}>로그인 정보 기억하기</Text>
        </TouchableOpacity>

        {/* 오른쪽 체크박스 */}
        <TouchableOpacity 
        style={styles.checkboxWrapper}
        onPress={() => setAutoLogin(!autoLogin)}
        >
        <View style={[styles.checkbox, autoLogin && styles.checkboxChecked]}>
          {autoLogin && <FontAwesome name="check" size={12} color="#fff" />}
        </View>
        <Text style={styles.checkboxText}>자동 로그인</Text>
        </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.button, !isFormValid && styles.disabledButton]}
          disabled={!isFormValid}
            >
              <Text style={styles.buttonText}>로그인</Text>
            </TouchableOpacity>

            {/* 자동 로그인 체크박스 추가 */}
        

            <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.socialLoginButton} 
          onPress={handleGoogleSignIn}
        >
          <FontAwesome name="google" size={20} color="#000" />
          <Text style={styles.socialLoginText}>Google로 계속하기</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.socialLoginButton} 
          onPress={handleGithubSignIn}
        >
          <FontAwesome name="github" size={20} color="#000" />
          <Text style={styles.socialLoginText}>Github로 계속하기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomContainer}>
        <Text style={styles.bottomText}>계정이 없으신가요?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupLink}>가입하기</Text>
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
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  bottomText: {
    color: '#657786',
    fontSize: 14,
  },
  signupLink: {
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#657786',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5271ff',
    borderColor: '#5271ff',
  },
  checkboxText: {
    fontSize: 14,
    color: '#657786',
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginHorizontal: 5,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginLeft: 5,
  }
});


export default LoginForm;