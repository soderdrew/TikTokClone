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
import { reviewService, Review } from '../../services/reviewService';

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
  const [activeTab, setActiveTab] = React.useState<'comments' | 'reviews'>('comments');
  const [newComment, setNewComment] = React.useState('');
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [userProfiles, setUserProfiles] = React.useState<Record<string, { name: string }>>({});
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [likedComments, setLikedComments] = React.useState<Set<string>>(new Set());
  const [newReview, setNewReview] = React.useState({ rating: 0, content: '' });
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

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const reviewsList = await reviewService.getVideoReviews(videoId);
      setReviews(reviewsList);

      // Fetch user profiles for all reviews
      const profiles: Record<string, { name: string }> = { ...userProfiles };
      for (const review of reviewsList) {
        if (!profiles[review.userId]) {
          try {
            const profile = await DatabaseService.getProfile(review.userId);
            profiles[review.userId] = { name: profile.name };
          } catch (error) {
            console.error('Error fetching profile:', error);
            profiles[review.userId] = { name: 'Unknown User' };
          }
        }
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error loading reviews:', error);
      Alert.alert('Error', 'Failed to load reviews. Please try again.');
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
      if (activeTab === 'comments') {
        loadComments();
      } else {
        loadReviews();
      }
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
  }, [visible, activeTab]);

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
      
      setComments(prev => [{
        ...response,
        userId: user.$id,
        content: newComment.trim(),
        likesCount: 0,
        createdAt: new Date().toISOString()
      }, ...prev]);

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

  const handleSubmitReview = async () => {
    if (!newReview.content.trim() || newReview.rating === 0) return;

    try {
      setIsSubmitting(true);
      const user = await AuthService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to review.');
        return;
      }

      const response = await reviewService.createReview(
        user.$id,
        videoId,
        newReview.rating,
        newReview.content.trim()
      );

      setReviews(prev => [response, ...prev]);

      if (!userProfiles[user.$id]) {
        const profile = await DatabaseService.getProfile(user.$id);
        setUserProfiles(prev => ({
          ...prev,
          [user.$id]: { name: profile.name }
        }));
      }

      setNewReview({ rating: 0, content: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to post review. Please try again.');
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

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await reviewService.deleteReview(reviewId, videoId);
      setReviews(prev => prev.filter(review => review.$id !== reviewId));
    } catch (error) {
      console.error('Error deleting review:', error);
      Alert.alert('Error', 'Failed to delete review. Please try again.');
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

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#FFD700" : "white"}
          />
        ))}
      </View>
    );
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

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <Text style={styles.username}>{userProfiles[item.userId]?.name || 'Unknown User'}</Text>
        <Text style={styles.timeAgo}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      {renderStars(item.rating)}
      <Text style={styles.commentText}>{item.content}</Text>
      {currentUserId === item.userId && (
        <View style={styles.commentFooter}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteReview(item.$id!)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderInput = () => {
    if (activeTab === 'comments') {
      return (
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
              { opacity: newComment.trim() && !isSubmitting ? 1 : 0.5 }
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
      );
    } else {
      return (
        <View style={styles.reviewInputContainer}>
          <View style={styles.ratingInput}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setNewReview(prev => ({ ...prev, rating: star }))}
              >
                <Ionicons
                  name={star <= newReview.rating ? "star" : "star-outline"}
                  size={24}
                  color={star <= newReview.rating ? "#FFD700" : "white"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Add a review..."
            placeholderTextColor="#666"
            value={newReview.content}
            onChangeText={(text) => setNewReview(prev => ({ ...prev, content: text }))}
            multiline
            maxLength={1000}
            editable={!isSubmitting}
          />
          <TouchableOpacity 
            style={[
              styles.postButton,
              { opacity: newReview.content.trim() && newReview.rating > 0 && !isSubmitting ? 1 : 0.5 }
            ]}
            onPress={handleSubmitReview}
            disabled={!newReview.content.trim() || newReview.rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      );
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
            <View style={styles.tabs}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
                onPress={() => setActiveTab('comments')}
              >
                <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                  Comments
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                onPress={() => setActiveTab('reviews')}
              >
                <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
                  Reviews
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff4444" />
            </View>
          ) : (
            <FlatList<Comment | Review>
              data={activeTab === 'comments' ? comments : reviews}
              renderItem={({ item }) => {
                if (activeTab === 'comments') {
                  return renderComment({ item: item as Comment });
                } else {
                  return renderReview({ item: item as Review });
                }
              }}
              keyExtractor={item => item.$id!}
              contentContainerStyle={styles.commentsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No {activeTab} yet. Be the first to {activeTab === 'comments' ? 'comment' : 'review'}!
                  </Text>
                </View>
              }
            />
          )}

          {renderInput()}
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
  tabs: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#ff4444',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#ff4444',
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
    marginVertical: 5,
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
  deleteButton: {
    padding: 5,
  },
  deleteText: {
    color: '#ff4444',
    fontSize: 12,
  },
  likedCount: {
    color: '#ff4444'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#000',
    alignItems: 'center',
  },
  reviewInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#000',
    alignItems: 'center',
  },
  ratingInput: {
    position: 'absolute',
    top: -32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#000',
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
    backgroundColor: '#ff4444',
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
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
}); 