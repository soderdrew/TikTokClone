import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { VideoCard } from '../components/VideoCard';
import { router } from 'expo-router';
import FollowListModal from '../components/modals/FollowListModal';
import BackButton from '../components/BackButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 20;
const CARD_WIDTH = (width - (HORIZONTAL_PADDING * 2) - CARD_GAP) / 2;

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [followModalVisible, setFollowModalVisible] = useState(false);
    const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
    const insets = useSafeAreaInsets();

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
            
            // Sync recipes count with actual number of videos
            await DatabaseService.syncRecipesCount(id as string);
            
            // Reload profile to get updated count
            const updatedProfileData = await DatabaseService.getProfile(id as string);
            const userProfile: Profile = {
                ...updatedProfileData,
                userId: updatedProfileData.userId,
                name: updatedProfileData.name,
                bio: updatedProfileData.bio || '',
                avatarUrl: updatedProfileData.avatarUrl || '',
                recipesCount: updatedProfileData.recipesCount || 0,
                followersCount: updatedProfileData.followersCount || 0,
                followingCount: updatedProfileData.followingCount || 0,
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <BackButton />
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
                        <TouchableOpacity 
                            style={styles.statItem}
                            onPress={() => {
                                setFollowModalType('followers');
                                setFollowModalVisible(true);
                            }}
                        >
                            <Text style={styles.statNumber}>{profile.followersCount}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.statItem}
                            onPress={() => {
                                setFollowModalType('following');
                                setFollowModalVisible(true);
                            }}
                        >
                            <Text style={styles.statNumber}>{profile.followingCount}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add FollowListModal */}
                    <FollowListModal
                        visible={followModalVisible}
                        onClose={() => setFollowModalVisible(false)}
                        userId={profile.userId}
                        type={followModalType}
                    />
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Recipes</Text>
                    <FlatList
                        data={videos}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                key={item.$id}
                                style={styles.videoCard}
                                onPress={() => router.push(`/(video)/${item.$id}`)}
                            >
                                <Image
                                    source={{ uri: item.thumbnailUrl }}
                                    style={styles.thumbnail}
                                />
                                <View style={styles.videoInfo}>
                                    <Text style={styles.videoTitle} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.videoStats}>
                                        {item.likesCount || 0} likes • {item.commentsCount || 0} comments
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        keyExtractor={item => item.$id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        scrollEnabled={false}
                    />
                </View>
            </ScrollView>
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
        padding: 8,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    videosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: 8,
    },
    row: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: HORIZONTAL_PADDING,
        gap: CARD_GAP,
    },
    videoCard: {
        width: CARD_WIDTH,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: CARD_GAP,
    },
    thumbnail: {
        width: '100%',
        height: CARD_WIDTH,
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