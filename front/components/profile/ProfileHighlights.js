import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';


const ProfileHighlights = () => {
  const navigation = useNavigation();
  const user = useSelector(state => state.user.user);
  const [userData, setUserData] = useState(null);
  const [highlights, setHighlights] = useState([]);

  const db = getFirestore();

  useEffect(() => {
    if (user && user.uid) {
      const unsub = onSnapshot(
        doc(db, 'users', user.uid),
        { includeMetadataChanges: true },
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            setUserData(docSnapshot.data());
          }
        }
      );

      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    if (userData && userData.persona) {
      if (Array.isArray(userData.persona)) {
        const newHighlights = userData.persona
          .filter(persona => persona.Name !== 'clone')
          .map((persona, index) => ({
            id: index + 1,
            title: persona.DPNAME,
            persona: persona.Name,
            image: persona.IMG,
            description: persona.description,
            tone: persona.tone,
            example: persona.example
          }));
        setHighlights(newHighlights);
      }
    }
  }, [userData]);


  const handleHighlightPress = (highlight) => {
    navigation.navigate('Chat', { highlightTitle: highlight.title, highlightImage: highlight.image, persona: highlight.persona });
  };

  const renderHighlightContent = (highlight) => {
    if (highlight.image) {
      return (
        <Image 
          source={{ uri: highlight.image }} 
          style={styles.highlightImage}
          onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
        />
      );
    } else {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0000ff" />
          <Text style={styles.loadingText}>생성중</Text>
        </View>
      );
    }
  };

  const handleAddPersona = () => {
    navigation.navigate('PlayGround', { fromProfile: true });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>나의 페르소나</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity 
          style={styles.addCard}
          onPress={handleAddPersona}
        >
          <View style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
          <Text style={styles.addText}>새로운 페르소나</Text>
        </TouchableOpacity>

        {highlights.map((highlight) => (
          <TouchableOpacity 
            key={highlight.id} 
            style={styles.personaCard}
            onPress={() => handleHighlightPress(highlight)}
          >
            <View style={styles.imageWrapper}>
              {renderHighlightContent(highlight)}
              <View style={styles.personaBadge}>
                <Ionicons 
                  name={getBadgeIcon(highlight.persona)} 
                  size={14} 
                  color="#fff" 
                />
              </View>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.personaTitle}>{highlight.title}</Text>
              <Text style={styles.personaType} numberOfLines={1}>
                {highlight.description?.slice(0, 15)}...
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getBadgeIcon = (persona) => {
  const iconMap = {
    custom: 'person',
  };
  return iconMap[persona] || 'person';
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
    color: '#1A1A1A',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  addCard: {
    width: 120,
    height: 160,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '500',
  },
  personaCard: {
    width: 120,
    height: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 12,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
  },
  highlightImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  personaBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    marginTop: 8,
  },
  personaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  personaType: {
    fontSize: 12,
    color: '#6C757D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 11,
    color: '#4A90E2',
    marginTop: 4,
  },
});

export default ProfileHighlights;
