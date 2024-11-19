import { ScrollView, View, StyleSheet, Share, TouchableOpacity, Text, Image, } from 'react-native';

import { PROFILE, } from '../../data/users';
import { Bars3Icon, LockClosedIcon, LinkIcon, ChevronDownIcon, } from 'react-native-heroicons/solid';
import { PlusCircleIcon, } from 'react-native-heroicons/outline';
import { useNavigation } from '@react-navigation/native';

import StoryHighlights from './StoryHighlights';

import { useSelector } from 'react-redux';
import { FontAwesome } from '@expo/vector-icons';

const ProfileBody = () => {
  const user = useSelector(state => state.user.profile);

  return(
    <View style={{marginHorizontal:8,}}>
    <ProfileStatus user={user} />
    <UserInfo user={user} />
    <ProfessionalDashboard />
    <ProfileAction user={user} />
    <StoryHighlights />
   </View>
  );
}

const ProfileStatus = ({ user }) => {
  return(
   <View style={styles.profileContainer}>
    <TouchableOpacity>
      {user.profileImg ? (
        <Image
          style={styles.profileImg}
          source={{uri: user.profileImg}}
        />
      ) : (
        <FontAwesome name="user-circle" size={80} color="#fff" />
      )}
    </TouchableOpacity>
    <TouchableOpacity style={styles.status} >
     <Text style={[styles.userText,{fontSize:18,fontWeight: 'bold'}]}>0</Text>
     <Text style={styles.userText} >Posts</Text>
    </TouchableOpacity>
   <TouchableOpacity style={styles.status}>
     <Text style={[styles.userText,{fontSize: 18, fontWeight: 'bold'}]} >0</Text>
     <Text style={styles.userText} >Followers</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.status}>
     <Text style={[styles.userText,{fontSize: 18,fontWeight: 'bold'}]}>0</Text>
     <Text style={styles.userText}>Following</Text>
    </TouchableOpacity>
   </View>
  );
}

const UserInfo = ({ user }) => {
  return(
   <View style={styles.infoContainer}>
    <TouchableOpacity >
     <Text style={[styles.infoText, {fontSize:16, fontWeight: 'bold', marginTop: -5}]} >{user.name}</Text>
    </TouchableOpacity>
   <TouchableOpacity >
     <Text style={[styles.infoText, {color:'gray'}]} >@{user.username}</Text>
    </TouchableOpacity>
    <TouchableOpacity >
     <Text style={[styles.infoText]}>생년월일: {new Date(user.birthdate).toLocaleDateString()}</Text>
    </TouchableOpacity>
    <TouchableOpacity >
     <Text style={[styles.infoText]}>전화번호: {user.phone}</Text>
    </TouchableOpacity>
   </View>
  );
}

const ProfessionalDashboard = () => {

  return(
  <TouchableOpacity >
   <View style={styles.dashContainer}>
     <View>
       <Text style={[styles.dashText,]}> Professional Dashboard </Text>
       <Text style={{color:'gray',marginLeft: 8, fontSize: 15}}> New tools are now available </Text>
     </View>
    <Text style={{color:'blue', paddingRight: 15, fontSize:40, fontWeight:'900'}}> • </Text>
   </View>
 </TouchableOpacity>
  );
}

const ProfileAction = ({ user }) => {
  const navigation = useNavigation();

  const goToProfile = () => {
    navigation.push('EditProfile', {
      name: user.name,
      userName: user.username,
      profileImg: user.profileImg,
      birthdate: user.birthdate,
      phone: user.phone,
    });
  }

  const onShare = async () => {
      try {
        const result = await Share.share({
          message:
            `https://www.instagram.com/${PROFILE.userName}/?hl=en`,
        });
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            // shared with activity type of result.activityType
          } else {
            // shared
          }
        } else if (result.action === Share.dismissedAction) {
          // dismissed
        }
      } catch (error) {
        Alert.alert(error.message);
      }
    };
    
  return(
  <View style={{
  		flexDirection: 'row',
        marginTop: 10,
        justifyContent: 'space-between',
    }} >
   <TouchableOpacity
		onPress={goToProfile}
     style={[styles.button,]} >
    <Text style={styles.btnTxt}> Edit profile </Text>
   </TouchableOpacity>
   <TouchableOpacity
	   onPress={onShare}
       style={styles.button}>
    <Text style={styles.btnTxt}> Share profile </Text>
   </TouchableOpacity>
  </View>
  );
}

const styles = StyleSheet.create({
  userText:{
    color:'#000',
    fontWeight: '600',
  },
  profileContainer: {
    marginTop:12,
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
  },
  profileImg: {
    width: 80,
    height: 80,
    borderRadius: 50,
  },
  status: {
    alignItems: 'center',
    marginRight: 8,
  },
  infoContainer: {
    marginTop:10,
  },
  infoText: {
    color: '#000',
    fontWeight: '500',
  },
  dashContainer: {
    flexDirection:'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    height: 50,
    marginTop: 10,
  },
  dashText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
    color:'#000',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    width: '50%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  btnTxt: {
    alignItems: 'center',
    color:'#000',
    fontSize: 16,
    padding: 5,
  },
});

export default ProfileBody;
