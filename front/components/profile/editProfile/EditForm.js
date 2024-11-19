import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  Image, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EditForm = ({ name, userId, profileImg, birthdate, phone, mbti, personality, onSave, onImagePick }) => {
  console.log("EditForm.js > 호출됨");
  const [formData, setFormData] = useState({
    name: name || '',
    userId: userId || '',
    profileImg: profileImg || '',
    birthdate: birthdate || '',
    phone: phone || '',
    mbti: mbti || '',
    personality: personality || '',
  });

  useEffect(() => {
    console.log('Current form data:', formData);
  }, [formData]);

  const handleChange = (field, value) => {
    setFormData(prevData => {
      const newData = { ...prevData, [field]: value };
      onSave(newData);
      return newData;
    });
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{0,4})(\d{0,4})$/);
    if (match) {
      setFormData(prevData => {
        const newData = { ...prevData, phone: `${match[1]}${match[2] ? '-' : ''}${match[2]}${match[3] ? '-' : ''}${match[3]}` };
        onSave(newData);
        return newData;
      });
    } else {
      setFormData(prevData => {
        const newData = { ...prevData, phone: cleaned };
        onSave(newData);
        return newData;
      });
    }
  };

  const formatDate = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += cleaned.substr(0, 4);
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.substr(4, 2);
        if (cleaned.length > 6) {
          formatted += '-' + cleaned.substr(6, 2);
        }
      }
    }
    return formatted;
  };

  const handleDateChange = (text) => {
    setFormData(prevData => {
      const newData = { ...prevData, birthdate: formatDate(text) };
      onSave(newData);
      return newData;
    });
  };

  const handleImagePick = async () => {
    const newImageUri = await onImagePick();
    if (newImageUri) {
      handleChange('profileImg', newImageUri);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.profileImageSection}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: formData.profileImg || 'https://via.placeholder.com/150' }} 
              style={styles.profileImage} 
            />
            <TouchableOpacity 
              style={styles.imageEditButton}
              onPress={handleImagePick}
            >
              <Ionicons name="camera" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.imageHelperText}>
            프로필 사진을 변경하려면 탭하세요
          </Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>기본 정보</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6C757D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="이름"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="at" size={20} color="#6C757D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.userId}
                onChangeText={(text) => handleChange('userId', text)}
                placeholder="사용자 ID"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>연락처 정보</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6C757D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.birthdate}
                onChangeText={handleDateChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#6C757D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                placeholder="전화번호"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>성격 정보</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="star-outline" size={20} color="#6C757D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.mbti}
                onChangeText={(text) => handleChange('mbti', text)}
                placeholder="MBTI"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="heart-outline" size={20} color="#6C757D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.personality}
                onChangeText={(text) => handleChange('personality', text)}
                placeholder="성격"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    paddingVertical: 20,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  imageEditButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHelperText: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 8,
  },
  formSection: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
});

export default EditForm;
