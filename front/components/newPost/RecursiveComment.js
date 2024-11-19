import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RecursiveComment = ({ 
  comment, 
  handleLike, 
  toggleReplies, 
  expandedComments, 
  setReplyTo, 
  setReplyToUser, 
  user,
  onDebatePress,
  navigation
}) => {
  const isLiked = comment.likes && comment.likes.includes(user.uid);
  const likeCount = comment.likes ? comment.likes.length : 0;
  const replyCount = comment.replies ? comment.replies.length : 0;
  
  const isPersonaComment = comment.userId && comment.userId.includes('_');
  
  const getPersonaName = () => {
    if (!isPersonaComment) return '';
    return comment.userId.split('_')[1];
  };

  const handleDebatePress = () => {
    if (isPersonaComment) {
      console.log('Calling onDebatePress with ID:', comment.debateId);
      onDebatePress(comment.debateId, comment.content, getPersonaName());
    }
  };

  const getTimeAgo = (createdAt) => {
    if (!createdAt) return '';
    
    const now = new Date();
    const created = new Date(createdAt);
    const diffInSeconds = Math.floor((now - created) / 1000);
    
    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    
    return created.toLocaleDateString();
  };

  return (
    <View style={styles.commentItem}>
      <View style={[
        styles.commentContainer,
        isPersonaComment && styles.personaCommentContainer
      ]}>
        {/* 왼쪽 프로필 컬럼 */}
        <View style={styles.leftColumn}>
          <Image
            style={[
              styles.commentAvatar,
              isPersonaComment && styles.personaAvatar
            ]}
            source={comment.profileImg ? { uri: comment.profileImg } : require('../../assets/no-profile.png')}
          />
          {(comment.replies && comment.replies.length > 0) && (
            <View style={styles.replyLine} />
          )}
        </View>

        {/* 오른쪽 컨텐츠 컬럼 */}
        <View style={styles.rightColumn}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUser}>{comment.nick}</Text>
            {isPersonaComment && (
              <View style={styles.personaBadge}>
                <Text style={styles.personaBadgeText}>{getPersonaName()}</Text>
              </View>
            )}
            <Text style={styles.commentTime}>
              · {getTimeAgo(comment.createdAt)}
            </Text>
          </View>

          <Text style={styles.commentText}>{comment.content}</Text>

          {isPersonaComment && (
            <TouchableOpacity 
              style={styles.debateButton}
              onPress={handleDebatePress}
            >
              <Ionicons name="chatbubbles-outline" size={16} color="#0095F6" />
              <Text style={styles.debateButtonText}>토론 보기</Text>
            </TouchableOpacity>
          )}

          {/* 인터랙션 버튼 */}
          <View style={styles.interactionBar}>
            <TouchableOpacity 
              style={styles.interactionButton}
              onPress={() => handleLike(comment.id)}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={18} 
                color={isLiked ? "#F91880" : "#536471"} 
              />
              {likeCount > 0 && (
                <Text style={[
                  styles.interactionCount,
                  isLiked && styles.likedCount
                ]}>{likeCount}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.interactionButton}
              onPress={() => {
                setReplyTo(comment.id);
                setReplyToUser(comment.nick);
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#536471" />
            </TouchableOpacity>
          </View>

          {/* 답글 토글 버튼 */}
          {replyCount > 0 && (
            <TouchableOpacity 
              style={styles.showRepliesButton}
              onPress={() => toggleReplies(comment.id)}
            >
              <Text style={styles.showRepliesText}>
                {expandedComments[comment.id] 
                  ? '답글 숨기기' 
                  : `${replyCount}개의 답글`}
              </Text>
              <Ionicons 
                name={expandedComments[comment.id] ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#0095F6"
              />
            </TouchableOpacity>
          )}

          {/* 답글 목록 */}
          {expandedComments[comment.id] && comment.replies && (
            <View style={styles.repliesContainer}>
              {comment.replies.map(reply => (
                <RecursiveComment
                  key={reply.id}
                  comment={reply}
                  handleLike={handleLike}
                  toggleReplies={toggleReplies}
                  expandedComments={expandedComments}
                  setReplyTo={setReplyTo}
                  setReplyToUser={setReplyToUser}
                  user={user}
                  onDebatePress={onDebatePress}
                  navigation={navigation}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  commentItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentContainer: {
    flexDirection: 'row',
  },
  leftColumn: {
    marginRight: 12,
    alignItems: 'center',
  },
  replyLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EFF3F4',
    marginTop: 4,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  rightColumn: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
    marginRight: 4,
  },
  commentTime: {
    fontSize: 15,
    color: '#536471',
  },
  commentText: {
    fontSize: 15,
    color: '#0F1419',
    lineHeight: 20,
    marginBottom: 8,
  },
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  interactionCount: {
    marginLeft: 4,
    fontSize: 13,
    color: '#536471',
  },
  likedCount: {
    color: '#F91880',
  },
  showRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  showRepliesText: {
    fontSize: 14,
    color: '#0095F6',
    marginRight: 4,
  },
  repliesContainer: {
    marginTop: 4,
  },
  personaCommentContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0095F6',
    padding: 8,
  },
  personaAvatar: {
    borderWidth: 2,
    borderColor: '#0095F6',
  },
  personaBadge: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  personaBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  debateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5FE',
    padding: 8,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  debateButtonText: {
    color: '#0095F6',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default RecursiveComment;
