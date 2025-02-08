import React, { useEffect } from 'react';
import InteractionButton from '../common/InteractionButton';
import CommentsModal from '../modals/CommentsModal';
import { View } from 'react-native';
import { DatabaseService } from '../../services/appwrite';

interface CommentButtonProps {
  comments: number;
  onPress: () => void;
  videoId: string;
}

export default function CommentButton({ comments, onPress, videoId }: CommentButtonProps) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [commentCount, setCommentCount] = React.useState(comments);

  // Fetch accurate comment count on mount
  useEffect(() => {
    fetchCommentCount();
  }, []);

  const fetchCommentCount = async () => {
    try {
      const video = await DatabaseService.getVideoById(videoId);
      setCommentCount(video.commentsCount || 0);
    } catch (error) {
      console.error('Error fetching comment count:', error);
    }
  };

  const handlePress = () => {
    setModalVisible(true);
    onPress();
  };

  const handleModalClose = async () => {
    await fetchCommentCount();
    setModalVisible(false);
  };

  return (
    <View style={{ marginTop: 9 }}>
      <InteractionButton
        icon="chatbubble-outline"
        text={commentCount}
        color="white"
        onPress={handlePress}
      />
      <CommentsModal
        visible={modalVisible}
        onClose={handleModalClose}
        videoId={videoId}
      />
    </View>
  );
} 