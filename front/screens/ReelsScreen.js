import { useState, useRef ,useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Animated, PanResponder, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {getFirestore, collection, doc, updateDoc} from 'firebase/firestore';
import {useFocusEffect} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Village from '../components/village/Village';
import sendNotification from '../components/notification/SendNotification';

import VillageV3 from '../components/village/villageV3';
import VillageV2 from '../components/village/VillageV2';


export default function ReelsScreen() {
  console.log("ReelsScreen > 화면 진입");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dotImages, setDotImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const panY = useRef(new Animated.Value(0)).current;
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('village');
  const [selectedType, setSelectedType] = useState('스타일');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 화면에 포커스가 올 때마다 실행
      setSelectedType('스타일');
      setIsDropdownOpen(false);
      setActiveTab('village');
      setSelectedImage(null);
      setModalVisible(false);
    }, [])
  );
  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: 1000,
    duration: 300,
    useNativeDriver: true,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: (e, gs) => {
        panY.setValue(gs.dy);
      },
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 50) {
          closeAnim.start(() => setModalVisible(false));
        } else {
          resetPositionAnim.start();
        }
      },
    })
  ).current;

  const user = useSelector((state) => state.user.user);

  const profileImage = user.profileImg;

  const pickImage = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("사진 접근 권한이 필요합니다!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  

  const handleButtonPress = async () => {

    if (!image) {
      alert("경고", "이미지를 선택해주세요.");
      return;
    }
    
    if (selectedType === '스타일') {
      alert("경고", "스타일을 선택해주세요.");
      return;
    }

    setLoading(true);
    const userId = user.uid;

    const formData = new FormData();
    formData.append('image', {
      uri: image,
      type: 'image/jpeg',
      name: 'image.jpg'
    });

    try {
      

      const response = await axios.post(`http://221.148.97.237:1818/generate-persona-image/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("response", response.data);

      
      if (response.data.status === 'complete') {
        
        const images = response.data.images;
        const imageUrls = Object.values(images).map(item => item.image_url);
        const whoSendMessageResult=sendNotification(user.uid,'System', '없음', 'Playground');
        console.log("ReelsScreen > handleButtonPress > whoSendMessageResult", whoSendMessageResult);
        setDotImages(imageUrls);
      }
    } catch (error) {
      console.log("error > ReelsScreen > handleButtonPress >", error.response ? error.response.data : error.message);
      alert("오류", "이미지 생성 중 오류가 발생했습니다.");
    } finally {

      setLoading(false);
    }
  };

  const handleDotPress = (image, index) => {
    setSelectedImage(image);
    setModalVisible(true);
    setSelectedImageIndex(index);
    resetPositionAnim.start();
  };

  const translateY = panY.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, 1],
  });

  const handleEditImage = async () => {
    setIsGenerating(true);
    let persona = null;
    switch(selectedImageIndex) {
      case 0: persona = "joy"; break;
      case 1: persona = "sadness"; break;
      case 2: persona = "anger"; break;
      case 3: persona = "disgust"; break;
      case 4: persona = "serious"; break; 
    }

    const formData = new FormData();
    formData.append('image', {
      uri: image,
      type: 'image/jpeg',
      name: 'image.jpg'
    });

    try {
      const response = await axios.post(`http://221.148.97.237:1818/regenerate-image/${persona}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("response", response.data);

      setSelectedImage(response.data.image_url);
      dotImages[selectedImageIndex] = response.data.image_url;
      setDotImages([...dotImages]);
    } catch (error) {
      console.log("error", error.response ? error.response.data : error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmImage = async () => {
    setModalVisible(false);
    if(!selectedImage || !user.uid) {
      console.log("이미지 또는 유저 아이디가 없습니다.");
      return;
    }

    const db = getFirestore();
    const userDoc = doc(db, 'users', user.uid);

    let emotionKey;
    switch(selectedImageIndex) {
      case 0: emotionKey = "joy"; break;
      case 1: emotionKey = "sadness"; break;
      case 2: emotionKey = "anger"; break;
      case 3: emotionKey = "disgust"; break;
      case 4: emotionKey = "serious"; break;
      default:
        console.log("잘못된 이미지 인덱스");
        return;
    }

    try {
      await updateDoc(userDoc, {
        [`persona.${emotionKey}`]: selectedImage
      });
      console.log(`${emotionKey} 이미지가 성공적으로 업데이트되었습니다.`);
    } catch (error) {
      console.error("이미지 업데이트 중 오류 발생:", error);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setIsDropdownOpen(false);
  };

  const renderDotImage = (index) => {
    if (loading) {
      return (
        <View style={styles.dotImageContainer}>
          <ActivityIndicator size="large" color="#5271ff" style={styles.dotImageLoader} />
        </View>
      );
    }
    return dotImages[index] ? (
      <Image source={{ uri: dotImages[index] }} style={styles.dotImage} />
    ) : (
      <View style={styles.skeleton} />
    );
  };

  const renderContent = () => {
    if (activeTab === 'imageGeneration') {
      return (
        // 기존의 이미지 생성 관련 컴포넌트들
        <View style={styles.contentContainer}>
          
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text style={styles.dropdownButtonText}>{selectedType}</Text>
                <Ionicons 
                  name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#262626" 
                />
                {isDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity 
                      style={styles.dropdownItem} 
                      onPress={() => handleTypeSelect('사람')}
                    >
                      <Text style={styles.dropdownItemText}>사람</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dropdownItem} 
                      onPress={() => handleTypeSelect('동물')}
                    >
                      <Text style={styles.dropdownItemText}>동물</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            
          
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>+</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.text}>당신의 사진을 넣어주세요</Text>
          
          <View style={styles.dotsContainer}>
            <View style={styles.dotsRow}>
              {[...Array(3)].map((_, i) => (
                <TouchableOpacity key={i} onPress={() => dotImages[i] && handleDotPress(dotImages[i], i)}>
                  <View style={dotImages[i] || styles.skeleton}>
                  {dotImages[i] && <Image source={{ uri: dotImages[i] }} style={styles.dotImage} />}
                  </View>
                    

                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dotsRow}>
              {[...Array(2)].map((_, i) => (
                <TouchableOpacity key={i + 3} onPress={() => dotImages[i + 3] && handleDotPress(dotImages[i + 3], i+3)}>
                  <View style={dotImages[i + 3] || styles.skeleton}>
                    {dotImages[i + 3] && <Image source={{ uri: dotImages[i + 3] }} style={styles.dotImage} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, (loading || !image || selectedType === '스타일') && styles.disabledButton]} 
            onPress={handleButtonPress}
            disabled={loading || !image || selectedType === '스타일'}
          >
            <Text style={styles.buttonText}>
              {loading ? '생성중...' : '새로운 친구 만들기'}
            </Text>
          </TouchableOpacity>

        </View>
      );
    } else {
      return (
        <View style={styles.villageContainer}>
          {/* <VillageV3 /> */}
          <VillageV2 />
        </View>
      );
    }
  };




  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {/* <TouchableOpacity
          style={[styles.tabButton, activeTab === 'imageGeneration' && styles.activeTabButton]}
          onPress={() => setActiveTab('imageGeneration')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'imageGeneration' && styles.activeTabButtonText]}>Generate AI</Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'village' && styles.activeTabButton]}
          onPress={() => setActiveTab('village')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'village' && styles.activeTabButtonText]}>Village</Text>
        </TouchableOpacity>
      </View>
      {renderContent()}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[styles.modalView, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIndicator} />
            </View>
            <View style={styles.modalContent}>
              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0095F6" />
                  <Text style={styles.loadingText}>이미지 생성 중...</Text>
                </View>
              ) : (
                <>
                  <Image source={{ uri: selectedImage }} style={styles.modalImage} />
                  <View style={styles.modalTextContainer}>
                    <Text style={styles.modalText}>안녕?</Text>
                  </View>
                </>
              )}
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#EFEFEF' }]} onPress={handleEditImage}>
                <Text style={[styles.buttonText, { color: '#262626' }]}>이미지 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleConfirmImage}>
                <Text style={styles.buttonText}>이미지 확정</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#DBDBDB',
  },
  activeTabButton: {
    borderBottomColor: '#5271ff',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#262626',
  },
  activeTabButtonText: {
    color: '#5271ff',
    fontWeight: 'bold',
  },

  villageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  placeholderText: {
    fontSize: 40,
    color: '#AAAAAA',
  },
  placeholderSubText: {
    fontSize: 16,
    color: '#AAAAAA',
    marginTop: 5,
  },
  text: {
    marginBottom: 20,
    fontSize: 16,
    color: '#262626',
  },
  dotsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dotImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  skeleton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFEFEF',
    marginHorizontal: 10,
  },
  button: {
    backgroundColor: '#5271ff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 0,  // 상단 패딩 제거
    paddingHorizontal: 35,
    paddingBottom: 35,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    height: '80%',
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalTextContainer: {
    width: '80%',
    height: '30%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#262626',
  },
  dropdownContainer: {
    width: '80%',
    marginBottom: 20,
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#262626',

  },
  dropdownMenu: {
    position: 'absolute',
    top: '150%', // 버튼 바로 아래에 위치
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    marginTop: 5,
  },
  dropdownItem: {
    padding: 10,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#262626',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
});