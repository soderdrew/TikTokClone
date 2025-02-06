import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { VideoCard } from '../components/VideoCard';
import { router } from 'expo-router';

interface Profile extends Models.Document {
    userId: string;
    name: string;
    bio: string;
    avatarUrl: string;
    recipesCount: number;
    followersCount: number;
    followingCount: number;
}

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

const { width } = Dimensions.get('window');

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, [id]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            // Get current user
            const user = await AuthService.getCurrentUser();
            if (user) {
                setCurrentUserId(user.$id);
                // Check if following
                const following = await DatabaseService.isFollowing(user.$id, id as string);
                setIsFollowing(following);
            }

            // Load profile
            const userProfileData = await DatabaseService.getProfile(id as string);
            const userProfile: Profile = {
                ...userProfileData,
                userId: userProfileData.userId,
                name: userProfileData.name,
                bio: userProfileData.bio || '',
                avatarUrl: userProfileData.avatarUrl || '',
                recipesCount: userProfileData.recipesCount || 0,
                followersCount: userProfileData.followersCount || 0,
                followingCount: userProfileData.followingCount || 0,
            };
            setProfile(userProfile);

            // Load user's videos
            const userVideos = await DatabaseService.getUserVideos(id as string);
            setVideos(userVideos.documents as Video[]);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUserId || !profile) return;
        
        try {
            // Optimistically update UI
            setIsFollowing(prev => !prev);
            setProfile(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    followersCount: prev.followersCount + (isFollowing ? -1 : 1)
                };
            });

            // Make API call in background
            if (isFollowing) {
                await DatabaseService.unfollowUser(currentUserId, profile.userId);
            } else {
                await DatabaseService.followUser(currentUserId, profile.userId);
            }
        } catch (error) {
            // Revert optimistic updates on error
            console.error('Error toggling follow:', error);
            setIsFollowing(prev => !prev);
            setProfile(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    followersCount: prev.followersCount + (isFollowing ? 1 : -1)
                };
            });
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Profile not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                {profile.avatarUrl ? (
                    <Image
                        source={{ uri: profile.avatarUrl }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {profile.name[0]}
                        </Text>
                    </View>
                )}
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.bio}>{profile.bio}</Text>

                {/* Only show follow button if viewing another user's profile */}
                {currentUserId && currentUserId !== profile.userId && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            isFollowing && styles.followingButton
                        ]}
                        onPress={handleFollowToggle}
                    >
                        <Text style={[
                            styles.followButtonText,
                            isFollowing && styles.followingButtonText
                        ]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{profile.recipesCount}</Text>
                        <Text style={styles.statLabel}>Recipes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{profile.followersCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{profile.followingCount}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Recipes</Text>
                <View style={styles.videosGrid}>
                    {videos.map(video => (
                        <TouchableOpacity 
                            key={video.$id}
                            style={styles.videoCard}
                            onPress={() => router.push(`/(video)/${video.$id}`)}
                        >
                            <Image
                                source={{ uri: video.thumbnailUrl }}
                                style={styles.thumbnail}
                            />
                            <View style={styles.videoInfo}>
                                <Text style={styles.videoTitle} numberOfLines={1}>
                                    {video.title}
                                </Text>
                                <Text style={styles.videoStats}>
                                    {video.likesCount || 0} likes • {video.commentsCount || 0} comments
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    errorText: {
        color: 'white',
        fontSize: 16,
    },
    header: {
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
    },
    name: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    bio: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#999',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    videosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 5,
    },
    videoCard: {
        width: (width - 40) / 2, // 2 columns with gap
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 10,
    },
    thumbnail: {
        width: '100%',
        height: (width - 40) / 2, // Square aspect ratio
        backgroundColor: '#333',
    },
    videoInfo: {
        padding: 10,
    },
    videoTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    videoStats: {
        color: '#999',
        fontSize: 12,
    },
    followButton: {
        backgroundColor: '#ff4444',
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
        marginVertical: 16,
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ff4444',
    },
    followButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    followingButtonText: {
        color: '#ff4444',
    },
}); 