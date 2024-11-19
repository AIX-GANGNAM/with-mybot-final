import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ProgressBar from './ProgressBar';
import { commonStyles } from './commonStyles';
import { useRoute } from '@react-navigation/native';

const UserVerificationStep1 = () => {
  console.log("UserVerificationStep1.js > 호출됨");
  const [username, setUsername] = useState('');
  const navigation = useNavigation();

  const route = useRoute();
  const { gender } = route.params;

  const handleNext = () => {
    if (username) {
      navigation.navigate('UserVerificationStep2', { username, gender });
    } else {
      alert('사용자 ID를 입력해주세요.');
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.innerContainer}>
        <ProgressBar step={2} totalSteps={5} />
        
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>사용자 ID 만들기</Text>
          <Text style={commonStyles.headerSubtitle}>
            다른 사용자들이 회원님을 찾을 수 있는 고유한 ID를 만들어주세요
          </Text>
        </View>

        <View style={commonStyles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="사용자 ID"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[commonStyles.button, !username && commonStyles.disabledButton]} 
          onPress={handleNext}
          disabled={!username}
        >
          <Text style={commonStyles.buttonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 25,
    paddingHorizontal: 20,
  },
  atSymbol: {
    fontSize: 16,
    color: '#657786',
    marginRight: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#14171A',
  },
});

export default UserVerificationStep1;
