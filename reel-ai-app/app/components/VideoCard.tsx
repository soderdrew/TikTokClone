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
import { DatabaseService } from '../services/appwrite';

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
    };
    creator: {
        name: string;
        avatarUrl?: string;
    };
    onLike?: () => void;
    onComment?: () => void;
    onSave?: () => void;
}

const { width, height } = Dimensions.get('window');

export const VideoCard: React.FC<VideoCardProps> = ({
    video,
    creator,
    onLike,
    onComment,
    onSave
}) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const player = useVideoPlayer(video.videoUrl, player => {
        player.loop = true;
    });

    const handleLike = async () => {
        try {
            if (isLiked) {
                await DatabaseService.unlikeVideo(video.userId, video.$id);
            } else {
                await DatabaseService.likeVideo(video.userId, video.$id);
            }
            setIsLiked(!isLiked);
            if (onLike) onLike();
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const handleSave = async () => {
        try {
            if (isSaved) {
                await DatabaseService.unsaveRecipe(video.userId, video.$id);
            } else {
                await DatabaseService.saveRecipe(video.userId, video.$id);
            }
            setIsSaved(!isSaved);
            if (onSave) onSave();
        } catch (error) {
            console.error('Error toggling save:', error);
        }
    };

    const togglePlay = () => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
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
                {!player.playing && (
                    <View style={styles.playButton}>
                        <Ionicons name="play" size={50} color="white" />
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.overlay}>
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
                    <Text style={styles.creatorName}>{creator.name}</Text>
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

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleLike}
                    >
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={28}
                            color={isLiked ? '#ff4444' : 'white'}
                        />
                        <Text style={styles.actionText}>
                            {video.likesCount}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onComment}
                    >
                        <Ionicons
                            name="chatbubble-outline"
                            size={26}
                            color="white"
                        />
                        <Text style={styles.actionText}>
                            {video.commentsCount}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleSave}
                    >
                        <Ionicons
                            name={isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={26}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width,
        height: height - 49, // Subtract tab bar height
        backgroundColor: '#000',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    playButton: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 40,
        padding: 15,
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    creatorName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    videoInfo: {
        marginBottom: 15,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    description: {
        color: '#eee',
        fontSize: 14,
        marginBottom: 8,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat: {
        color: '#ddd',
        fontSize: 12,
        marginRight: 15,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    actionButton: {
        alignItems: 'center',
        marginLeft: 20,
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        marginTop: 2,
    },
}); 