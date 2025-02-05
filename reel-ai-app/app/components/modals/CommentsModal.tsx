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
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService, AuthService } from '../../services/appwrite';
import { Models } from 'react-native-appwrite';
import { formatDistanceToNow } from 'date-fns';

interface Comment extends Models.Document {
  userId: string;
  content: string;
  likesCount: number;
  createdAt: string;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
}

export default function CommentsModal({ visible, onClose, videoId }: CommentsModalProps) {
  const [newComment, setNewComment] = React.useState('');
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [userProfiles, setUserProfiles] = React.useState<Record<string, { name: string }>>({});
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [likedComments, setLikedComments] = React.useState<Set<string>>(new Set());
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const response = await DatabaseService.getComments(videoId);
      setComments(response.documents as Comment[]);

      // Fetch user profiles for all comments
      const profiles: Record<string, { name: string }> = {};
      for (const comment of response.documents) {
        if (!profiles[comment.userId]) {
          try {
            const profile = await DatabaseService.getProfile(comment.userId);
            profiles[comment.userId] = { name: profile.name };
          } catch (error) {
            console.error('Error fetching profile:', error);
            profiles[comment.userId] = { name: 'Unknown User' };
          }
        }
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const checkAuth = async () => {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setCurrentUserId(user.$id);
      }
    };

    if (visible) {
      checkAuth();
      loadComments();
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const user = await AuthService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to comment.');
        return;
      }

      const response = await DatabaseService.addComment(user.$id, videoId, newComment.trim());
      
      // Add the new comment to the list with the user's profile
      setComments(prev => [{
        ...response,
        userId: user.$id,
        content: newComment.trim(),
        likesCount: 0,
        createdAt: new Date().toISOString()
      }, ...prev]);

      // Make sure we have the user's profile
      if (!userProfiles[user.$id]) {
        const profile = await DatabaseService.getProfile(user.$id);
        setUserProfiles(prev => ({
          ...prev,
          [user.$id]: { name: profile.name }
        }));
      }

      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await DatabaseService.deleteComment(videoId, commentId);
      setComments(prev => prev.filter(comment => comment.$id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to like comments.');
      return;
    }

    const isCurrentlyLiked = likedComments.has(commentId);
    
    // Optimistically update UI
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });

    // Update comment likes count optimistically
    setComments(prev => prev.map(comment => {
      if (comment.$id === commentId) {
        return {
          ...comment,
          likesCount: isCurrentlyLiked 
            ? Math.max(0, (comment.likesCount || 0) - 1)
            : (comment.likesCount || 0) + 1
        };
      }
      return comment;
    }));

    try {
      // Perform the actual API call
      if (isCurrentlyLiked) {
        await DatabaseService.unlikeComment(currentUserId, commentId);
      } else {
        await DatabaseService.likeComment(currentUserId, commentId);
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      // Revert optimistic updates on error
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.add(commentId);
        } else {
          newSet.delete(commentId);
        }
        return newSet;
      });

      // Revert comment likes count
      setComments(prev => prev.map(comment => {
        if (comment.$id === commentId) {
          return {
            ...comment,
            likesCount: isCurrentlyLiked 
              ? (comment.likesCount || 0) + 1
              : Math.max(0, (comment.likesCount || 0) - 1)
          };
        }
        return comment;
      }));

      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <Text style={styles.username}>{userProfiles[item.userId]?.name || 'Unknown User'}</Text>
        <Text style={styles.timeAgo}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      <Text style={styles.commentText}>{item.content}</Text>
      <View style={styles.commentFooter}>
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => handleLikeComment(item.$id)}
        >
          <Ionicons 
            name={likedComments.has(item.$id) ? "heart" : "heart-outline"} 
            size={16} 
            color={likedComments.has(item.$id) ? "#ff4444" : "white"} 
          />
          <Text style={[
            styles.likeCount,
            likedComments.has(item.$id) && styles.likedCount
          ]}>
            {item.likesCount || 0}
          </Text>
        </TouchableOpacity>
        {currentUserId === item.userId && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteComment(item.$id)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={item => item.$id}
              contentContainerStyle={styles.commentsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
                </View>
              }
            />
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={300}
              editable={!isSubmitting}
            />
            <TouchableOpacity 
              style={[
                styles.postButton,
                { 
                  opacity: newComment.trim() && !isSubmitting ? 1 : 0.5 
                }
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
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
    color: 'white',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  deleteButton: {
    padding: 5,
  },
  deleteText: {
    color: '#ff4444',
    fontSize: 12,
  },
  likedCount: {
    color: '#ff4444'
  }
}); 