import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const ProfileGallery = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const db = getFirestore();

  useEffect(() => {
    const fetchPosts = async () => {
      if (!user?.uid) return;
      
      try {
        const q = query(
          collection(db, 'feeds'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedPosts = querySnapshot.docs.map(doc => ({
          folderId: doc.id,
          id: doc.id,
          ...doc.data()
        }));
        
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { post });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>게시물</Text>
          <Text style={styles.count}>0</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color="#A0A0A0" />
          <Text style={styles.emptyText}>아직 게시물이 없습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>게시물</Text>
        <Text style={styles.count}>{posts.length}</Text>
      </View>
      <View style={styles.galleryGrid}>
        {posts.map((post, index) => (
          <TouchableOpacity 
            key={`${post.id}_${index}`}
            style={styles.imageContainer}
            onPress={() => handlePostPress(post)}
          >
            <Image 
              source={{ uri: post.image }} 
              style={styles.image}
            />
            <View style={styles.imageOverlay}>
              <View style={styles.statsContainer}>
                <Ionicons name="heart" size={16} color="#FFF" />
                <Text style={styles.statsText}>
                  {post.likes?.length || 0}
                </Text>
                <Ionicons name="chatbubble" size={16} color="#FFF" style={styles.commentIcon} />
                <Text style={styles.statsText}>
                  {post.subCommentId?.length || 0}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 8,
  },
  count: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    padding: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 12,
  },
  commentIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 16,
  }
});

export default ProfileGallery;