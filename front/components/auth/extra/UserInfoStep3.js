import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { extraCommonStyles } from './commonStyles';

const COMMUNICATION_STYLES = [
  { id: 'formal', label: '격식있게', icon: 'business-outline' },
  { id: 'friendly', label: '친근하게', icon: 'happy-outline' },
  { id: 'witty', label: '재치있게', icon: 'sparkles-outline' },
  { id: 'direct', label: '직설적으로', icon: 'arrow-forward-outline' },
  { id: 'polite', label: '공손하게', icon: 'flower-outline' },
  { id: 'casual', label: '편하게', icon: 'cafe-outline' },
];

const SPEAKING_STYLES = [
  { id: 'honorific', label: '존댓말', description: '예: ~입니다, ~해요' },
  { id: 'casual', label: '반말', description: '예: ~야, ~해' },
  { id: 'mixed', label: '상황에 따라 혼용', description: '예: TPO에 맞게' },
];

const EMOJI_USAGE = [
  { id: 'frequent', label: '자주 사용', icon: 'heart-outline' },
  { id: 'moderate', label: '가끔 사용', icon: 'happy-outline' },
  { id: 'rarely', label: '거의 사용 안 함', icon: 'text-outline' },
];

const UserInfoStep3 = ({ navigation, route }) => {
  const [communicationStyle, setCommunicationStyle] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [emojiStyle, setEmojiStyle] = useState('');

  const handleNext = () => {
    if (communicationStyle && speakingStyle && emojiStyle) {
      navigation.navigate('UserInfoStep4', {
        ...route.params,
        communicationStyle,
        speakingStyle,
        emojiStyle
      });
    }
  };

  return (
    <SafeAreaView style={extraCommonStyles.container}>
      <ScrollView style={extraCommonStyles.innerContainer}>
        <ProgressBar step={3} totalSteps={4} />
        
        <Text style={extraCommonStyles.title}>대화 스타일을{'\n'}선택해주세요</Text>
        <Text style={extraCommonStyles.subtitle}>
          선호하는 대화 방식을 알려주세요
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>대화 스타일</Text>
          <View style={styles.optionsGrid}>
            {COMMUNICATION_STYLES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.option,
                  communicationStyle === item.id && styles.selectedOption
                ]}
                onPress={() => setCommunicationStyle(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={communicationStyle === item.id ? '#fff' : '#657786'} 
                />
                <Text style={[
                  styles.optionText,
                  communicationStyle === item.id && styles.selectedText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>말투 선택</Text>
          {SPEAKING_STYLES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.speakingOption,
                speakingStyle === item.id && styles.selectedOption
              ]}
              onPress={() => setSpeakingStyle(item.id)}
            >
              <View>
                <Text style={[
                  styles.speakingOptionTitle,
                  speakingStyle === item.id && styles.selectedText
                ]}>
                  {item.label}
                </Text>
                <Text style={[
                  styles.speakingOptionDesc,
                  speakingStyle === item.id && styles.selectedDescText
                ]}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이모티콘 사용</Text>
          <View style={styles.emojiOptions}>
            {EMOJI_USAGE.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.emojiOption,
                  emojiStyle === item.id && styles.selectedOption
                ]}
                onPress={() => setEmojiStyle(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={emojiStyle === item.id ? '#fff' : '#657786'} 
                />
                <Text style={[
                  styles.optionText,
                  emojiStyle === item.id && styles.selectedText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[
            extraCommonStyles.button,
            (!communicationStyle || !speakingStyle || !emojiStyle) && extraCommonStyles.disabledButton,
            { marginVertical: 20 }
          ]}
          onPress={handleNext}
          disabled={!communicationStyle || !speakingStyle || !emojiStyle}
        >
          <Text style={extraCommonStyles.buttonText}>다음</Text>
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
  speakingOption: {
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  speakingOptionTitle: {
    fontSize: 16,
    color: '#14171A',
    fontWeight: '600',
    marginBottom: 4,
  },
  speakingOptionDesc: {
    fontSize: 14,
    color: '#657786',
  },
  selectedDescText: {
    color: '#fff',
    opacity: 0.8,
  },
  emojiOptions: {
    flexDirection: 'column',
    gap: 10,
  },
  emojiOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    padding: 15,
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
});

export default UserInfoStep3;
