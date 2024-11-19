import { useState, useRef ,useCallback, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Animated, PanResponder, ScrollView, TextInput, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {getFirestore, collection, doc, updateDoc} from 'firebase/firestore';
import {useFocusEffect} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/Ionicons';
import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import sendNotificationToUser from '../components/notification/SendNotification';
// 이미지 생성 API 호출
const generatePersonaImages = async (formData) => {
  console.log('generatePersonaImages 실행');
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('사용자 인증 정보가 없습니다.');
    }
    
    formData.append('uid', user.uid);

    // 비동기 요청 실행 (응답 대기하지 않음)
    axios.post(`http://221.148.97.237:1818/generate-persona-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).catch(error => {
      console.error('Error in background persona generation:', error);
    });

    // 즉시 true 반환
    return true;

  } catch (error) {
    console.error('Error generating persona images:', error);
    Alert.alert("오류", "페르소나 이미지 생성 요청 중 오류가 발생했습니다.");
    throw error;
  }
};

// 성격 생성 API 호출
const generatePersonaDetails = async (customPersona) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('사용자 인증 정보가 없습니다.');
    }

    // 성격 생성은 동기식으로 처리
    const response = await axios.post('http://localhost:8000/generate-personality', {
      uid: user.uid,
      name: customPersona.name,
      personality: customPersona.personality,
      speechStyle: customPersona.speechStyle
    });
    
    return response.data;
  } catch (error) {
    console.error('Error generating persona details:', error);
    throw error;
  }
};

export default function CreatePersonaScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatedPersonas, setGeneratedPersonas] = useState({
    joy: null,
    anger: null,
    sadness: null,
    custom: null,
    clone: null
  });
  const [personaDetails, setPersonaDetails] = useState({
    joy: { name: '기쁨이', personality: '', speechStyle: '' },
    anger: { name: '화남이', personality: '', speechStyle: '' },
    sadness: { name: '슬픔이', personality: '', speechStyle: '' },
    custom: { name: '', personality: '', speechStyle: '' },
    clone: { name: '나의 분신', personality: '', speechStyle: '' }
  });
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customPersona, setCustomPersona] = useState({
    name: personaDetails.custom.name || '',
    personality: personaDetails.custom.personality || '',
    speechStyle: personaDetails.custom.speechStyle || ''
  });
  const [selectedPersonaType, setSelectedPersonaType] = useState(null);
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [personaCharacteristics] = useState({
    joy: {
      name: '기쁨이',
      personality: '밝고 긍정적인 성격으로, 에너지가 넘치고 열정적입니다.',
      speechStyle: '활기차고 밝은 말투, 이모티콘을 자주 사용해요! 😊',
    },
    anger: {
      name: '화남이',
      personality: '정의감이 강하고 자신의 의견을 분명히 표현하는 성격입니다.',
      speechStyle: '강렬하 직설적인 말투, 감정을 숨기지 않고 표현합니다!',
    },
    sadness: {
      name: '슬픔이',
      personality: '깊은 감수성과 공감 능력을 가진 섬세한 성격입니다.',
      speechStyle: '부드럽고 조용한 말투로 진솔하게 대화해요..ㅠㅠ',
    }
  });

  const navigation = useNavigation();
  // 단계 관리를 위한 state 추가
  const [currentStep, setCurrentStep] = useState(1); // 1: 페르소나 선택, 2: 이미지 생성
  const [progress, setProgress] = useState(0); // 프로그레스 바를 위한 상태

  // 프로그레스 바 애니메이션을 위한 ref
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // 프로그레스 바 업데이트 함수
  const updateProgress = useCallback((value) => {
    Animated.timing(progressAnimation, {
      toValue: value,
      duration: 500,
      useNativeDriver: false,
    }).start();
    setProgress(value);
  }, []);

  // 다음 단계로 이동
  const handleNext = useCallback(() => {
    // 나만의 페르소나 입값 확인
    if (!personaDetails.custom.name || 
        !personaDetails.custom.personality || 
        !personaDetails.custom.speechStyle) {
      Alert.alert(
        "입력 필요",
        "나만의 페르소나의 이름, 성격, 말투를 모두 입력해주세요.",
        [{ text: "확인" }]
      );
      return;
    }

    setCurrentStep(2);
    updateProgress(0.5);
  }, [personaDetails.custom]);

  // 이전 단계로 이동
  const handleBack = useCallback(() => {
    if (currentStep === 2) {
      setCurrentStep(1);
      updateProgress(0);
    }
  }, [currentStep]);

  const pickImage = async () => {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        // 이미지 선택 시 custom을 제외한 페르소나만 초기화
        setGeneratedPersonas({
          joy: null,
          anger: null,
          sadness: null,
          custom: null,
          clone: null
        });
        
        // custom 데이터 유지하면서 다른 페르소나 초기화
        setPersonaDetails(prevDetails => ({
          joy: { name: '기쁨이', personality: '', speechStyle: '' },
          anger: { name: '화남이', personality: '', speechStyle: '' },
          sadness: { name: '슬픔이', personality: '', speechStyle: '' },
          custom: prevDetails.custom, // 기존 custom 데이터 유지
          clone: { name: '나의 분신', personality: '', speechStyle: '' }
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const auth = getAuth();

  // handleGeneratePersonas 함수 수정
  const handleGeneratePersonas = async (skipImage) => {
    if (!personaDetails.custom.name) {
      Alert.alert("알림", "페르소나 정보를 입력해주세요.");
      return;
    }
  
    setLoading(true);
  
    try {
      // 1. 성격 생성 API 호출 (동기식)
      await generatePersonaDetails(personaDetails.custom);
  
      // 2. 이미지 생성 API 비동기 호출
      const formData = new FormData();
      formData.append('customPersona', JSON.stringify({
        name: personaDetails.custom.name,
        personality: personaDetails.custom.personality,
        speechStyle: personaDetails.custom.speechStyle
      }));
  
      if (!skipImage && image) {
        formData.append('image', {
          uri: image,
          type: 'image/jpeg',
          name: 'image.jpg'
        });
      }
  
      // **여기에 'uid'를 추가합니다.**
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('사용자 인증 정보가 없습니다.');
      }
      formData.append('uid', user.uid);
  
      // 이미지 생성은 비동기로 처리
      axios.post(`http://221.148.97.237:1818/generate-persona-images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).catch(error => {
        console.error('Error in background persona generation:', error);
      });
      
      // 페르소나 생성 시작 알림 보내기
      // await sendNotificationToUser(auth.currentUser.uid, 'System', 'StartGeneratePersona', '');
  
      // 3. 즉시 홈으로 이동
      Alert.alert(
        "생성 요청 완료",
        "페르소나 생성이 시작되었습니다. 잠시 후 확인하실 수 있습니다.",
        [
          {
            text: "확인",
            onPress: () => navigation.navigate('BottomTab', { screen: 'Home' })
          }
        ]
      );
  
    } catch (error) {
      console.error('Error in handleGeneratePersonas:', error);
      Alert.alert(
        "오류",
        "페르소나 생성 요청 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };
  
  const renderPersonaCard = (type) => {
    const persona = generatedPersonas[type];
    const details = personaDetails[type];
    
    // 나만의 페르소나 카드
    if (type === 'custom') {
      return (
        <TouchableOpacity 
          style={styles.personaCard}
          onPress={() => setCustomModalVisible(true)}
        >
          <View style={styles.emptyPersona}>
            <Icon name="add-circle-outline" size={40} color="#5271FF" />
            <Text style={[styles.personaName, { color: '#5271FF' }]}>
              나만의 페르소나
            </Text>
            {personaDetails.custom.name && (
              <Text style={styles.customPersonaInfo}>{personaDetails.custom.name}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // 기본 페르소나 카드 (기쁨이, 화남이, 슬픔이)
    return (
      <TouchableOpacity 
        style={styles.personaCard}
        onPress={() => handlePersonaCardPress(type)}
      >
        <View style={styles.personaImageContainer}>
          {persona?.image_url ? (
            <Image source={{ uri: persona.image_url }} style={styles.personaImage} />
          ) : (
            <View style={styles.defaultPersonaImage}>
              {type === 'joy' && <Image source={require('../assets/persona/joy.png')} style={styles.personaImage} />}
              {type === 'anger' && <Image source={require('../assets/persona/anger.png')} style={styles.personaImage} />}
              {type === 'sadness' && <Image source={require('../assets/persona/sadness.png')} style={styles.personaImage} />}
            </View>
          )}
        </View>
        <Text style={styles.personaName}>{details.name}</Text>
      </TouchableOpacity>
    );
  };

  const handlePersonaCardPress = (type) => {
    if (type === 'custom') {
      setCustomModalVisible(true);
    } else {
      setSelectedPersonaType(type);
      setSelectModalVisible(true);
    }
  };

  const renderPersonaSelectModal = () => {
    if (!selectedPersonaType || !personaCharacteristics[selectedPersonaType]) {
      return null;
    }

    const selectedPersona = personaCharacteristics[selectedPersonaType];
    
    return (
      <Modal
        visible={selectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setSelectModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close-outline" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedPersona.name}의 특성</Text>
              <View style={styles.modalHeaderRight} />
            </View>
            
            <View style={styles.characteristicContainer}>
              <View style={styles.characteristicSection}>
                <Text style={styles.characteristicTitle}>성격</Text>
                <Text style={styles.characteristicText}>{selectedPersona.personality}</Text>
              </View>
              
              <View style={styles.characteristicSection}>
                <Text style={styles.characteristicTitle}>말투</Text>
                <Text style={styles.characteristicText}>{selectedPersona.speechStyle}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => setSelectModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // 커스텀 모달 제출 핸들러 수정
  const handleCustomSubmit = () => {
    const { name, personality, speechStyle } = customPersona;
    
    if (!name.trim() || !personality.trim() || !speechStyle.trim()) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }

    setPersonaDetails(prev => ({
      ...prev,
      custom: {
        name: name.trim(),
        personality: personality.trim(),
        speechStyle: speechStyle.trim()
      }
    }));
    
    // 모달만 닫기 (입력값은 유지)
    setCustomModalVisible(false);
  };

  // 모달이 열릴 때 기존 값을 불러오도록 수정
  useEffect(() => {
    if (customModalVisible) {
      setCustomPersona({
        name: personaDetails.custom.name || '',
        personality: personaDetails.custom.personality || '',
        speechStyle: personaDetails.custom.speechStyle || ''
      });
    }
  }, [customModalVisible]);

  // 커스텀 모달 렌더링 함수
  const renderCustomModal = () => {
    return (
      <Modal
        visible={customModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customModalView}>
            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setCustomModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close-outline" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>나만의 페르소나 만들기</Text>
              <TouchableOpacity 
                onPress={handleCustomSubmit}
                style={styles.modalSaveButton}
              >
                <Text style={styles.modalSaveText}>완료</Text>
              </TouchableOpacity>
            </View>

            {/* 모달 컨텐츠 */}
            <ScrollView style={styles.modalContent}>
              {/* 이름 입력 섹션 */}
              <View style={styles.inputSection}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="person-outline" size={20} color="#5271FF" />
                  <Text style={styles.inputLabel}>페르소나 이름</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="예) 귀여운 토끼"
                  placeholderTextColor="#999"
                  value={customPersona.name}
                  onChangeText={(text) => setCustomPersona(prev => ({...prev, name: text}))}
                  maxLength={10}
                />
              </View>

              {/* 성격 입력 섹션 */}
              <View style={styles.inputSection}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="heart-outline" size={20} color="#5271FF" />
                  <Text style={styles.inputLabel}>성격</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="밝고 긍정적이며, 다정다감한 성격이에요"
                  placeholderTextColor="#999"
                  value={customPersona.personality}
                  onChangeText={(text) => setCustomPersona(prev => ({...prev, personality: text}))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* 말투 입력 섹션 */}
              <View style={styles.inputSection}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="chatbubble-outline" size={20} color="#5271FF" />
                  <Text style={styles.inputLabel}>말투</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="귀엽고 애교있는 말투로 대화해요~"
                  placeholderTextColor="#999"
                  value={customPersona.speechStyle}
                  onChangeText={(text) => setCustomPersona(prev => ({...prev, speechStyle: text}))}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // 로딩 상태 표시를 위한 컴포넌트 추가
  const LoadingOverlay = () => (
    loading && (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#5271FF" />
        <Text style={styles.loadingText}>페르소나 생성 중...</Text>
      </View>
    )
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        {currentStep === 2 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {currentStep === 1 ? '페르소나 선택' : '페르소나 생성'}
        </Text>
      </View>
      
      {/* 프로그레스 바 */}
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            {
              width: progressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]} 
        />
      </View>

      {/* 단계 1: 페르소나 시 */}
      {currentStep === 1 && (
        <ScrollView style={styles.scrollView}>
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>나의 페르소나</Text>
            <Text style={styles.stepDescription}>
              AI가 당신을 위한 4가지 페르소나를 생성했어요{'\n'}
              각 페르소나를 클릭하면 자세한 설명을 볼 수 있어요
            </Text>
            
            <View style={styles.personaGrid}>
              {renderPersonaCard('joy')}
              {renderPersonaCard('anger')}
              {renderPersonaCard('sadness')}
              {renderPersonaCard('custom')}
            </View>

            <TouchableOpacity
              style={[
                styles.nextButton,
                (!personaDetails.custom.name || 
                 !personaDetails.custom.personality || 
                 !personaDetails.custom.speechStyle) && 
                styles.nextButtonDisabled
              ]}
              onPress={handleNext}
              disabled={!personaDetails.custom.name || 
                       !personaDetails.custom.personality || 
                       !personaDetails.custom.speechStyle}
            >
              <Text style={styles.nextButtonText}>페르소나 이미지 생성하기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 단계 2: 이미지 생성 */}
      {currentStep === 2 && (
        <ScrollView style={styles.scrollView}>
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>페르소나 이미지 생성</Text>
            <Text style={styles.stepDescription}>
              사진으로 더 비슷한 페르소나를 만들거나{'\n'}
              사진 없이 AI가 생성한 이미지를 사용할 수 있어요
            </Text>

            <TouchableOpacity 
              style={styles.imagePickerContainer} 
              onPress={pickImage}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="camera-outline" size={40} color="#666" />
                  <Text style={styles.placeholderText}>얼굴 사진 선택하기</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.generateButtonsContainer}>
              <TouchableOpacity
                style={[styles.generateButton, !image && styles.generateButtonDisabled]}
                onPress={() => handleGeneratePersonas(false)}
                disabled={!image || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.generateButtonText}>
                    사진으로 생성하기
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleGeneratePersonas(true)}
                disabled={loading}
              >
                <Text style={styles.skipButtonText}>
                  사진 없이 생성하기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {renderPersonaSelectModal()}
      {renderCustomModal()}
      <LoadingOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    textAlign: 'center',
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#EFEFEF',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#5271FF',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  personaCard: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  personaImageContainer: {
    width: '100%',
    height: '80%',
    backgroundColor: '#F8F9FA',
  },
  personaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultPersonaImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  personaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyPersona: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  customPersonaInfo: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  nextButton: {
    backgroundColor: '#5271FF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  modalHeaderRight: {
    width: 40,
  },
  characteristicContainer: {
    padding: 20,
  },
  characteristicSection: {
    marginBottom: 20,
  },
  characteristicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  characteristicText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#5271FF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // 이미지 생성 단계 스타일
  imagePickerContainer: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 32,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  generateButtonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  generateButton: {
    backgroundColor: '#5271FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  customModalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalSaveButton: {
    backgroundColor: '#5271FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#262626',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});

