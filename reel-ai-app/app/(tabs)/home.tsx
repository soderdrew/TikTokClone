import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { VideoCard } from '../components/VideoCard';
import InteractionButton from '../components/common/InteractionButton';
import LikeButton from '../components/interactions/LikeButton';
import CommentButton from '../components/interactions/CommentButton';
import ShareButton from '../components/interactions/ShareButton';
import BookmarkButton from '../components/interactions/BookmarkButton';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface Video extends Models.Document {
  title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    cuisine: string;
    difficulty: string;
    cookingTime: number;
    likesCount: number;
    commentsCount: number;
    userId: string;
    bookmarksCount?: number;
}

interface Creator {
    name: string;
    avatarUrl?: string;
    userId: string;
}

export default function HomeScreen() {
    const router = useRouter();
    const [videos, setVideos] = useState<Video[]>([]);
    const [creators, setCreators] = useState<Record<string, Creator>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
    const flatListRef = React.useRef<FlatList>(null);

    const checkAuth = async () => {
        const isLoggedIn = await AuthService.isLoggedIn();
        if (!isLoggedIn) {
            router.replace('/auth/login');
            return false;
        }
        // Get current user ID
        const user = await AuthService.getCurrentUser();
        if (user) {
            setCurrentUserId(user.$id);
        }
        return true;
    };

    const loadVideos = async () => {
        console.log('Starting to load videos...');
        try {
            const isAuthenticated = await checkAuth();
            console.log('Auth check completed:', isAuthenticated);
            if (!isAuthenticated) return;

            // Get current user ID first
            const user = await AuthService.getCurrentUser();
            console.log('Current user fetched:', user ? 'success' : 'failed');
            if (!user) {
                console.error('No user found');
                return;
            }
            setCurrentUserId(user.$id);

            // Update thumbnails for videos that don't have them
            await DatabaseService.updateAllVideoThumbnails();

            console.log('Fetching videos...');
            const response = await DatabaseService.getVideos(10);
            console.log('Videos fetched:', response.documents.length);
            setVideos(response.documents as Video[]);

            // Fetch creator profiles and like statuses
            console.log('Starting to fetch creator profiles and statuses...');
            const creatorProfiles: Record<string, Creator> = {};
            const newLikedVideos = new Set<string>();
            const newSavedRecipes = new Set<string>();

            for (const video of response.documents) {
                // Fetch creator profile if not already fetched
                if (!creatorProfiles[video.userId]) {
                    try {
                        console.log('Fetching profile for user:', video.userId);
                        const profile = await DatabaseService.getProfile(video.userId);
                        creatorProfiles[video.userId] = {
                            name: profile.name,
                            avatarUrl: profile.avatarUrl,
                            userId: video.userId
                        };
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                        creatorProfiles[video.userId] = { 
                            name: 'Unknown Creator',
                            userId: video.userId
                        };
                    }
                }

                // Check if video is liked
                try {
                    const isLiked = await DatabaseService.isVideoLiked(user.$id, video.$id);
                    if (isLiked) {
                        newLikedVideos.add(video.$id);
                    }
                } catch (error) {
                    console.error('Error checking like status:', error);
                }

                // Check if video is saved
                try {
                    const isSaved = await DatabaseService.isRecipeSaved(user.$id, video.$id);
                    if (isSaved) {
                        newSavedRecipes.add(video.$id);
                    }
                } catch (error) {
                    console.error('Error checking save status:', error);
                }
            }

            console.log('All profiles and statuses fetched');
            setCreators(creatorProfiles);
            setLikedVideos(newLikedVideos);
            setSavedRecipes(newSavedRecipes);
        } catch (error) {
            console.error('Error loading videos:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                if (error.message.includes('not authorized')) {
                    router.replace('/auth/login');
                }
            }
        } finally {
            console.log('Load videos completed');
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadVideos();
    }, []);

    const handleLike = async (video: Video) => {
        try {
            const isCurrentlyLiked = likedVideos.has(video.$id);
            
            // Optimistically update UI
            setLikedVideos(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyLiked) {
                    newSet.delete(video.$id);
                } else {
                    newSet.add(video.$id);
                }
                return newSet;
            });

            // Perform the actual API call
            if (isCurrentlyLiked) {
                await DatabaseService.unlikeVideo(currentUserId, video.$id);
            } else {
                await DatabaseService.likeVideo(currentUserId, video.$id);
            }

            // Fetch the updated video data
            const updatedVideo = await DatabaseService.getVideoById(video.$id);
            
            // Update the videos state with the latest data
            setVideos(prev => 
                prev.map(v => {
                    if (v.$id === video.$id) {
                        return {
                            ...v,
                            likesCount: updatedVideo.likesCount
                        };
                    }
                    return v;
                })
            );
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert optimistic updates on error
    setLikedVideos(prev => {
      const newSet = new Set(prev);
                if (likedVideos.has(video.$id)) {
                    newSet.add(video.$id);
      } else {
                    newSet.delete(video.$id);
      }
      return newSet;
    });
        }
    };

    const handleComment = (video: Video) => {
        // The CommentButton component will handle showing the modal
        console.log('Comment pressed for video:', video.$id);
    };

    const handleBookmark = async (video: Video) => {
        try {
            const isCurrentlyBookmarked = savedRecipes.has(video.$id);
            
            // Optimistically update UI
            setSavedRecipes(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyBookmarked) {
                    newSet.delete(video.$id);
                } else {
                    newSet.add(video.$id);
                }
                return newSet;
            });

            // Perform the actual API call
            if (isCurrentlyBookmarked) {
                await DatabaseService.unsaveRecipe(currentUserId, video.$id);
            } else {
                await DatabaseService.saveRecipe(currentUserId, video.$id);
            }

            // Fetch the updated video data
            const updatedVideo = await DatabaseService.getVideoById(video.$id);
            
            // Update the videos state with the latest data
            setVideos(prev => 
                prev.map(v => {
                    if (v.$id === video.$id) {
                        return {
                            ...v,
                            bookmarksCount: updatedVideo.bookmarksCount
                        };
                    }
                    return v;
                })
            );
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            // Revert optimistic updates on error
    setSavedRecipes(prev => {
      const newSet = new Set(prev);
                if (savedRecipes.has(video.$id)) {
                    newSet.add(video.$id);
      } else {
                    newSet.delete(video.$id);
      }
      return newSet;
    });
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff4444" />
            </View>
        );
    }

  return (
    <View style={styles.container}>
      <FlatList
                data={videos}
        snapToInterval={height}
        decelerationRate="fast"
        bounces={false}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
                onRefresh={loadVideos}
                refreshing={refreshing}
        onMomentumScrollEnd={(event) => {
          const y = event.nativeEvent.contentOffset.y;
                    const maxScroll = (videos.length - 1) * height;
          
          if (y > maxScroll) {
            flatListRef.current?.scrollToOffset({
              offset: maxScroll,
              animated: true
            });
          }
        }}
        ref={flatListRef}
                renderItem={({ item }) => (
                    <VideoCard
                        key={item.$id}
                        video={item}
                        creator={creators[item.userId] || { name: 'Unknown Creator' }}
                        isLiked={likedVideos.has(item.$id)}
                        isSaved={savedRecipes.has(item.$id)}
                        onLike={async () => {
                            if (!currentUserId) {
                                router.push('/auth/login');
                                return;
                            }
                            try {
                                if (likedVideos.has(item.$id)) {
                                    await DatabaseService.unlikeVideo(currentUserId, item.$id);
                                    setLikedVideos(prev => {
                                        const next = new Set(prev);
                                        next.delete(item.$id);
                                        return next;
                                    });
                                } else {
                                    await DatabaseService.likeVideo(currentUserId, item.$id);
                                    setLikedVideos(prev => new Set(prev).add(item.$id));
                                }
                                loadVideos();
                            } catch (error) {
                                console.error('Error toggling like:', error);
                            }
                        }}
                        onComment={() => {
                            if (!currentUserId) {
                                router.push('/auth/login');
                                return;
                            }
                        }}
                        onSave={async () => {
                            if (!currentUserId) {
                                router.push('/auth/login');
                                return;
                            }
                            try {
                                if (savedRecipes.has(item.$id)) {
                                    await DatabaseService.unsaveRecipe(currentUserId, item.$id);
                                    setSavedRecipes(prev => {
                                        const next = new Set(prev);
                                        next.delete(item.$id);
                                        return next;
                                    });
                                } else {
                                    await DatabaseService.saveRecipe(currentUserId, item.$id);
                                    setSavedRecipes(prev => new Set(prev).add(item.$id));
                                }
                                loadVideos();
                            } catch (error) {
                                console.error('Error toggling save:', error);
                            }
                        }}
                    />
                )}
                keyExtractor={item => item.$id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    backgroundColor: '#000',
  },
  videoContainer: {
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlaceholder: {
    width: width,
    height: height,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  interactions: {
    position: 'absolute',
    right: 10,
    bottom: 100,
  },
  interactionItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  interactionText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  recipeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    padding: 10,
    marginTop: 10,
  },
  videoInfo: {
    position: 'absolute',
    left: 10,
    bottom: 100,
    maxWidth: '70%',
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  description: {
    color: 'white',
    fontSize: 14,
  },
}); 