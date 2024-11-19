import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { extraCommonStyles } from './commonStyles';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../../../store/slice/userSlice';
import axios from 'axios';

const VALUES = [
  { id: 'success', label: '성공 지향적', icon: 'trophy-outline' },
  { id: 'relationship', label: '관계 중시', icon: 'people-outline' },
  { id: 'self_development', label: '자아실현 중시', icon: 'person-outline' },
  { id: 'stability', label: '안정 추구', icon: 'shield-outline' },
  { id: 'challenge', label: '도전 중시', icon: 'flag-outline' },
  { id: 'balance', label: '균형 추구', icon: 'infinite-outline' },
];

const DECISION_STYLES = [
  { 
    id: 'rational', 
    label: '이성적 결정', 
    description: '논리와 분석을 바탕으로 결정',
    icon: 'analytics-outline'
  },
  { 
    id: 'intuitive', 
    label: '직관적 결정', 
    description: '감각과 직감을 바탕으로 결정',
    icon: 'bulb-outline'
  },
  { 
    id: 'careful', 
    label: '신중한 결정', 
    description: '충분한 고민 후 결정',
    icon: 'timer-outline'
  },
  { 
    id: 'quick', 
    label: '빠른 결정', 
    description: '신속하게 판단하고 결정',
    icon: 'flash-outline'
  },
];

const UserInfoStep4 = ({ navigation, route }) => {
  const [selectedValues, setSelectedValues] = useState([]);
  const [decisionStyle, setDecisionStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useSelector(state => state.user.user);
  const dispatch = useDispatch();

  const handleValueSelect = (id) => {
    if (selectedValues.includes(id)) {
      setSelectedValues(selectedValues.filter(item => item !== id));
    } else if (selectedValues.length < 2) {
      setSelectedValues([...selectedValues, id]);
    }
  };

  const handleFinish = async () => {
    if (selectedValues.length === 0 || !decisionStyle) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const profileData = {
        ...route.params,
        values: selectedValues,
        decisionStyle: decisionStyle
      };
      
      // 1. Firestore DB 업데이트
      await updateDoc(userRef, {
        profile: profileData
      });
      
      // 2. 성격 업데이트 API 호출
      try {
        const personalityData = {
          uid: user.uid,
          mbti: profileData.mbti,
          personality: profileData.personality,
          interests: profileData.interests,
          communication_style: profileData.communicationStyle,
          speaking_style: profileData.speakingStyle,
          emoji_style: profileData.emojiStyle,
          values: profileData.values,
          decision_style: profileData.decisionStyle
        };

        await axios.post('http://localhost:8000/update-personality', personalityData);
      } catch (apiError) {
        console.error('성격 업데이트 API 호출 중 오류:', apiError);
        // API 호출 실패해도 계속 진행
      }
      
      // 3. Redux store 업데이트
      dispatch(setUser({
        ...user,
        profile: profileData
      }));
      navigation.navigate('BottomTab', { screen: 'Home' });
    } catch (error) {
      console.error('프로필 정보 저장 중 오류 발생:', error);
      Alert.alert("오류", "프로필 정보 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={extraCommonStyles.container}>
      <ScrollView style={extraCommonStyles.innerContainer}>
        <ProgressBar step={4} totalSteps={4} />
        
        <Text style={extraCommonStyles.title}>가치관과 의사결정{'\n'}스타일을 선택해주세요</Text>
        <Text style={extraCommonStyles.subtitle}>
          당신의 성향을 더 잘 이해할 수 있도록 도와주세요
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>중요하게 생각하는 가치 ({selectedValues.length}/2)</Text>
          <View style={styles.optionsGrid}>
            {VALUES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.option,
                  selectedValues.includes(item.id) && styles.selectedOption
                ]}
                onPress={() => handleValueSelect(item.id)}
                disabled={selectedValues.length >= 2 && !selectedValues.includes(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={selectedValues.includes(item.id) ? '#fff' : '#657786'} 
                />
                <Text style={[
                  styles.optionText,
                  selectedValues.includes(item.id) && styles.selectedText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>의사결정 스타일</Text>
          {DECISION_STYLES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.decisionOption,
                decisionStyle === item.id && styles.selectedOption
              ]}
              onPress={() => setDecisionStyle(item.id)}
            >
              <Ionicons 
                name={item.icon} 
                size={24} 
                color={decisionStyle === item.id ? '#fff' : '#657786'} 
              />
              <View style={styles.decisionTextContainer}>
                <Text style={[
                  styles.decisionTitle,
                  decisionStyle === item.id && styles.selectedText
                ]}>
                  {item.label}
                </Text>
                <Text style={[
                  styles.decisionDesc,
                  decisionStyle === item.id && styles.selectedDescText
                ]}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[
            extraCommonStyles.button,
            (!selectedValues.length || !decisionStyle) && extraCommonStyles.disabledButton,
            { marginVertical: 20 }
          ]}
          onPress={handleFinish}
          disabled={!selectedValues.length || !decisionStyle || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={extraCommonStyles.buttonText}>프로필 설정 완료</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14171A',
    marginBottom: 15,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  option: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  decisionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  decisionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  decisionTitle: {
    fontSize: 16,
    color: '#14171A',
    fontWeight: '600',
    marginBottom: 4,
  },
  decisionDesc: {
    fontSize: 14,
    color: '#657786',
  },
  selectedOption: {
    backgroundColor: '#5271ff',
    borderColor: '#5271ff',
  },
  optionText: {
    fontSize: 15,
    color: '#14171A',
    marginLeft: 10,
    fontWeight: '500',
  },
  selectedText: {
    color: '#fff',
  },
  selectedDescText: {
    color: '#fff',
    opacity: 0.8,
  },
});

export default UserInfoStep4;
