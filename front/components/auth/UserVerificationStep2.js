import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ProgressBar from './ProgressBar';
import { commonStyles } from './commonStyles';

const UserVerificationStep2 = () => {
  console.log("UserVerificationStep2.js > 호출됨");
  const [name, setName] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { username, gender } = route.params;

  const handleNext = () => {
    if (name) {
      navigation.navigate('UserVerificationStep3', { username, name, gender });
    } else {
      alert('이름을 입력해주세요.');
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.innerContainer}>
        <ProgressBar step={3} totalSteps={5} />
        
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>이름을 알려주세요</Text>
          <Text style={commonStyles.headerSubtitle}>
            다른 사용자들에게 표시될 이름을 입력해주세요
          </Text>
        </View>

        <View style={commonStyles.content}>
          <TextInput
            style={styles.input}
            placeholder="이름"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#657786"
          />
        </View>

        <TouchableOpacity 
          style={[commonStyles.button, !name && commonStyles.disabledButton]} 
          onPress={handleNext}
          disabled={!name}
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
  },
});

export default UserVerificationStep2;
