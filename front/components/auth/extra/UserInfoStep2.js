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

const PERSONALITY_KEYWORDS = [
  { id: 'energetic', label: '활발한', icon: 'sunny-outline' },
  { id: 'careful', label: '신중한', icon: 'shield-checkmark-outline' },
  { id: 'creative', label: '창의적인', icon: 'bulb-outline' },
  { id: 'logical', label: '논리적인', icon: 'git-branch-outline' },
  { id: 'emotional', label: '감성적인', icon: 'heart-outline' },
  { id: 'optimistic', label: '긍정적인', icon: 'happy-outline' },
  { id: 'realistic', label: '현실적인', icon: 'compass-outline' },
  { id: 'adventurous', label: '모험적인', icon: 'rocket-outline' },
];

const INTERESTS = [
  { id: 'game', label: '게임', icon: 'game-controller-outline' },
  { id: 'sports', label: '운동', icon: 'basketball-outline' },
  { id: 'reading', label: '독서', icon: 'book-outline' },
  { id: 'music', label: '음악', icon: 'musical-notes-outline' },
  { id: 'movie', label: '영화', icon: 'film-outline' },
  { id: 'travel', label: '여행', icon: 'airplane-outline' },
  { id: 'food', label: '맛집', icon: 'restaurant-outline' },
  { id: 'art', label: '예술', icon: 'color-palette-outline' },
];

const UserInfoStep2 = ({ navigation, route }) => {
  const [selectedPersonality, setSelectedPersonality] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const handlePersonalitySelect = (id) => {
    if (selectedPersonality.includes(id)) {
      setSelectedPersonality(selectedPersonality.filter(item => item !== id));
    } else if (selectedPersonality.length < 3) {
      setSelectedPersonality([...selectedPersonality, id]);
    }
  };

  const handleInterestSelect = (id) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter(item => item !== id));
    } else if (selectedInterests.length < 3) {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleNext = () => {
    if (selectedPersonality.length > 0 && selectedInterests.length > 0) {
      navigation.navigate('UserInfoStep3', {
        ...route.params,
        personality: selectedPersonality,
        interests: selectedInterests
      });
    }
  };

  return (
    <SafeAreaView style={extraCommonStyles.container}>
      <ScrollView style={extraCommonStyles.innerContainer}>
        <ProgressBar step={2} totalSteps={4} />
        
        <Text style={extraCommonStyles.title}>당신을 표현하는{'\n'}키워드를 선택해주세요</Text>
        <Text style={extraCommonStyles.subtitle}>
          성격 키워드 3개와 관심사 3개를 선택해주세요
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>성격 키워드 ({selectedPersonality.length}/3)</Text>
          <View style={styles.optionsGrid}>
            {PERSONALITY_KEYWORDS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.option,
                  selectedPersonality.includes(item.id) && styles.selectedOption
                ]}
                onPress={() => handlePersonalitySelect(item.id)}
                disabled={selectedPersonality.length >= 3 && !selectedPersonality.includes(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={selectedPersonality.includes(item.id) ? '#fff' : '#657786'} 
                />
                <Text style={[
                  styles.optionText,
                  selectedPersonality.includes(item.id) && styles.selectedText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관심사 ({selectedInterests.length}/3)</Text>
          <View style={styles.optionsGrid}>
            {INTERESTS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.option,
                  selectedInterests.includes(item.id) && styles.selectedOption
                ]}
                onPress={() => handleInterestSelect(item.id)}
                disabled={selectedInterests.length >= 3 && !selectedInterests.includes(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={selectedInterests.includes(item.id) ? '#fff' : '#657786'} 
                />
                <Text style={[
                  styles.optionText,
                  selectedInterests.includes(item.id) && styles.selectedText
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
            (!selectedPersonality.length || !selectedInterests.length) && extraCommonStyles.disabledButton,
            { marginVertical: 20 }
          ]}
          onPress={handleNext}
          disabled={!selectedPersonality.length || !selectedInterests.length}
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

export default UserInfoStep2;
