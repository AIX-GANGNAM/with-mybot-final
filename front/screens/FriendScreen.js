import React, { useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView } from 'react-native';
import FriendHeader from '../components/profile/FriendHeader';
import FriendsList from '../components/profile/FriendsList';
import FriendSearch from '../components/profile/FriendSearch';

const FriendScreen = () => {
  console.log('FriendScreen 실행');
  const [activeTab, setActiveTab] = useState('friends');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FriendHeader 
          onTabChange={handleTabChange} 
          activeTab={activeTab}
        />
        {activeTab === 'friends' ? (
          <FriendsList />
        ) : (
          <FriendSearch />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default FriendScreen;