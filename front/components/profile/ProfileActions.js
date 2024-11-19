import React from 'react';
import { View, StyleSheet } from 'react-native';

const ProfileActions = () => {
  return (
    <View style={styles.container}>
      {/* 구분선 추가 */}
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  separator: {
    height: 1,
    backgroundColor: '#dbdbdb', // 구분선 색상
    marginVertical: 10, // 구분선 위아래 여백
  },
});

export default ProfileActions;
