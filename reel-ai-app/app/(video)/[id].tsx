import React from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { VideoCard } from '../components/VideoCard';

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

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams();
  const [video, setVideo] = React.useState<Video | null>(null);
  const [creator, setCreator] = React.useState<{ name: string; avatarUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLiked, setIsLiked] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
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
          avatarUrl: creatorProfile.avatarUrl
        });
      } else {
        // Just load video and creator if not logged in
        const videoData = await DatabaseService.getVideoById(id as string);
        setVideo(videoData as Video);
        const creatorProfile = await DatabaseService.getProfile(videoData.userId);
        setCreator({
          name: creatorProfile.name,
          avatarUrl: creatorProfile.avatarUrl
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
      <VideoCard
        video={video}
        creator={creator}
        isLiked={isLiked}
        isSaved={isSaved}
        variant="profile"
        onLike={async () => {
          if (!currentUserId) return;
          try {
            if (isLiked) {
              await DatabaseService.unlikeVideo(currentUserId, video.$id);
            } else {
              await DatabaseService.likeVideo(currentUserId, video.$id);
            }
            setIsLiked(!isLiked);
            loadVideo(); // Refresh video data to get updated counts
          } catch (error) {
            console.error('Error toggling like:', error);
          }
        }}
        onComment={() => {
          // Comment handling is built into VideoCard
        }}
        onSave={async () => {
          if (!currentUserId) return;
          try {
            if (isSaved) {
              await DatabaseService.unsaveRecipe(currentUserId, video.$id);
            } else {
              await DatabaseService.saveRecipe(currentUserId, video.$id);
            }
            setIsSaved(!isSaved);
            loadVideo(); // Refresh video data to get updated counts
          } catch (error) {
            console.error('Error toggling save:', error);
          }
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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 