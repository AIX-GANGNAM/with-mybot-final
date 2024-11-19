import { View, Text, StyleSheet } from 'react-native';

const Likes = ({post, like}) => {
    const likeCount = Array.isArray(post.likes) ? post.likes.length : 0;
    
    return(
      <View style={styles.likes}>
        <Text style={[styles.Texts,{opacity: 0.9}]}>
          {like ? 'Like by you and ' : 'Liked by '}
          {likeCount} {likeCount === 1 ? 'person' : 'people'}
        </Text>
      </View>
    );
  }

const styles = StyleSheet.create({

    likes: {
        padding:3,
        
       },
       Texts:{
        color:'white',
        fontWeight:'bold',
        marginLeft: 8,
       },   
});

export default Likes;

