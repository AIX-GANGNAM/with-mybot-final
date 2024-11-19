import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileInfo from '../components/profile/ProfileInfo';
import ProfileHighlights from '../components/profile/ProfileHighlights';
import ProfileGallery from '../components/profile/ProfileGallery';

// ProfileScreen.js
const ProfileScreen = ({ setIsAuthenticated }) => {
  console.log('ProfileScreen 실행');
  const user = useSelector((state) => state.user.user);

  return (
    <SafeAreaView style={styles.container}>
      <ProfileHeader username={user?.userId} setIsAuthenticated={setIsAuthenticated} user={user} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ProfileInfo user={user} />
          <View style={styles.divider} />
          <ProfileHighlights />
          <View style={styles.divider} />
          <ProfileGallery user={user} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  divider: {
    height: 8,
    backgroundColor: '#F8F9FA',
  },
});

export default ProfileScreen;
