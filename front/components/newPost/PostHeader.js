import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal } from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

const PostHeader = ({post, onEdit, onDelete}) => {
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [profileImg, setProfileImg] = useState(null);
  
    useEffect(() => {
      const fetchUserData = async () => {
        if (post.personaprofileImage) {
          setProfileImg(post.personaprofileImage);
          return;
        }
        
        const user = post.userId;
        const db = getFirestore();
        const postDoc = doc(db, 'users', user);
        try {
          const docSnap = await getDoc(postDoc);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setProfileImg(userData.profileImg);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
  
      fetchUserData();
    }, [post.userId, post.personaprofileImage]);
  
    return(
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <TouchableOpacity>
            {/* <Image
              style={styles.profileImage}
              source={profileImg ? {uri: profileImg} : require('../../assets/no-profile.png')} 
            /> */}
          </TouchableOpacity>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{post.nick || '사용자'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.moreButton} 
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#536471" />
        </TouchableOpacity>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showOptionsModal}
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsModal(false)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setShowOptionsModal(false);
                  onEdit?.(post);
                }}
              >
                <Ionicons name="pencil-outline" size={24} color="#0F1419" />
                <Text style={styles.modalOptionText}>수정하기</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setShowOptionsModal(false);
                  onDelete?.(post);
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#F4212E" />
                <Text style={[styles.modalOptionText, styles.deleteText]}>
                  삭제하기
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    marginLeft: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
  },
  moreButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '80%',
    padding: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#0F1419',
  },
  deleteText: {
    color: '#F4212E',
  },
});

export default PostHeader;