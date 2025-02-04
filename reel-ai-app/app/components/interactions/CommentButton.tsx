import React from 'react';
import InteractionButton from '../common/InteractionButton';
import CommentsModal from '../modals/CommentsModal';

interface CommentButtonProps {
  comments: number;
  onPress: () => void;
  videoId: string;
}

export default function CommentButton({ comments, onPress, videoId }: CommentButtonProps) {
  const [modalVisible, setModalVisible] = React.useState(false);

  const handlePress = () => {
    setModalVisible(true);
    onPress();
  };

  return (
    <>
      <InteractionButton
        icon="chatbubble-outline"
        text={comments}
        color="white"
        onPress={handlePress}
      />
      <CommentsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        videoId={videoId}
      />
    </>
  );
} 