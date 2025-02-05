import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import CommentButton from './interactions/CommentButton';

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
    };
    creator: {
        name: string;
        avatarUrl?: string;
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

    const player = useVideoPlayer(video.videoUrl, player => {
        player.loop = true;
    });

    const togglePlay = () => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
        setIsPlaying(!isPlaying);
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
                    style={styles.likeButton}
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
                    <View style={styles.creatorInfo}>
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
                    </View>

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
        marginBottom: 0,
        height: 45,
        justifyContent: 'center',
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        marginTop: 2,
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
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    creatorName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    videoInfo: {
        maxWidth: '75%',
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    description: {
        color: 'white',
        fontSize: 14,
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    stats: {
        flexDirection: 'row',
        gap: 8,
    },
    stat: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
}); 