// 필요한 React 컴포넌트와 hooks를 import
import React, {useState, } from 'react';
import { View, Text, TouchableOpacity, Image, } from 'react-native';
// FriendsProfileData import는 주석 처리되어 있음 (props로 받아오는 것으로 보임)
// import FriendsProfileData from './../../data/users';

// Now 컴포넌트 정의. navigation과 FriendsProfileData를 props로 받음
const Now = ({ navigation, FriendsProfileData,FollowUserData,HeartUserData,ReplyUserData }) => {
	
	return(
	<>	
	   {/* "Now" 텍스트 표시 */}
	   <Text style={{
	   		color: 'black',
	   		fontWeight: 'bold',
	   	 }} >Now </Text>
		{
		 // FriendsProfileData에서 처음 2개의 항목만 매핑
		 FriendsProfileData.slice(0,4).map((data, index) =>{
			// 각 친구 프로필에 대한 팔로우 상태를 관리하는 state
			const [ follow, setFollow ] = useState(data.follow);

		 	return(
		 		<View key={index} style={{width:'100%'}}>
		 		 <View style={{
		 		 	flexDirection:'row',
		 		 	justifyContent: 'space-between',
		 		 	alignItems: 'center',
		 		 	paddingVertical: 10,
		 		 }}>
		 		   {/* 친구 프로필로 이동하는 TouchableOpacity */}
		 		   <TouchableOpacity
		 		   		onPress={() => navigation.push('FriendProfile',{
		 		   			// 친구 프로필 정보를 navigation params로 전달
		 		   			name: data.name,
		 					accountName: data.accountName,	   			
		 		   			profileImage: data.profileImage,
		 		   			follow,
		 		   			setFollow,
		 		   			post: data.posts,
		 		   			followers: data.followers,
		 		   			following: data.following,
		 		   			workAt: data.workAt,
		 		   			about: data.about,
		 		   		})}
		 		   		style={{
		 		   			flexDirection: 'row',
		 		   			justifyContent: 'space-between',
		 		   			alignItems: 'center',
		 		   			maxWidth: '64%',
		 		   		}}>
		 		     {/* 프로필 이미지 */}
		 		     <Image
		 		     	source={{uri: data.profileImage}}
		 		     	style={{
		 		     		height: 45,
		 		     		width:45,
		 		     		backgroundColor: 'gray',
		 		     		borderRadius: 100,
		 		     		marginRight: 10,
		 		     	}}/>
		 		     {/* 친구 정보 텍스트 */}
		 		     <Text style={{color: 'black', fontSize: 15}}>
						회원님이 알 수도 있는 
		 		     	<Text style={{fontWeight: 'bold'}}>{data.name} </Text>
						님이 Instagram을 사용중입니다. (날짜)
		 		     </Text>
		 		   </TouchableOpacity>

		 		   {/* 팔로우/언팔로우 버튼 */}
		 		   <TouchableOpacity
		 		   		onPress={() => setFollow(!follow)}
		 		   		style={{width: follow? 72 : 68}}>
		 		     <View style={{
		 		     	width: '100%',
		 		     	height: 40,
		 		     	backgroundColor: follow? 'rgba(52,52,52,0.8)' :'#3493D9',
		 		     	borderRadius: 5,
		 		     	borderWidth: follow? 1 : 0,
		 		     	borderColor: follow?'#798799' : null,
		 		     	justifyContent:'center',
		 		     	alignItems: 'center',
		 		     }}>
		 		       <Text style={{color:follow?'black': '#fff', fontWeight: 'bold'}}>{follow? 'Following': 'Follow'}</Text>
		 		     </View>
		 		   </TouchableOpacity>
		 		 </View>
		 		</View>
		 	);
		 })
		}	 
	 </>
	);
}

// Now 컴포넌트를 export
export default Now;