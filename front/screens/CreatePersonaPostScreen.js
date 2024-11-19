import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import sendNotificationToUser from '../components/notification/SendNotification';

const CreatePersonaPostScreen = ({ route, navigation }) => {
  console.log('CreatePersonaPostScreen 실행');
  const { persona, id, parentNick, userId } = route.params;
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customKeyword, setCustomKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    fetchTrendingKeywords();
  }, []);

  const fetchTrendingKeywords = async () => {
    try {
      const response = await axios.get('http://10.0.2.2:8010/trendingKeywords');
    //   console.log('실시간 검색어 응답:', response.data);
      
      // trending_keywords 배열 추출
      if (response.data && response.data.trending_keywords) {
        setTrendingKeywords(response.data.trending_keywords);
      } else {
        console.error('응답 데이터 형식이 올바르지 않습니다:', response.data);
        setTrendingKeywords([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('실시간 검색어 가져오기 실패:', error);
      Alert.alert('오류', '실시간 검색어를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleKeywordSubmit = async (keyword) => {
    if (!keyword.trim()) {
      Alert.alert('알림', '키워드를 입력해주세요.');
      return;
    }

    console.log(persona);
    
    setIsSubmitting(true);
    try {
      const response = await axios.post('http://10.0.2.2:8010/generateFeed', {
        keyword,
        persona_type: persona.type,
        // id: id,
        parentNick: parentNick,
        userId: userId,
        title : persona.title
      });
      const sendNotificationResponse = sendNotificationToUser(userId, persona.type, 'FeedGeneration', response.data.uuid);
      console.log('sendNotificationResponse : ', sendNotificationResponse);
      
    //   navigation.navigate('PostPreview', { 
    //     postData: response.data,
    //     persona: persona 
    //   });
    } catch (error) {
      console.error('포스트 생성 실패:', error);
      Alert.alert('오류', '포스트 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTrendingItems = () => {
    const leftItems = trendingKeywords.slice(0, 10);  // 1-10위
    const rightItems = trendingKeywords.slice(10, 20); // 11-20위
    
    return (
      <View style={styles.trendingContainer}>
        <View style={styles.trendingColumns}>
          <View style={styles.trendingColumn}>
            {leftItems.map((item, index) => renderTrendingItem(item, index))}
          </View>
          <View style={styles.trendingColumn}>
            {rightItems.map((item, index) => renderTrendingItem(item, index + 10))}
          </View>
        </View>
      </View>
    );
  };

  const renderTrendingItem = (item, index) => (
    <TouchableOpacity 
      key={index}
      style={styles.trendingItem}
      onPress={() => handleKeywordSubmit(item)}
      disabled={isSubmitting}
    >
      <Text style={styles.rankNumber}>{index + 1}</Text>
      <Text style={styles.keywordText} numberOfLines={1} ellipsizeMode="tail">
        {item}
      </Text>
      <Icon name="chevron-forward-outline" size={16} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{persona.title}의 관점에서 피드를 자동 생성합니다.</Text>
        <Text style={styles.headerSubtitle}>
          실시간 인기 검색어를 선택하거나{'\n'}직접 키워드를 입력해보세요.
        </Text>
      </View>
      <View style={styles.trendingSection}>
        <Text style={styles.sectionTitle}>추천 키워드(실시간 인기 검색어)</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0095f6" />
        ) : (
          <View style={styles.trendingContainer}>
            <ScrollView>
              {renderTrendingItems()}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.customInputSection}>
        <Text style={styles.sectionTitle}>직접 키워드 입력</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={customKeyword}
            onChangeText={setCustomKeyword}
            placeholder="키워드를 입력하세요..."
            editable={!isSubmitting}
          />
          <TouchableOpacity
            style={[styles.submitButton, (!customKeyword || isSubmitting) && styles.disabledButton]}
            onPress={() => handleKeywordSubmit(customKeyword)}
            disabled={!customKeyword || isSubmitting}
          >
            <Text style={styles.submitButtonText}>생성</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0095f6" />
          <Text style={styles.loadingText}>포스트 생성 중...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  trendingSection: {
    flex: 2,
    padding: 16,
  },
  customInputSection: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  trendingList: {
    flex: 1,
  },
  trendingContainer: {
    paddingTop: 2,
    paddingHorizontal: 2,
  },
  trendingColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendingColumn: {
    width: '49%',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    height: 32,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0095f6',
    width: 24,
  },
  keywordText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#0095f6',
    paddingHorizontal: 20,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#b2dffc',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default CreatePersonaPostScreen; 