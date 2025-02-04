import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
}

export function ShareModal({ visible, onClose, videoId, title }: ShareModalProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      }).start();

      // Simulate loading share options
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } else {
      setIsLoading(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this recipe: ${title}`,
        url: `https://your-app.com/video/${videoId}`,
        title: 'Share Recipe',
      });
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.closeArea} 
          onPress={onClose} 
          activeOpacity={1}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height, 0],
                })
              }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Share</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <View style={styles.shareOptions}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <View style={styles.shareIcon}>
                    <Ionicons name="share-social" size={28} color="white" />
                  </View>
                  <Text style={styles.shareText}>Share Recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                  <View style={styles.shareIcon}>
                    <Ionicons name="copy" size={28} color="white" />
                  </View>
                  <Text style={styles.shareText}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeArea: {
    flex: 1,
  },
  modalContent: {
    height: '30%',
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  shareButton: {
    alignItems: 'center',
  },
  shareIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareText: {
    color: 'white',
    fontSize: 12,
  },
}); 