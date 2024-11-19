import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProfileStats = ({ user }) => {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.statNumber}>{user.posts}</Text>
        <Text style={styles.statLabel}>게시물</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statNumber}>{user.followers}</Text>
        <Text style={styles.statLabel}>팔로워</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statNumber}>{user.following}</Text>
        <Text style={styles.statLabel}>팔로잉</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#8e8e8e',
  },
});

export default ProfileStats;