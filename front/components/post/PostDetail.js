import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { sendNotificationToUser } from '../notification/SendNotification';

const PostDetail = ({ route }) => {
  console.log("PostDetail.js > 호출됨");
  const { post } = route.params;
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const currentUser = useSelector(state => state.user.user);
  const db = getFirestore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const fetchUserAndComments = async () => {
      try {
        // 게시물 작성자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', post.userId));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }

        // 댓글 가져오기
        if (post.subCommentId && post.subCommentId.length > 0) {
          const commentsData = [];
          for (const commentData of post.subCommentId) {
            const userDoc = await getDoc(doc(db, 'users', commentData.uid));
            commentsData.push({
              ...commentData,
              userProfile: userDoc.data()
            });
          }
          setComments(commentsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndComments();
  }, [post]);

  useEffect(() => {
    if (post && post.likes) {
      // likes 배열이 존재하는지 확인하고 현재 사용자의 좋아요 여부 확인
      setIsLiked(Array.isArray(post.likes) && post.likes.includes(currentUser.uid));
      setLikeCount(Array.isArray(post.likes) ? post.likes.length : 0);
    } else {
      setIsLiked(false);
      setLikeCount(0);
    }
  }, [post, currentUser.uid]);

  const handleBack = () => {
    navigation.goBack();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLike = async () => {
    try {
      const postRef = doc(db, 'feeds', post.folderId || post.id);
      
      // 현재 게시물의 최신 데이터 가져오기
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        console.error('게시물을 찾을 수 없습니다.');
        return;
      }

      const currentLikes = postSnap.data().likes || [];
      let updatedLikes;

      if (isLiked) {
        // 좋아요 취소
        updatedLikes = currentLikes.filter(id => id !== currentUser.uid);
      } else {
        // 좋아요 추가
        updatedLikes = [...currentLikes, currentUser.uid];
      }

      // Firestore 업데이트
      const firebaseUpdateResponse = await updateDoc(postRef, {
        likes: updatedLikes
      });
      console.log('firebaseUpdateResponse : ', firebaseUpdateResponse);
      const sendNotificationResponse = sendNotificationToUser(post.userId, currentUser.uid, 'Like', post.id);
      console.log('sendNotificationResponse : ', sendNotificationResponse);

      // 상태 업데이트
      setIsLiked(!isLiked);
      setLikeCount(updatedLikes.length);
    } catch (error) {
      console.error('좋아요 처리 중 오류:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      '게시물 삭제',
      '정말로 이 게시물을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'feeds', post.folderId));
              navigation.goBack();
              Alert.alert('삭제 완료', '게시물이 삭제되었습니다.');
            } catch (error) {
              console.error('게시물 삭제 중 오류:', error);
              Alert.alert('오류', '게시물 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시물</Text>
        {currentUser.uid === post.userId && (
          <TouchableOpacity onPress={() => setShowOptions(!showOptions)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        )}
      </View>

      {showOptions && (
        <View style={styles.optionsModal}>
          <TouchableOpacity 
            style={[styles.optionItem, styles.deleteOption]} 
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.deleteText}>삭제하기</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* 작성자 정보 */}
        <View style={styles.authorSection}>
          <Image 
            source={{ uri: userProfile?.profileImg }} 
            style={styles.authorImage} 
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{userProfile?.userId}</Text>
            <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
          </View>
        </View>

        {/* 게시물 내용 */}
        <View style={styles.postContent}>
          <Text style={styles.caption}>{post.caption}</Text>
          {post.image && (
            <Image 
              source={{ uri: post.image }} 
              style={styles.postImage}
              resizeMode="cover"
            />
          )}
        </View>

        {/* 상호작용 섹션 */}
        <View style={styles.interactionBar}>
          <View style={styles.interactionStats}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={handleLike}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={isLiked ? "#F91880" : "#1A1A1A"} 
              />
              <Text style={[styles.statText, isLiked && styles.likedText]}>
                {likeCount}
              </Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={24} color="#1A1A1A" />
              <Text style={styles.statText}>{comments.length}</Text>
            </View>
          </View>
        </View>

        {/* 댓글 섹션 */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>댓글</Text>
          {comments.map((comment, index) => (
            <View key={index} style={styles.commentItem}>
              <Image 
                source={{ uri: comment.userProfile?.profileImg }} 
                style={styles.commentAuthorImage} 
              />
              <View style={styles.commentContent}>
                <Text style={styles.commentAuthor}>
                  {comment.userProfile?.userId}
                </Text>
                <Text style={styles.commentText}>{comment.content}</Text>
                <Text style={styles.commentDate}>
                  {formatDate(comment.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 댓글 입력 */}
      <View style={styles.commentInput}>
        <Image 
          source={{ uri: currentUser?.profileImg }} 
          style={styles.currentUserImage} 
        />
        <TextInput
          style={styles.input}
          placeholder="댓글을 입력하세요..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            { opacity: newComment.trim() ? 1 : 0.5 }
          ]}
          disabled={!newComment.trim()}
        >
          <Ionicons name="send" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  postDate: {
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 2,
  },
  postContent: {
    padding: 16,
  },
  caption: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  interactionBar: {
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F2F2F2',
  },
  interactionStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#1A1A1A',
  },
  commentsSection: {
    padding: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAuthorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  commentText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 4,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    backgroundColor: '#fff',
  },
  currentUserImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    marginHorizontal: 12,
    padding: 8,
    maxHeight: 100,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    fontSize: 14,
  },
  sendButton: {
    padding: 8,
  },
  optionsModal: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
  },
  deleteText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#FF3B30',
  },
  likedText: {
    color: '#F91880',
  },
});

export default PostDetail;