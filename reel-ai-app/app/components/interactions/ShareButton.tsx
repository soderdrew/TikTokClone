import React from 'react';
import InteractionButton from '../common/InteractionButton';
import ShareModal from '../modals/ShareModal';

interface ShareButtonProps {
  videoId: string;
  title: string;
  onPress?: () => void;
}

export default function ShareButton({ videoId, title, onPress }: ShareButtonProps) {
  const [modalVisible, setModalVisible] = React.useState(false);

  const handlePress = () => {
    setModalVisible(true);
    onPress?.();
  };

  return (
    <>
      <InteractionButton
        icon="share-outline"
        text="Share"
        color="white"
        onPress={handlePress}
      />
      <ShareModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        videoId={videoId}
        title={title}
      />
    </>
  );
} 