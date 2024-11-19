import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { HeartIcon as HeartOutline, ChatBubbleOvalLeftIcon, PaperAirplaneIcon, BookmarkIcon } from 'react-native-heroicons/outline';
import { HeartIcon as HeartSolid } from 'react-native-heroicons/solid';
import { useSelector } from 'react-redux';
import { StyleSheet } from 'react-native';
import { ToastAndroid } from 'react-native';


const PostFooter = ({post, setShowCommentModal, commentCount, setCommentCount}) => {
    const [bookmark, setBookmark] = useState(false);
    const user = useSelector(state => state.user.user);
    const db = getFirestore();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);


  
    useEffect(() => {
      if (Array.isArray(post.likes)) {
        setIsLiked(post.likes.includes(user.uid));
        setLikeCount(post.likes.length);
      } else {
        setIsLiked(false);
        setLikeCount(0);
      }
    }, [post.likes, user.uid]);
  
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
  
        // 로컬 상태 업데이트
        setIsLiked(!isLiked);
        setLikeCount(updatedLikes.length);
      } catch (error) {
        console.error('좋아요 처리 중 류 발생:', error);
      }
    };
  
    const bookmarkBtn = () => {
            const message = bookmark ? 'Bookmark removed' : 'Bookmark added succesfully';
            setBookmark(!bookmark);
            ToastAndroid.showWithGravityAndOffset(
                  message,
                  ToastAndroid.LONG,
                  ToastAndroid.CENTER,
                  25,
                  50,
           );
    }
  
    return(
      <View>
        <View style={styles.postFooter}>
          <View style={styles.postIcon}>
            <TouchableOpacity onPress={handleLike} style={styles.icon}>
              {isLiked ? <HeartSolid color='red' size={28} /> : <HeartOutline color='black' size={28} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCommentModal(true)} style={styles.icon}>
              <ChatBubbleOvalLeftIcon color='black' size={28} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.icon}>
              <PaperAirplaneIcon color='black' size={28} style={{transform: [{rotate: '-45deg'}], marginTop: -5}} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={bookmarkBtn} style={{marginRight: 10}}>
            <BookmarkIcon color={bookmark ? 'black' : 'black'} size={28} />
          </TouchableOpacity>
        </View>
        <View style={styles.likeSection}>
          <Text style={styles.likeText}>좋아요 {likeCount}개</Text>
        </View>
        
      </View>
    );
  }

const styles = StyleSheet.create({
    postFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 15,
      },
      postIcon: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      icon: {
        marginRight: 15,
      },
      likeSection: {
        paddingHorizontal: 15,
        paddingBottom: 10,
      },
      likeText: {
        fontWeight: 'bold',
        fontSize: 14,
        color: 'black',
      },
});

export default PostFooter;
