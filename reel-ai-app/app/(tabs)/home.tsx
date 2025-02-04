import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import InteractionButton from '../components/common/InteractionButton';
import { LikeButton } from '../components/interactions/LikeButton';
import { CommentButton } from '../components/interactions/CommentButton';
import { ShareButton } from '../components/interactions/ShareButton';
import { BookmarkButton } from '../components/interactions/BookmarkButton';

const { width, height } = Dimensions.get('window');

interface Video {
  id: string;
  title: string;
  likes: number;
  comments: number;
  bookmarks: number;
}

export default function HomeScreen() {
  const [likedVideos, setLikedVideos] = React.useState<Set<string>>(new Set());
  const [bookmarkedVideos, setBookmarkedVideos] = React.useState<Set<string>>(new Set());
  const flatListRef = React.useRef<FlatList>(null);

  const handleLike = (id: string) => {
    setLikedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleComment = (id: string) => {
    console.log('Comment pressed for video:', id);
  };

  const handleBookmark = (id: string) => {
    setBookmarkedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const dummyVideos: Video[] = [
    { id: '1', title: 'Recipe 1', likes: 1200, comments: 45, bookmarks: 234 },
    { id: '2', title: 'Recipe 2', likes: 800, comments: 32, bookmarks: 156 },
    { id: '3', title: 'Recipe 3', likes: 2300, comments: 89, bookmarks: 445 },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={dummyVideos}
        snapToInterval={height}
        decelerationRate="fast"
        bounces={false}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
        onMomentumScrollEnd={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          const maxScroll = (dummyVideos.length - 1) * height;
          
          if (y > maxScroll) {
            flatListRef.current?.scrollToOffset({
              offset: maxScroll,
              animated: true
            });
          }
        }}
        ref={flatListRef}
        renderItem={({ item }) => (
          <View style={styles.videoContainer}>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoTitle}>{item.title}</Text>
            </View>
            <View style={styles.interactions}>
              <LikeButton
                isLiked={likedVideos.has(item.id)}
                likes={item.likes}
                onPress={() => handleLike(item.id)}
              />
              <CommentButton
                comments={item.comments}
                onPress={() => handleComment(item.id)}
                videoId={item.id}
              />
              <BookmarkButton
                isBookmarked={bookmarkedVideos.has(item.id)}
                bookmarks={item.bookmarks}
                onPress={() => handleBookmark(item.id)}
              />
              <ShareButton
                videoId={item.id}
                title={item.title}
                onPress={() => console.log('Shared video:', item.id)}
              />
              <InteractionButton
                icon="restaurant-outline"
                text="Recipe"
                style={styles.recipeButton}
              />
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.username}>@chef_username</Text>
              <Text style={styles.description}>Delicious recipe description #food #cooking</Text>
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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