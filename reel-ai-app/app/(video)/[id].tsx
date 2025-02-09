import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { MemoizedVideoCard as VideoCard } from '../components/VideoCard';
import BackButton from '../components/BackButton';

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
  bookmarksCount?: number;
  userId: string;
}

const { width, height } = Dimensions.get('window');
const BOTTOM_TAB_HEIGHT = 60;

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<{ name: string; avatarUrl?: string; userId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    try {
      setIsLoading(true);
      // Get current user
      const user = await AuthService.getCurrentUser();
      if (user) {
        setCurrentUserId(user.$id);
        // Check if video is liked and saved
        const [videoData, liked, saved] = await Promise.all([
          DatabaseService.getVideoById(id as string),
          DatabaseService.isVideoLiked(user.$id, id as string),
          DatabaseService.isRecipeSaved(user.$id, id as string)
        ]);
        setVideo(videoData as Video);
        setIsLiked(liked);
        setIsSaved(saved);

        // Load creator profile
        const creatorProfile = await DatabaseService.getProfile(videoData.userId);
        setCreator({
          name: creatorProfile.name,
          avatarUrl: creatorProfile.avatarUrl,
          userId: videoData.userId
        });
      } else {
        // Just load video and creator if not logged in
        const videoData = await DatabaseService.getVideoById(id as string);
        setVideo(videoData as Video);
        const creatorProfile = await DatabaseService.getProfile(videoData.userId);
        setCreator({
          name: creatorProfile.name,
          avatarUrl: creatorProfile.avatarUrl,
          userId: videoData.userId
        });
      }
    } catch (error) {
      console.error('Error loading video:', error);
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (video) {
      // Update the screen title when video loads
      router.setParams({ title: video.title });
    }
  }, [video]);

  const handleLike = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) return;

      if (isLiked) {
        await DatabaseService.unlikeVideo(user.$id, id as string);
        setVideo(prev => prev ? {
          ...prev,
          likesCount: Math.max(0, prev.likesCount - 1)
        } : prev);
      } else {
        await DatabaseService.likeVideo(user.$id, id as string);
        setVideo(prev => prev ? {
          ...prev,
          likesCount: prev.likesCount + 1
        } : prev);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) return;

      if (isSaved) {
        await DatabaseService.unsaveRecipe(user.$id, id as string);
        setVideo(prev => prev ? {
          ...prev,
          bookmarksCount: Math.max(0, (prev.bookmarksCount || 0) - 1)
        } : prev);
      } else {
        await DatabaseService.saveRecipe(user.$id, id as string);
        setVideo(prev => prev ? {
          ...prev,
          bookmarksCount: (prev.bookmarksCount || 0) + 1
        } : prev);
      }
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4444" />
      </View>
    );
  }

  if (!video || !creator) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BackButton />
      <VideoCard
        video={video}
        creator={creator}
        isLiked={isLiked}
        isSaved={isSaved}
        variant="profile"
        onLike={handleLike}
        onComment={() => {
          // Comment handling is built into VideoCard
        }}
        onSave={handleSave}
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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  }
}); 