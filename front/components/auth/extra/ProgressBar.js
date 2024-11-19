import React from 'react';
import { View, StyleSheet } from 'react-native';

const ProgressBar = ({ step, totalSteps }) => {
  return (
    <View style={styles.container}>
      {[...Array(totalSteps)].map((_, index) => (
        <View
          key={index}
          style={[
            styles.step,
            index < step ? styles.completedStep : styles.incompleteStep,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  step: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  completedStep: {
    backgroundColor: '#5271ff',
  },
  incompleteStep: {
    backgroundColor: '#E1E8ED',
  },
});

export default ProgressBar;