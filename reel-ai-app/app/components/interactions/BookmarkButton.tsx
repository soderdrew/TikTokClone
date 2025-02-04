import React from 'react';
import InteractionButton from '../common/InteractionButton';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  bookmarks: number;
  onPress: () => void;
}

export function BookmarkButton({ isBookmarked, bookmarks, onPress }: BookmarkButtonProps) {
  const [localBookmarks, setLocalBookmarks] = React.useState(bookmarks);

  const handlePress = () => {
    const newCount = isBookmarked ? bookmarks : bookmarks + 1;
    setLocalBookmarks(newCount);
    onPress();
  };

  return (
    <InteractionButton
      icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
      text={localBookmarks}
      color={isBookmarked ? '#FFC107' : 'white'} // Using amber/gold color for bookmarks
      onPress={handlePress}
    />
  );
} 