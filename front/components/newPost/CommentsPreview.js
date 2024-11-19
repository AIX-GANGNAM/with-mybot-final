import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CommentsPreview = ({commentCount, setShowCommentModal}) => {
    return (
      <View style={styles.commentsPreview}>
        {commentCount > 0 && (
          <TouchableOpacity onPress={() => setShowCommentModal(true)}>
            <Text style={styles.viewAllComments}>
              {commentCount === 1 ? '1개의 댓글 보기' : `${commentCount}개의 댓글 모두 보기`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

const styles = StyleSheet.create({
    commentsPreview: {
        padding: 10,
      },
      viewAllComments: {
        color: 'gray',
      },
});

export default CommentsPreview;
