import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -120;

const ChatListExit = ({ children, onSwipeComplete }) => {
  const position = useRef(new Animated.ValueXY()).current;
  const swipeComplete = useRef(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gesture) => {
      if (gesture.dx < 0) {
        Animated.event(
          [null, { dx: position.x }],
          { useNativeDriver: false }
        )(event, gesture);
      }
    },
    onPanResponderRelease: (event, gesture) => {
      if (gesture.dx < SWIPE_THRESHOLD && !swipeComplete.current) {
        completeSwipe();
      } else {
        resetPosition();
      }
    },
    onPanResponderTerminate: () => {
      resetPosition();
    },
  });

  const completeSwipe = () => {
    swipeComplete.current = true;
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onSwipeComplete();
      swipeComplete.current = false;
      position.setValue({ x: 0, y: 0 });
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    return {
      transform: [{ translateX: position.x }],
    };
  };

  const deleteButtonOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH/4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[styles.deleteButton, {
          opacity: deleteButtonOpacity
        }]}
      >
        <TouchableOpacity 
          onPress={completeSwipe}
          style={styles.deleteButtonTouchable}
        >
          <Text style={styles.deleteText}>나가기</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View 
        style={[styles.card, getCardStyle()]} 
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#ff3b30',
  },
  card: {
    backgroundColor: 'white',
    zIndex: 1,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  deleteButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ChatListExit;