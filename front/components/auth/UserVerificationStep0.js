import React, { useState } from 'react';
import { View, TouchableOpacity, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { commonStyles } from './commonStyles';

const UserVerificationStep0 = () => {
  console.log("UserVerificationStep0.js > 호출됨");
  const [selectedGender, setSelectedGender] = useState(null);
  const navigation = useNavigation();

  const handleNext = () => {
    if (selectedGender) {
      navigation.navigate('UserVerificationStep1', { gender: selectedGender });
    } else {
      alert('성별을 선택해주세요.');
    }
  };

  const GenderOption = ({ gender, label, iconName }) => (
    <TouchableOpacity
      style={[
        styles.genderOption,
        selectedGender === gender && styles.selectedGender
      ]}
      onPress={() => setSelectedGender(gender)}
    >
      <Ionicons 
        name={iconName} 
        size={24} 
        color={selectedGender === gender ? '#FFFFFF' : '#657786'} 
      />
      <Text style={[
        styles.genderText,
        selectedGender === gender && styles.selectedGenderText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.innerContainer}>
        <ProgressBar step={1} totalSteps={5} />
        
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>성별 선택하기</Text>
          <Text style={commonStyles.headerSubtitle}>
            회원님의 성별을 선택해주세요
          </Text>
        </View>

        <View style={[commonStyles.content, styles.genderContainer]}>
          <GenderOption 
            gender="male" 
            label="남성" 
            iconName="male" 
          />
          <GenderOption 
            gender="female" 
            label="여성" 
            iconName="female" 
          />
        </View>

        <TouchableOpacity 
          style={[commonStyles.button, !selectedGender && commonStyles.disabledButton]} 
          onPress={handleNext}
          disabled={!selectedGender}
        >
          <Text style={commonStyles.buttonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  genderContainer: {
    width: '100%',
    gap: 12,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 28,
    paddingHorizontal: 20,
    gap: 12,
  },
  selectedGender: {
    backgroundColor: '#5271FF',
    borderColor: '#5271FF',
  },
  genderText: {
    fontSize: 16,
    color: '#657786',
  },
  selectedGenderText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default UserVerificationStep0;
