import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth'; 
import { useNavigation } from '@react-navigation/native'; 

const ProfileHeader = ({ username, setIsAuthenticated, user }) => { 
  const navigation = useNavigation(); 
  const auth = getAuth();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        Alert.alert('로그아웃 성공', '로그인 화면으로 이동합니다.');
        setIsAuthenticated(false); 
        navigation.navigate('Login'); 
      })
      .catch((error) => {
        console.error('로그아웃 에러:', error);
      });
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', {
      name: user?.profile?.userName,
      userId: user?.userId,
      profileImg: user?.profileImg,
      birthdate: user?.profile?.birthdate,
      phone: user?.userPhone,
      mbti: user?.profile?.mbti,
      personality: user?.profile?.personality,
    });
    setDropdownVisible(false); 
  };

  const handleHamburgerPress = () => {
    setDropdownVisible(!dropdownVisible);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.username}>{username}</Text>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={handleHamburgerPress}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
      
      {dropdownVisible && (
        <>
          <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={handleEditProfile}
            >
              <Ionicons name="person-outline" size={20} color="#1A1A1A" />
              <Text style={styles.dropdownText}>프로필 편집</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={[styles.dropdownText, styles.logoutText]}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  menuButton: {
    padding: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  dropdownText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginVertical: 4,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

export default ProfileHeader;
