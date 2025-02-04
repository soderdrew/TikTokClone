import { Pressable, Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export interface InteractionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string | number | React.ReactNode;
  color?: string;
  style?: object;
  iconStyle?: object;
  onPress?: () => void;
  disabled?: boolean;
}

export default function InteractionButton({ 
  icon, 
  text, 
  color = 'white', 
  style, 
  iconStyle,
  onPress,
  disabled,
}: InteractionButtonProps) {
  const circleAnim = React.useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (disabled) return;

    // Reset circle animation
    circleAnim.setValue(0);

    // Circle flash animation
    Animated.timing(circleAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onPress?.();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.circle,
        {
          opacity: circleAnim.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0, 0.2, 0],
          }),
          transform: [{
            scale: circleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1.8],
            }),
          }],
          backgroundColor: 'white',
        },
      ]} />
      <Pressable onPress={handlePress} disabled={disabled}>
        <View style={[styles.interactionItem, style]}>
          <Animated.View style={iconStyle}>
            <Ionicons name={icon} size={28} color={color} />
          </Animated.View>
          {typeof text === 'string' || typeof text === 'number' ? (
            <Text style={[styles.interactionText, { color }]}>
              {text}
            </Text>
          ) : (
            text
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  interactionText: {
    marginTop: 5,
    fontSize: 12,
  },
  circle: {
    position: 'absolute',
    width: 40,
    height: 52,
    borderRadius: 22,
    top: -3,
  },
}); 