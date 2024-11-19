import { StyleSheet, View, Pressable, Image } from 'react-native';

const PostImage = ({post}) => {
  if (!post.image) return null;

  return (
    <Pressable>
      <Image 
        source={{uri: post.image}} 
        style={styles.postImage} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  postImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    borderRadius: 16,
    backgroundColor: '#F7F9F9',
  },
});

export default PostImage;
