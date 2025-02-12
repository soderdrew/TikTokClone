import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
  isActive: boolean;
  hasSelectedFilters?: boolean;
}

export default function FilterButton({
  title,
  icon,
  onPress,
  isActive,
  hasSelectedFilters = false,
}: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isActive && styles.activeButton,
        hasSelectedFilters && styles.hasFiltersButton,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={'#fff'}
      />
      <Text
        style={[
          styles.text,
          isActive && styles.activeText,
          hasSelectedFilters && styles.activeText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  hasFiltersButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  text: {
    marginLeft: 4,
    fontSize: 13,
    color: '#fff',
  },
  activeText: {
    color: '#fff',
  },
}); 