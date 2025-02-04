import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  FlatList,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Comment {
  id: string;
  username: string;
  text: string;
  likes: number;
  timeAgo: string;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
}

const DUMMY_COMMENTS: Comment[] = [
  { id: '1', username: 'user1', text: 'Great recipe!', likes: 24, timeAgo: '2h' },
  { id: '2', username: 'chef_mike', text: 'I would add more garlic', likes: 15, timeAgo: '1h' },
  { id: '3', username: 'foodie', text: 'Made this yesterday, turned out perfect!', likes: 45, timeAgo: '30m' },
];

export function CommentsModal({ visible, onClose, videoId }: CommentsModalProps) {
  const [newComment, setNewComment] = React.useState('');
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');

  React.useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (visible) {
      animation = Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      });
    } else {
      animation = Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      });
    }

    animation.start();

    return () => {
      animation.stop();
    };
  }, [visible, slideAnim]);

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
      <View style={styles.commentFooter}>
        <TouchableOpacity style={styles.likeButton}>
          <Ionicons name="heart-outline" size={16} color="white" />
          <Text style={styles.likeCount}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.replyButton}>
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      // Here you would typically send to backend
      console.log('New comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
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
            <Text style={styles.title}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={DUMMY_COMMENTS}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.commentsList}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { color: 'white' }
              ]}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={300}
            />
            <TouchableOpacity 
              style={[
                styles.postButton,
                { opacity: newComment.trim() ? 1 : 0.5 }
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    height: '70%',
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
  commentsList: {
    paddingBottom: 20,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 10,
  },
  timeAgo: {
    color: '#666',
  },
  commentText: {
    color: 'white',
    marginBottom: 10,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  likeCount: {
    color: 'white',
    marginLeft: 5,
  },
  replyButton: {
    padding: 5,
  },
  replyText: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#000',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  postButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 