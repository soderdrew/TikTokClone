import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
}

export default function HomeScreen() {
    const router = useRouter();
    const [videos, setVideos] = useState<Video[]>([]);
    const [creators, setCreators] = useState<Record<string, Creator>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
    const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
    const flatListRef = React.useRef<FlatList>(null);

    const checkAuth = async () => {
        const isLoggedIn = await AuthService.isLoggedIn();
        if (!isLoggedIn) {
            router.replace('/auth/login');
            return false;
        }
        return true;
    };

    const loadVideos = async () => {
        try {
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) return;

            const response = await DatabaseService.getVideos(10);
            setVideos(response.documents as Video[]);

            // Fetch creator profiles and like statuses
            const creatorProfiles: Record<string, Creator> = {};
            const newLikedVideos = new Set<string>();
            const newBookmarkedVideos = new Set<string>();

            for (const video of response.documents) {
                // Fetch creator profile if not already fetched
                if (!creatorProfiles[video.userId]) {
                    try {
                        const profile = await DatabaseService.getProfile(video.userId);
                        creatorProfiles[video.userId] = {
                            name: profile.name,
                            avatarUrl: profile.avatarUrl
                        };
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                        creatorProfiles[video.userId] = { name: 'Unknown Creator' };
                    }
                }

                // Check if video is liked
                try {
                    const isLiked = await DatabaseService.isVideoLiked(video.userId, video.$id);
                    if (isLiked) {
                        newLikedVideos.add(video.$id);
                    }
                } catch (error) {
                    console.error('Error checking like status:', error);
                }

                // Check if video is saved
                try {
                    const isSaved = await DatabaseService.isRecipeSaved(video.userId, video.$id);
                    if (isSaved) {
                        newBookmarkedVideos.add(video.$id);
                    }
                } catch (error) {
                    console.error('Error checking save status:', error);
                }
            }

            setCreators(creatorProfiles);
            setLikedVideos(newLikedVideos);
            setBookmarkedVideos(newBookmarkedVideos);
        } catch (error) {
            console.error('Error loading videos:', error);
            if (error instanceof Error && error.message.includes('not authorized')) {
                router.replace('/auth/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadVideos();
    }, []);

    const handleLike = async (video: Video) => {
        try {
            if (likedVideos.has(video.$id)) {
                await DatabaseService.unlikeVideo(video.userId, video.$id);
                setLikedVideos(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(video.$id);
                    return newSet;
                });
            } else {
                await DatabaseService.likeVideo(video.userId, video.$id);
                setLikedVideos(prev => {
                    const newSet = new Set(prev);
                    newSet.add(video.$id);
                    return newSet;
                });
            }
            loadVideos(); // Refresh to get updated counts
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const handleComment = (video: Video) => {
        console.log('Comment pressed for video:', video.$id);
    };

    const handleBookmark = async (video: Video) => {
        try {
            if (bookmarkedVideos.has(video.$id)) {
                await DatabaseService.unsaveRecipe(video.userId, video.$id);
                setBookmarkedVideos(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(video.$id);
                    return newSet;
                });
            } else {
                await DatabaseService.saveRecipe(video.userId, video.$id);
                setBookmarkedVideos(prev => {
                    const newSet = new Set(prev);
                    newSet.add(video.$id);
                    return newSet;
                });
            }
            loadVideos(); // Refresh to get updated counts
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
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
                renderItem={({ item: video }) => (
                    <View style={styles.videoContainer}>
                        <View style={styles.videoPlaceholder}>
                            <Text style={styles.videoTitle}>{video.title}</Text>
                        </View>
                        <View style={styles.interactions}>
                            <LikeButton
                                isLiked={likedVideos.has(video.$id)}
                                likes={video.likesCount}
                                onPress={() => handleLike(video)}
                            />
                            <CommentButton
                                comments={video.commentsCount}
                                onPress={() => handleComment(video)}
                                videoId={video.$id}
                            />
                            <BookmarkButton
                                isBookmarked={bookmarkedVideos.has(video.$id)}
                                bookmarks={video.bookmarksCount || 0}
                                onPress={() => handleBookmark(video)}
                            />
                            <ShareButton
                                videoId={video.$id}
                                title={video.title}
                                onPress={() => console.log('Shared video:', video.$id)}
                            />
                            <InteractionButton
                                icon="restaurant-outline"
                                text="Recipe"
                                style={styles.recipeButton}
                            />
                        </View>
                        <View style={styles.videoInfo}>
                            <Text style={styles.username}>
                                @{creators[video.userId]?.name || 'Unknown Creator'}
                            </Text>
                            <Text style={styles.description}>{video.description}</Text>
                        </View>
                    </View>
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