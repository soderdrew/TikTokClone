import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Share
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CommentButton from './interactions/CommentButton';
import RecipeModal from './modals/RecipeModal';

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
    variant?: 'profile' | 'home';
    onLike: () => void;
    onComment: () => void;
    onSave: () => void;
}

const { width, height } = Dimensions.get('window');

export const VideoCard: React.FC<VideoCardProps> = ({
    video,
    creator,
    isLiked = false,
    isSaved = false,
    variant = 'home',
    onLike,
    onComment,
    onSave
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showRecipe, setShowRecipe] = useState(false);

    const player = useVideoPlayer(video.videoUrl, player => {
        player.loop = true;
    });

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

    const togglePlay = () => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
        setIsPlaying(!isPlaying);
    };

    const navigateToProfile = () => {
        router.push(`/profile/${creator.userId}`);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={togglePlay} style={styles.videoContainer}>
                <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="cover"
                    nativeControls={false}
                />
                {!isPlaying && (
                    <View style={styles.playButton}>
                        <Ionicons name="play" size={50} color="white" />
                    </View>
                )}
            </TouchableOpacity>

            {/* Right side interaction buttons */}
            <View style={[
                styles.actions,
                variant === 'profile' && styles.actionsProfile
            ]}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onLike}
                >
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={28}
                        color={isLiked ? '#ff4444' : 'white'}
                    />
                    <Text style={styles.actionText}>
                        {video.likesCount || 0}
                    </Text>
                </TouchableOpacity>

                <View style={styles.actionButton}>
                    <CommentButton
                        comments={video.commentsCount}
                        onPress={() => onComment?.()}
                        videoId={video.$id}
                    />
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onSave}
                >
                    <Ionicons
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        size={26}
                        color="white"
                    />
                    <Text style={styles.actionText}>
                        {video.bookmarksCount || 0}
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
                variant === 'profile' && styles.overlayProfile
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: height,
        backgroundColor: 'transparent',
    },
    videoContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        flex: 1,
    },
    playButton: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -40 }, { translateY: -40 }],
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
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 90,
    },
    overlayProfile: {
        paddingBottom: 20,
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
}); 