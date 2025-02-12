import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, ViewToken } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { MemoizedVideoCard as VideoCard } from '../components/VideoCard';
import InteractionButton from '../components/common/InteractionButton';
import LikeButton from '../components/interactions/LikeButton';
import CommentButton from '../components/interactions/CommentButton';
import ShareButton from '../components/interactions/ShareButton';
import BookmarkButton from '../components/interactions/BookmarkButton';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { useRouter } from 'expo-router';
// import { Query } from 'appwrite';

const { width, height } = Dimensions.get('window');
const BOTTOM_TAB_HEIGHT = 60; // Standard bottom tab height

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
    const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
    const [hasMoreVideos, setHasMoreVideos] = useState<boolean>(true);

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

    const loadVideos = async (loadMore: boolean = false) => {
        console.log('Starting to load videos...');
        try {
            const isAuthenticated = await checkAuth();
            console.log('Auth check completed:', isAuthenticated);
            if (!isAuthenticated) return [];

            // Get current user ID first
            const user = await AuthService.getCurrentUser();
            console.log('Current user fetched:', user ? 'success' : 'failed');
            if (!user) {
                console.error('No user found');
                return [];
            }
            setCurrentUserId(user.$id);

            // Update thumbnails for videos that don't have them
            await DatabaseService.updateAllVideoThumbnails();

            console.log('Fetching videos...');
            const response = await DatabaseService.getVideos(10, loadMore ? videos[videos.length - 1].$id : undefined);
            console.log('Videos fetched:', response.documents.length);
            
            const newVideos = response.documents as Video[];
            
            if (!loadMore) {
                setVideos(newVideos);
            }

            // Fetch creator profiles and like statuses
            console.log('Starting to fetch creator profiles and statuses...');
            const creatorProfiles: Record<string, Creator> = {};
            const newLikedVideos = new Set<string>();
            const newSavedRecipes = new Set<string>();

            for (const video of newVideos) {
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
            if (!loadMore) {
                setCreators(creatorProfiles);
                setLikedVideos(newLikedVideos);
                setSavedRecipes(newSavedRecipes);
            } else {
                setCreators(prev => ({ ...prev, ...creatorProfiles }));
                setLikedVideos(prev => new Set([...prev, ...newLikedVideos]));
                setSavedRecipes(prev => new Set([...prev, ...newSavedRecipes]));
            }

            return newVideos;
        } catch (error) {
            console.error('Error loading videos:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                if (error.message.includes('not authorized')) {
                    router.replace('/auth/login');
                }
            }
            setLoading(false);
            setRefreshing(false);
            return [];
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
            
            setLikedVideos(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyLiked) {
                    newSet.delete(video.$id);
                } else {
                    newSet.add(video.$id);
                }
                return newSet;
            });

            setVideos(prev => 
                prev.map(v => {
                    if (v.$id === video.$id) {
                        return {
                            ...v,
                            likesCount: v.likesCount + (isCurrentlyLiked ? -1 : 1)
                        };
                    }
                    return v;
                })
            );

            if (isCurrentlyLiked) {
                await DatabaseService.unlikeVideo(currentUserId, video.$id);
            } else {
                await DatabaseService.likeVideo(currentUserId, video.$id);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            setLikedVideos(prev => {
                const newSet = new Set(prev);
                if (likedVideos.has(video.$id)) {
                    newSet.add(video.$id);
                } else {
                    newSet.delete(video.$id);
                }
                return newSet;
            });
            setVideos(prev => 
                prev.map(v => {
                    if (v.$id === video.$id) {
                        return {
                            ...v,
                            likesCount: v.likesCount + (likedVideos.has(video.$id) ? -1 : 1)
                        };
                    }
                    return v;
                })
            );
        }
    };

    const handleComment = (video: Video) => {
        // The CommentButton component will handle showing the modal
        console.log('Comment pressed for video:', video.$id);
    };

    const handleBookmark = async (video: Video) => {
        try {
            const isCurrentlyBookmarked = savedRecipes.has(video.$id);
            
            setSavedRecipes(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyBookmarked) {
                    newSet.delete(video.$id);
                } else {
                    newSet.add(video.$id);
                }
                return newSet;
            });

            setVideos(prev => 
                prev.map(v => {
                    if (v.$id === video.$id) {
                        return {
                            ...v,
                            bookmarksCount: (v.bookmarksCount || 0) + (isCurrentlyBookmarked ? -1 : 1)
                        };
                    }
                    return v;
                })
            );

            if (isCurrentlyBookmarked) {
                await DatabaseService.unsaveRecipe(currentUserId, video.$id);
            } else {
                await DatabaseService.saveRecipe(currentUserId, video.$id);
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            setSavedRecipes(prev => {
                const newSet = new Set(prev);
                if (savedRecipes.has(video.$id)) {
                    newSet.add(video.$id);
                } else {
                    newSet.delete(video.$id);
                }
                return newSet;
            });
            setVideos(prev => 
                prev.map(v => {
                    if (v.$id === video.$id) {
                        return {
                            ...v,
                            bookmarksCount: (v.bookmarksCount || 0) + (savedRecipes.has(video.$id) ? -1 : 1)
                        };
                    }
                    return v;
                })
            );
        }
    };

    const viewabilityConfig = React.useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 300,
    }).current;

    const onViewableItemsChanged = React.useCallback(({ 
        viewableItems 
    }: { 
        viewableItems: Array<ViewToken>;
        changed: Array<ViewToken>;
    }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentVideoIndex(viewableItems[0].index);
        }
    }, []);

    const handleLoadMore = async () => {
        if (!hasMoreVideos || loading) return;
        
        try {
            const newVideos = await loadVideos(true);
            if (!newVideos || newVideos.length === 0) {
                setHasMoreVideos(false);
            } else {
                setVideos(prev => [...prev, ...newVideos]);
            }
        } catch (error) {
            console.error('Error loading more videos:', error);
            setHasMoreVideos(false);
        }
    };

    const handleEndReached = () => {
        if (!hasMoreVideos && videos.length > 0) {
            // Scroll back to the last video with animation
            flatListRef.current?.scrollToIndex({
                index: videos.length - 1,
                animated: true,
                viewPosition: 0 // Ensure it's fully visible
            });
        } else {
            // Load more videos if available
            handleLoadMore();
        }
    };

    const handleMomentumScrollEnd = (event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        const maxScroll = (videos.length - 1) * height;
        
        // If scrolled past the last video, bounce back
        if (y > maxScroll && !hasMoreVideos) {
            flatListRef.current?.scrollToIndex({
                index: videos.length - 1,
                animated: true,
                viewPosition: 0
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
        ref={flatListRef}
        data={videos}
        renderItem={({ item }) => (
          <VideoCard
            key={item.$id}
            video={item}
            creator={creators[item.userId] || { name: 'Unknown Creator' }}
            isLiked={likedVideos.has(item.$id)}
            isSaved={savedRecipes.has(item.$id)}
            onLike={() => {
              if (!currentUserId) {
                router.push('/auth/login');
                return;
              }
              handleLike(item);
            }}
            onComment={() => {
              if (!currentUserId) {
                router.push('/auth/login');
                return;
              }
              handleComment(item);
            }}
            onSave={() => {
              if (!currentUserId) {
                router.push('/auth/login');
                return;
              }
              handleBookmark(item);
            }}
          />
        )}
        keyExtractor={(item) => item.$id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        snapToInterval={height}
        decelerationRate="fast"
        snapToAlignment="start"
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
        onRefresh={loadVideos}
        refreshing={refreshing}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: BOTTOM_TAB_HEIGHT
        }}
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