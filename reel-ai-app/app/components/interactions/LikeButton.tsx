import React from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import InteractionButton from '../common/InteractionButton';

interface LikeButtonProps {
  isLiked: boolean;
  likes: number;
  onPress: () => void;
}

export default function LikeButton({ isLiked, likes, onPress }: LikeButtonProps) {
  const [localLikes, setLocalLikes] = React.useState(likes);

  const handlePress = () => {
    const newCount = isLiked ? likes : likes + 1;
    setLocalLikes(newCount);
    onPress();
  };

  return (
    <InteractionButton
      icon={isLiked ? 'heart' : 'heart-outline'}
      text={localLikes}
      color={isLiked ? '#FF4B4B' : 'white'}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: 40,
    height: 52,
    borderRadius: 22,
    top: -3,
  },
}); 