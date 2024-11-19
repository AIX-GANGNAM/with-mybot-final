import { View, Text, TouchableOpacity } from 'react-native';

const Caption = ({post, showFullCaption, setShowFullCaption}) => {
    const maxLength = 100;
    const isLongCaption = post.caption.length > maxLength;
 
    return(
     <View style={{marginLeft: 12, marginBottom: 5}}>
       <Text style={{color:'black'}}>
         {/* <Text style={{fontWeight:'800' , fontSize: 16}}>{post.nick} </Text> */}
         <Text>
           {showFullCaption ? post.caption : post.caption.slice(0, maxLength)}
           {isLongCaption && !showFullCaption && '... '}
         </Text>
       </Text>
       {isLongCaption && (
         <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
           <Text style={{color: 'gray', marginTop: 2}}>
             {showFullCaption ? '접기' : '더 보기'}
           </Text>
         </TouchableOpacity>
       )}
     </View>
    );
 }

export default Caption;
