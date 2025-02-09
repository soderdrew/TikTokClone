import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AuthService, DatabaseService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { MemoizedVideoCard as VideoCard } from '../components/VideoCard';
import EditProfileModal from '../components/modals/EditProfileModal';
import FollowListModal from '../components/modals/FollowListModal';

interface UserProfile extends Models.Document {
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
}

export default function ProfileScreen() {
  const [user, setUser] = React.useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = React.useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = React.useState<Video[]>([]);
  const [activeTab, setActiveTab] = React.useState<'recipes' | 'liked' | 'saved'>('recipes');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [followModalVisible, setFollowModalVisible] = React.useState(false);
  const [followModalType, setFollowModalType] = React.useState<'followers' | 'following'>('followers');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Fetch user data on component mount
  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadAllVideos = async (userId: string) => {
    try {
      // Load user's videos
      const userVideos = await DatabaseService.getVideosByUser(userId);
      setVideos(userVideos.documents as Video[]);

      // Load liked videos
      const liked = await DatabaseService.getLikedVideos(userId);
      setLikedVideos(liked.documents as Video[]);

      // Load saved videos
      const saved = await DatabaseService.getSavedRecipes(userId);
      setSavedVideos(saved.documents as Video[]);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  const animateProfileUpdate = () => {
    // Reset animations
    fadeAnim.setValue(1);
    scaleAnim.setValue(1);

    // Create animation sequence
    Animated.sequence([
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        router.replace('/auth/login');
        return;
      }
      setUser(currentUser);

      // Load profile data
      const userProfile = await DatabaseService.getProfile(currentUser.$id);
      
      // Sync recipes count with actual number of videos
      await DatabaseService.syncRecipesCount(currentUser.$id);
      
      // Reload profile to get updated count
      const updatedProfile = await DatabaseService.getProfile(currentUser.$id);
      setProfile(updatedProfile as UserProfile);

      // Load all video types
      await loadAllVideos(currentUser.$id);
      
      // Trigger animation after profile update
      animateProfileUpdate();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUserData();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalVisible(true);
  };

  const getActiveVideos = () => {
    switch (activeTab) {
      case 'liked':
        return likedVideos;
      case 'saved':
        return savedVideos;
      default:
        return videos;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4444" />
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Could not load profile</Text>
      </View>
    );
  }

  const renderVideo = ({ item }: { item: Video }) => (
    <TouchableOpacity 
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
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={getActiveVideos()}
        renderItem={renderVideo}
        keyExtractor={item => item.$id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#ff4444"
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.username}>{profile.name}</Text>
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.logoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <Animated.View 
              style={[
                styles.profileInfo,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <View style={styles.avatarContainer}>
                <Image
                  style={styles.avatar}
                  source={{ 
                    uri: profile.avatarUrl || 'https://via.placeholder.com/100'
                  }}
                />
              </View>

              {/* Bio */}
              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : (
                <Text style={[styles.bio, styles.placeholderBio]}>No bio yet</Text>
              )}

              {/* Edit Profile Button */}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>

              {/* Stats */}
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

              {/* Tabs */}
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'recipes' && styles.activeTab]}
                  onPress={() => setActiveTab('recipes')}
                >
                  <Ionicons 
                    name="grid-outline" 
                    size={24} 
                    color={activeTab === 'recipes' ? '#ff4444' : '#fff'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
                  onPress={() => setActiveTab('liked')}
                >
                  <Ionicons 
                    name="heart-outline" 
                    size={24} 
                    color={activeTab === 'liked' ? '#ff4444' : '#fff'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
                  onPress={() => setActiveTab('saved')}
                >
                  <Ionicons 
                    name="bookmark-outline" 
                    size={24} 
                    color={activeTab === 'saved' ? '#ff4444' : '#fff'} 
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              {activeTab === 'recipes' ? 'No recipes posted yet' :
               activeTab === 'liked' ? 'No liked videos yet' :
               'No saved recipes yet'}
            </Text>
            {/* {activeTab === 'recipes' && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => {
                  router.push('/create');
                }}
              >
                <Text style={styles.createButtonText}>Create Your First Recipe</Text>
              </TouchableOpacity>
            )} */}
          </View>
        }
        contentContainerStyle={styles.flatListContent}
      />

      {/* Edit Profile Modal */}
      {profile && (
        <>
          <EditProfileModal
            visible={isEditModalVisible}
            onClose={() => setIsEditModalVisible(false)}
            currentProfile={profile}
            onProfileUpdate={loadUserData}
          />
          <FollowListModal
            visible={followModalVisible}
            onClose={() => setFollowModalVisible(false)}
            userId={profile.userId}
            type={followModalType}
          />
        </>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (width - (HORIZONTAL_PADDING * 2) - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flatListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  bio: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  placeholderBio: {
    color: '#666',
    fontStyle: 'italic',
  },
  editButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    color: '#888',
    marginTop: 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
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
    height: CARD_WIDTH, // Square aspect ratio
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
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    marginBottom: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ff4444',
  },
}); 