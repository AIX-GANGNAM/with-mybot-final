import { ScrollView, Pressable, TextInput, StyleSheet, TouchableOpacity, View, Text, Image, ToastAndroid, Modal } from 'react-native';
import { Divider } from 'react-native-elements';
import React, {useState, useEffect } from 'react';
import {getFirestore, doc, updateDoc ,collection, getDoc , addDoc} from 'firebase/firestore';
import { useSelector } from 'react-redux';
import PostHeader from '../newPost/PostHeader';
import PostImage from '../newPost/PostImage';
import Likes from '../newPost/Likes';
import Caption from '../newPost/Caption';
import CommentsPreview from '../newPost/CommentsPreview';
import CommentModal from '../newPost/CommentModal';
import PostFooter from '../newPost/PostFooter';
import { Ionicons } from '@expo/vector-icons'; // Expo용 vector-icons import
import axios from 'axios';
import { Platform } from 'react-native';

const Post = ({post, refreshPosts, navigation}) => {
   // post가 undefined인 경우를 처리
   if (!post) {
     return null; // 또는 로딩 인디케이터나 에러 메시지를 표시할 수 있습니다.
   }

   // 댓글 갯수 계산 로직 수정
   const [commentCount, setCommentCount] = useState(() => {
     const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
     const subCommentsCount = Array.isArray(post.subCommentId) ? post.subCommentId.length : 0;
     return commentsCount + subCommentsCount;
   });

   // comments 상태도 수정
   const comments = [...(post.comments || []), ...(post.subCommentId || [])];

   // useEffect로 댓글 갯수 업데이트 감지
   useEffect(() => {
     const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
     const subCommentsCount = Array.isArray(post.subCommentId) ? post.subCommentId.length : 0;
     setCommentCount(commentsCount + subCommentsCount);
   }, [post.comments, post.subCommentId]);

   const [comment, setComment] = useState(false);
   const [like, setLike] = useState(false);
   const [newComment, setNewComment] = useState('');
   const [showFullCaption, setShowFullCaption] = useState(false);
   const [showCommentModal, setShowCommentModal] = useState(false);

   const user = useSelector(state => state.user.user);
   const db = getFirestore();
   const [isLiked, setIsLiked] = useState(false);
   const [likeCount, setLikeCount] = useState(0);

   const [userProfileImg, setUserProfileImg] = useState(null);

   useEffect(() => {
     if (Array.isArray(post.likes)) {
       setIsLiked(post.likes.includes(user.uid));
       setLikeCount(post.likes.length);
     } else {
       setIsLiked(false);
       setLikeCount(0);
     }
   }, [post.likes, user.uid]);

   // 사용자 프로필 이미지 가져오기
   useEffect(() => {
     const fetchUserProfile = async () => {
       if (!post.userId) return;

       try {
         // personaprofileImage가 있으면 그것을 사용
         if (post.personaprofileImage) {
           setUserProfileImg(post.personaprofileImage);
           return;
         }
         
         const userDoc = await getDoc(doc(db, 'users', post.userId));
         
         if (userDoc.exists()) {
           setUserProfileImg(userDoc.data().profileImg);
         }
       } catch (error) {
         console.error('프로필 이미지 가져오기 실패:', error);
       }
     };

     fetchUserProfile();
   }, [post.userId, post.personaprofileImage, db]);

   const handleLike = async () => {
     try {
       const postRef = doc(db, 'feeds', post.folderId);
       let updatedLikes = Array.isArray(post.likes) ? [...post.likes] : [];

       if (isLiked) {
         updatedLikes = updatedLikes.filter(id => id !== user.uid);
       } else {
         updatedLikes.push(user.uid);
       }

       await updateDoc(postRef, { likes: updatedLikes });

       setIsLiked(!isLiked);
       setLikeCount(updatedLikes.length);
     } catch (error) {
       console.error('좋아요 처리 중 류 발생:', error);
     }
   };

   const addComment = async () => {
     if (newComment.trim() !== '') {
       try {
         const db = getFirestore();
         const postRef = doc(db, 'feeds', post.folderId);
         
         const newCommentData = {
           nick: user.userId,
           content: newComment,
           profileImg: user.profileImg,
           uid: user.uid,
           createdAt: new Date().toISOString(),
           // subCommentId는 페르소나 댓글일 때만 추가됨
         }

         const docSnap = await getDoc(postRef);
         if (docSnap.exists()) {
           const currentData = docSnap.data();
           const currentComments = currentData.subCommentId || [];
           const newComments = [...currentComments, newCommentData];

           await updateDoc(postRef, { subCommentId: newComments });
           setComments(prevComments => [...prevComments, newCommentData]);
           setNewComment('');
           setCommentCount(prev => prev + 1);
         }
       } catch (error) {
         console.error('댓글 추가 중 오류 발생:', error);
       }
     }
   };

   const today = new Date();
   const postDate = new Date(post.createdAt);
   const diffTime = Math.abs(today.getTime() - postDate.getTime());
   const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

   let timeAgo;
   if (diffDays === 0) {
     if (diffHours === 0) {
       timeAgo = '방금 전';
     } else {
       timeAgo = `${diffHours}시간 전`;
     }
   } else if (diffDays === 1) {
     timeAgo = '어제';
   } else {
     timeAgo = `${diffDays}일 전`;
   }


   

   return(
     <View style={styles.container}>
      <View style={styles.postContainer}>
        <View style={styles.leftColumn}>
          <Image
            source={userProfileImg 
              ? {uri: userProfileImg} 
              : require('../../assets/no-profile.png')
            }
            style={styles.profileImage}
          />
          <View style={styles.verticalLine} />
        </View>

        {/* 오른쪽 컨텐츠 컬럼 */}
        <View style={styles.rightColumn}>
          {/* PostHeader 컴포넌트 */}
          <PostHeader 
            post={post} 
            onEdit={() => console.log('Edit post:', post.id)}
            onDelete={() => console.log('Delete post:', post.id)}
          />

          {/* 본문 영역 */}
          <View style={styles.contentContainer}>
            <Caption 
              post={post} 
              showFullCaption={showFullCaption} 
              setShowFullCaption={setShowFullCaption} 
            />

            {/* 이미지가 있을 경우에만 표시 */}
            {post.image && (
              <View style={styles.imageWrapper}>
                <PostImage post={post} />
              </View>
            )}
          </View>

          {/* 인터랙션 영역 */}
          <View style={styles.interactionBar}>
            <TouchableOpacity 
              style={styles.interactionButton}
              onPress={() => setShowCommentModal(true)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#536471" />
              <Text style={styles.interactionCount}>{commentCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.interactionButton}>
              <Ionicons name="repeat-outline" size={22} color="#536471" />
              <Text style={styles.interactionCount}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.interactionButton}
              onPress={handleLike}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={isLiked ? "#F91880" : "#536471"}
              />
              <Text style={[
                styles.interactionCount,
                isLiked && styles.likedCount
              ]}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.interactionButton}>
              <Ionicons name="bookmark-outline" size={20} color="#536471" />
            </TouchableOpacity>
          </View>

          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
      </View>

      <CommentModal 
        visible={showCommentModal} 
        setVisible={setShowCommentModal} 
        newComment={newComment} 
        setNewComment={setNewComment} 
        addComment={addComment} 
        post={post} 
        setCommentCount={setCommentCount}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F4',
    backgroundColor: '#fff',
  },
  postContainer: {
    flexDirection: 'row',
    padding: 12,
  },
  leftColumn: {
    marginRight: 12,
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EFF3F4',
    marginVertical: 4,
  },
  rightColumn: {
    flex: 1,
  },
  contentContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  imageWrapper: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 48,
    marginTop: 4,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionCount: {
    marginLeft: 4,
    color: '#536471',
    fontSize: 13,
  },
  likedCount: {
    color: '#F91880',
  },
  timeAgo: {
    fontSize: 12,
    color: '#536471',
    marginTop: 8,
  },
});

export default Post;
