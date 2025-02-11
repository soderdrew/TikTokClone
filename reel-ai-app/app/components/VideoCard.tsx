import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Share,
    PanResponder,
    GestureResponderEvent,
    PanResponderGestureState,
    ActivityIndicator
} from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CommentButton from './interactions/CommentButton';
import RecipeModal from './modals/RecipeModal';
import { cacheService } from '../services/cacheService';
import * as FileSystem from 'expo-file-system';

interface VideoCardProps {
    video: {
        $id: string;
        userId: string;
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
        bookmarksCount?: number;
        ingredients?: string[];
        instructions?: string[];
        tips?: string[];
    };
    creator: {
        name: string;
        avatarUrl?: string;
        userId: string;
    };
    isLiked?: boolean;
    isSaved?: boolean;
    variant?: 'profile' | 'home' | 'explore';
    onLike: () => void;
    onComment: () => void;
    onSave: () => void;
}

interface PlaybackStatus {
    isLoaded: boolean;
    didJustFinish?: boolean;
    positionMillis?: number;
    durationMillis?: number;
}

const { width, height } = Dimensions.get('window');
const BOTTOM_TAB_HEIGHT = 60; // Standard bottom tab height
const TOP_SPACING = 0; // Remove top spacing

const VideoCard: React.FC<VideoCardProps> = ({
    video,
    creator,
    isLiked: initialIsLiked = false,
    isSaved: initialIsSaved = false,
    variant = 'home',
    onLike,
    onComment,
    onSave
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showRecipe, setShowRecipe] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [cachedVideoUrl, setCachedVideoUrl] = useState<string>(video.videoUrl);
    const [cachedThumbnailUrl, setCachedThumbnailUrl] = useState<string>(video.thumbnailUrl);
    const [isVideoError, setIsVideoError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [localIsLiked, setLocalIsLiked] = useState(initialIsLiked);
    const [localIsSaved, setLocalIsSaved] = useState(initialIsSaved);
    const [localLikesCount, setLocalLikesCount] = useState(video.likesCount);
    const [localBookmarksCount, setLocalBookmarksCount] = useState(video.bookmarksCount || 0);
    const wasPlayingRef = useRef(false);
    const progressBarWidth = useRef(0);
    const progressBarX = useRef(0);
    const retryCount = useRef(0);
    const playerRef = useRef<VideoPlayer | null>(null);

    // Update local state when props change
    useEffect(() => {
        setLocalIsLiked(initialIsLiked);
        setLocalIsSaved(initialIsSaved);
    }, [initialIsLiked, initialIsSaved]);

    const handleLike = () => {
        setLocalIsLiked(prev => !prev);
        setLocalLikesCount(prev => prev + (localIsLiked ? -1 : 1));
        onLike?.();
    };

    const handleSave = () => {
        setLocalIsSaved(prev => !prev);
        setLocalBookmarksCount(prev => prev + (localIsSaved ? -1 : 1));
        onSave?.();
    };

    const loadVideo = async () => {
        try {
            setIsLoading(true);
            setIsVideoError(false);
            
            // Try using the original URL first
            setCachedVideoUrl(video.videoUrl);
            
            // Cache thumbnail
            if (video.thumbnailUrl) {
                const cachedThumbnail = await cacheService.getCachedUrl(video.thumbnailUrl, false);
                setCachedThumbnailUrl(cachedThumbnail);
            }
            
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load video:', error);
            setIsVideoError(true);
            setIsLoading(false);
        }
    };

    // Cleanup function to handle player disposal
    const cleanupPlayer = () => {
        try {
            if (playerRef.current && playerRef.current.playing) {
                playerRef.current.pause();
                setIsPlaying(false);
            }
            playerRef.current = null;
        } catch (error) {
            // Silently handle cleanup errors
        }
    };

    useEffect(() => {
        loadVideo();
        return () => {
            if (playerRef.current) {
                console.log('Component unmounting, cleaning up player');
                cleanupPlayer();
            }
        };
    }, [video.videoUrl, video.thumbnailUrl]);

    const player = useVideoPlayer(cachedVideoUrl, (player: VideoPlayer) => {
        try {
            player.loop = true;
            if (playerRef.current) {
                cleanupPlayer();
            }
            playerRef.current = player;
        } catch (error) {
            console.error('Failed to initialize player:', error);
            setIsVideoError(true);
        }
    });

    // Monitor video loading and playback state
    useEffect(() => {
        if (!player) return;

        let isDisposed = false;

        const checkVideoState = () => {
            if (isDisposed) return;

            try {
                const currentTime = player.currentTime;
                const duration = player.duration;
                
                // Check if video has loaded
                if (duration > 0) {
                    setIsLoading(false);
                }

                // Check if video has ended
                if (currentTime >= duration && duration > 0) {
                    if (!isDisposed) {
                        player.currentTime = 0;
                        if (isPlaying) {
                            player.play();
                        }
                    }
                }
            } catch (error) {
                if (!isDisposed) {
                    setIsVideoError(true);
                }
            }
        };

        const interval = setInterval(checkVideoState, 1000);
        
        return () => {
            isDisposed = true;
            clearInterval(interval);
        };
    }, [player]);

    // Cleanup on unmount or URL change
    useEffect(() => {
        return () => {
            console.log('Component unmounting or URL changing, cleaning up player');
            cleanupPlayer();
        };
    }, [video.videoUrl]);

    const handleRetry = async () => {
        // Clean up existing player
        cleanupPlayer();
        
        // Reset all states
        setIsVideoError(false);
        setIsPlaying(false);
        setIsLoading(true);
        setProgress(0);
        retryCount.current += 1;
        
        // Try loading with the original URL again
        setCachedVideoUrl(video.videoUrl);
        
        // Wait a bit before starting playback
        setTimeout(() => {
            try {
                if (playerRef.current && !isVideoError) {
                    playerRef.current.currentTime = 0;
                    setIsPlaying(true);
                    try {
                        playerRef.current.play();
                    } catch (error) {
                        console.error('Failed to start playback:', error);
                        setIsVideoError(true);
                        setIsPlaying(false);
                    }
                }
            } catch (error) {
                console.error('Failed to retry playback:', error);
                setIsVideoError(true);
            }
        }, 1000);
    };

    const togglePlay = () => {
        if (isLoading || isVideoError) return;

        if (!playerRef.current) {
            setIsVideoError(true);
            return;
        }

        try {
            if (playerRef.current.playing) {
                playerRef.current.pause();
                setIsPlaying(false);
            } else {
                if (playerRef.current.currentTime >= playerRef.current.duration) {
                    playerRef.current.currentTime = 0;
                }
                playerRef.current.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Failed to toggle playback:', error);
            setIsVideoError(true);
            setIsPlaying(false);
        }
    };

    const calculateProgress = (touchX: number) => {
        const relativeX = touchX - progressBarX.current;
        return Math.max(0, Math.min(1, relativeX / progressBarWidth.current));
    };

    // Update progress periodically
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (!isScrubbing && player) {
            interval = setInterval(() => {
                if (player.duration > 0) {
                    const currentProgress = player.currentTime / player.duration;
                    setProgress(Math.min(1, Math.max(0, currentProgress)));
                }
            }, 100);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isScrubbing, player]);

    const seekTo = async (newProgress: number) => {
        if (player && player.duration > 0) {
            const seekTime = newProgress * player.duration;
            player.currentTime = seekTime;
            setProgress(newProgress);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (event: GestureResponderEvent) => {
                setIsScrubbing(true);
                wasPlayingRef.current = player.playing;
                if (player.playing) {
                    player.pause();
                }
                const touchX = event.nativeEvent.pageX;
                const newProgress = calculateProgress(touchX);
                seekTo(newProgress);
            },
            onPanResponderMove: (event: GestureResponderEvent) => {
                const touchX = event.nativeEvent.pageX;
                const newProgress = calculateProgress(touchX);
                seekTo(newProgress);
            },
            onPanResponderRelease: async (event: GestureResponderEvent) => {
                const touchX = event.nativeEvent.pageX;
                const newProgress = calculateProgress(touchX);
                
                // Ensure we seek the player correctly
                await seekTo(newProgress);
                setIsScrubbing(false);

                if (wasPlayingRef.current) {
                    setTimeout(() => {
                        player.play();
                    }, 50);
                }
            },
        })
    ).current;

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Check out this amazing recipe for ${video.title} by ${creator.name}!`,
                url: video.videoUrl, // This will work on iOS
                title: video.title, // This will be the subject on email shares
            });
            
            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                    console.log('Shared with activity type:', result.activityType);
                } else {
                    // shared
                    console.log('Shared successfully');
                }
            } else if (result.action === Share.dismissedAction) {
                // dismissed
                console.log('Share dismissed');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const navigateToProfile = () => {
        router.push(`/profile/${creator.userId}`);
    };

    // Calculate the exact height needed for each video
    const getVideoHeight = () => {
        if (variant === 'home') {
            // Return full screen height for perfect paging
            return height;
        }
        return height;
    };

    return (
        <View style={[
            styles.container,
            {
                height: height,
                marginTop: 0,
            }
        ]}>
            <View style={[
                styles.videoContainer,
                {
                    height: height - BOTTOM_TAB_HEIGHT - 20,
                }
            ]}>
                {!isVideoError ? (
                    <>
                        <VideoView
                            player={player}
                            style={styles.video}
                            contentFit="cover"
                            nativeControls={false}
                        />
                        {(!player.playing || !isPlaying || isLoading) && (
                            <Image 
                                source={{ uri: cachedThumbnailUrl }}
                                style={[styles.video, StyleSheet.absoluteFillObject]}
                                resizeMode="cover"
                            />
                        )}
                        {isLoading && (
                            <View style={[styles.video, styles.loadingContainer]}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}
                    </>
                ) : (
                    <View style={[styles.video, styles.errorContainer]}>
                        <Text style={styles.errorText}>Unable to load video</Text>
                        <TouchableOpacity 
                            style={styles.retryButton}
                            onPress={handleRetry}
                        >
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <TouchableOpacity 
                    onPress={togglePlay} 
                    style={styles.touchableOverlay}
                    activeOpacity={1}
                >
                    {(!isPlaying && !isVideoError && !isLoading) && (
                        <View style={styles.playButton}>
                            <Ionicons 
                                name="play" 
                                size={64} 
                                color="white" 
                                style={styles.playIcon}
                            />
                        </View>
                    )}
                </TouchableOpacity>
                <View 
                    style={[
                        styles.progressContainer,
                        {
                            bottom: BOTTOM_TAB_HEIGHT + 20, // Always position above nav bar
                        }
                    ]}
                    {...panResponder.panHandlers}
                    onLayout={(event) => {
                        const { width, x } = event.nativeEvent.layout;
                        progressBarWidth.current = width;
                        progressBarX.current = x;
                    }}
                >
                    <View style={[styles.progressLine, { width: `${progress * 100}%` }]} />
                    <View style={[
                        styles.scrubberHandle, 
                        { left: `${progress * 100}%` },
                        isScrubbing && { transform: [{ scale: 1.2 }] }
                    ]} />
                </View>
            </View>

            {/* Right side interaction buttons */}
            <View style={[
                styles.actions,
                variant === 'profile' && styles.actionsProfile,
                variant === 'home' && styles.actionsHome
            ]}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleLike}
                >
                    <Ionicons
                        name={localIsLiked ? 'heart' : 'heart-outline'}
                        size={28}
                        color={localIsLiked ? '#ff4444' : 'white'}
                    />
                    <Text style={styles.actionText}>
                        {localLikesCount || 0}
                    </Text>
                </TouchableOpacity>

                <View style={styles.actionButton}>
                    <CommentButton
                        comments={video.commentsCount}
                        onPress={onComment}
                        videoId={video.$id}
                    />
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSave}
                >
                    <Ionicons
                        name={localIsSaved ? 'bookmark' : 'bookmark-outline'}
                        size={26}
                        color="white"
                    />
                    <Text style={styles.actionText}>
                        {localBookmarksCount || 0}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowRecipe(true)}
                >
                    <Ionicons
                        name="restaurant-outline"
                        size={26}
                        color="white"
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleShare}
                >
                    <Ionicons
                        name="share-social-outline"
                        size={26}
                        color="white"
                    />
                </TouchableOpacity>
            </View>

            {/* Bottom info section */}
            <View style={[
                styles.overlay,
                {
                    paddingBottom: BOTTOM_TAB_HEIGHT + 20, // Always account for nav bar
                }
            ]}>
                <View style={styles.bottomSection}>
                    <TouchableOpacity 
                        style={styles.creatorInfo}
                        onPress={navigateToProfile}
                    >
                        {creator.avatarUrl ? (
                            <Image
                                source={{ uri: creator.avatarUrl }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {creator.name[0]}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.creatorName}>@{creator.name}</Text>
                    </TouchableOpacity>

                    <View style={styles.videoInfo}>
                        <Text style={styles.title}>{video.title}</Text>
                        <Text style={styles.description} numberOfLines={2}>
                            {video.description}
                        </Text>
                        <View style={styles.stats}>
                            <Text style={styles.stat}>
                                {video.cookingTime} mins • {video.difficulty}
                            </Text>
                            <Text style={styles.stat}>{video.cuisine}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <RecipeModal
                visible={showRecipe}
                onClose={() => setShowRecipe(false)}
                recipe={video}
            />
        </View>
    );
};

// Export the memoized version of the component
export const MemoizedVideoCard = React.memo(VideoCard);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: height,
        backgroundColor: 'transparent',
    },
    containerHome: {
        height: height - BOTTOM_TAB_HEIGHT,
    },
    videoContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        flex: 1,
    },
    touchableOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    playButton: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    actions: {
        position: 'absolute',
        right: 8,
        bottom: 180,
        alignItems: 'center',
        gap: 0,
    },
    actionsProfile: {
        bottom: 100,
    },
    actionsHome: {
        bottom: 100,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 90,
    },
    overlayProfile: {
        paddingBottom: 20,
    },
    overlayHome: {
        paddingBottom: BOTTOM_TAB_HEIGHT + 20,
    },
    actionButton: {
        alignItems: 'center',
        marginBottom: 8,
        height: 40,
        justifyContent: 'center',
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        marginTop: 0,
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1,
        textAlign: 'center',
        width: '100%'
    },
    likeButton: {
        alignItems: 'center',
        height: 45,
        justifyContent: 'center',
        marginBottom: 20,
    },
    bottomSection: {
        marginBottom: 0,
        paddingBottom: 16,
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        maxWidth: '60%',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#666',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    avatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1,
    },
    creatorName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1,
    },
    videoInfo: {
        maxWidth: '65%',
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1,
    },
    description: {
        color: 'white',
        fontSize: 14,
        marginBottom: 8,
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1,
    },
    stats: {
        flexDirection: 'row',
        gap: 8,
    },
    stat: {
        color: 'white',
        fontSize: 12,
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1,
    },
    progressContainer: {
        position: 'absolute',
        bottom: BOTTOM_TAB_HEIGHT + 30,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 10,
    },
    progressContainerExplore: {
        bottom: 120,
    },
    progressContainerProfile: {
        bottom: 20,
    },
    progressContainerHome: {
        bottom: BOTTOM_TAB_HEIGHT + 20,
    },
    progressLine: {
        height: '100%',
        width: '100%',
        backgroundColor: 'white',
    },
    scrubberHandle: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'white',
        top: -5,
        marginLeft: -6,
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.5)',
    },
    playIcon: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    errorContainer: {
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#ff4444',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    insightsButton: {
        backgroundColor: '#FCE4EC',
    },
    actionButtonText: {
        marginLeft: 5,
        fontSize: 14,
        color: '#E91E63',
    },
}); 