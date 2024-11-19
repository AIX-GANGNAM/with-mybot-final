import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import ProgressBar from './ProgressBar';
import { extraCommonStyles } from './commonStyles';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const UserInfoStep1 = ({ navigation }) => {
  const [selectedMbti, setSelectedMbti] = useState('');

  const handleNext = () => {
    if (selectedMbti) {
      navigation.navigate('UserInfoStep2', { mbti: selectedMbti });
    }
  };

  const renderMbtiItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.mbtiItem, selectedMbti === item && styles.selectedMbtiItem]}
      onPress={() => setSelectedMbti(item)}
    >
      <Text style={[styles.mbtiText, selectedMbti === item && styles.selectedMbtiText]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={extraCommonStyles.container}>
      <View style={extraCommonStyles.innerContainer}>
        <ProgressBar step={1} totalSteps={4} />
        <Text style={extraCommonStyles.title}>MBTI를 선택해주세요</Text>
        <Text style={extraCommonStyles.subtitle}>
          당신의 성격 유형을 알려주세요
        </Text>

        <FlatList
          data={MBTI_TYPES}
          renderItem={renderMbtiItem}
          keyExtractor={item => item}
          numColumns={4}
          contentContainerStyle={styles.mbtiList}
        />

        <TouchableOpacity 
          style={[
            extraCommonStyles.button,
            !selectedMbti && extraCommonStyles.disabledButton
          ]}
          onPress={handleNext}
          disabled={!selectedMbti}
        >
          <Text style={extraCommonStyles.buttonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mbtiList: {
    paddingHorizontal: 10,
  },
  mbtiItem: {
    flex: 1,
    margin: 5,
    height: 50,
    backgroundColor: '#F5F8FA',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  selectedMbtiItem: {
    backgroundColor: '#5271ff',
    borderColor: '#5271ff',
  },
  mbtiText: {
    fontSize: 14,
    color: '#14171A',
    fontWeight: '600',
  },
  selectedMbtiText: {
    color: '#fff',
  },
});

export default UserInfoStep1;
