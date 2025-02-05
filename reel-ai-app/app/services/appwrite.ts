import { Client, Account, ID, Models, Databases, Query, Storage } from 'react-native-appwrite';
import Constants from 'expo-constants';
import * as VideoThumbnails from 'expo-video-thumbnails';

const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.APPWRITE_ENDPOINT as string;
const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.APPWRITE_PROJECT_ID as string;

// Initialize Appwrite Client
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setPlatform('com.soderdrew.reelai'); // Your bundle ID from app.json

// Initialize Appwrite Account and Database
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Database IDs - we'll create these in Appwrite Console
const DATABASE_ID = 'reel-ai-main';
const STORAGE_ID = 'recipe-videos';
const COLLECTIONS = {
    PROFILES: 'profiles',
    VIDEOS: 'videos',
    LIKES: 'likes',
    COMMENTS: 'comments',
    SAVED_RECIPES: 'saved_recipes'
};

// Authentication service
export const AuthService = {
    // Create a new account
    createAccount: async (email: string, password: string, name: string) => {
        try {
            const response = await account.create(
                ID.unique(),
                email,
                password,
                name
            );
            return response;
        } catch (error) {
            console.error('Appwrite service :: createAccount :: error', error);
            throw error;
        }
    },

    // Login with email
    login: async (email: string, password: string) => {
        try {
            console.log('Attempting to create session for:', { email }); // Debug log before
            const session = await account.createEmailPasswordSession(email, password);
            console.log('Session created successfully:', session); // Debug log after
            return session;
        } catch (error) {
            console.error('Appwrite service :: login :: error', error);
            throw error;
        }
    },

    // Logout
    logout: async () => {
        try {
            await account.deleteSession('current');
        } catch (error) {
            console.error('Appwrite service :: logout :: error', error);
            throw error;
        }
    },

    // Get current user
    getCurrentUser: async () => {
        try {
            return await account.get();
        } catch (error) {
            console.error('Appwrite service :: getCurrentUser :: error', error);
            return null;
        }
    },

    // Check if user is logged in
    isLoggedIn: async () => {
        try {
            const user = await account.get();
            return !!user;
        } catch (error) {
            return false;
        }
    }
};

// Database service
export const DatabaseService = {
    // Profile Methods
    createProfile: async (userId: string, name: string) => {
        try {
            return await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                userId, // Use the userId as the document ID
                {
                    userId,
                    name,
                    bio: '',
                    avatarUrl: '',
                    recipesCount: 0,
                    followersCount: 0,
                    followingCount: 0
                }
            );
        } catch (error) {
            console.error('DatabaseService :: createProfile :: error', error);
            throw error;
        }
    },

    ensureProfile: async (userId: string) => {
        try {
            // Try to get the profile
            try {
                return await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.PROFILES,
                    userId
                );
            } catch (error) {
                // If profile doesn't exist, get user details and create one
                const user = await account.get();
                if (user) {
                    return await DatabaseService.createProfile(userId, user.name);
                }
                throw new Error('Could not create profile: User not found');
            }
        } catch (error) {
            console.error('DatabaseService :: ensureProfile :: error', error);
            throw error;
        }
    },

    getProfile: async (userId: string) => {
        try {
            // Use ensureProfile instead of direct getDocument
            return await DatabaseService.ensureProfile(userId);
        } catch (error) {
            console.error('DatabaseService :: getProfile :: error', error);
            throw error;
        }
    },

    // Video Methods
    getVideos: async (limit: number = 10, lastId?: string) => {
        try {
            const queries = [
                Query.orderDesc('createdAt'),
                Query.limit(limit)
            ];
            
            if (lastId) {
                queries.push(Query.cursorAfter(lastId));
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                queries
            );

            return response;
        } catch (error) {
            console.error('DatabaseService :: getVideos :: error', error);
            throw error;
        }
    },

    getVideosByUser: async (userId: string, limit: number = 10) => {
        try {
            return await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                [
                    Query.equal('userId', userId),
                    Query.orderDesc('createdAt'),
                    Query.limit(limit)
                ]
            );
        } catch (error) {
            console.error('DatabaseService :: getVideosByUser :: error', error);
            throw error;
        }
    },

    getVideoById: async (videoId: string) => {
        try {
            return await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId
            );
        } catch (error) {
            console.error('DatabaseService :: getVideoById :: error', error);
            throw error;
        }
    },

    // Like Methods
    likeVideo: async (userId: string, videoId: string) => {
        try {
            // First check if the video is already liked
            const existingLike = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                    Query.limit(1)
                ]
            );

            // If already liked, return the existing document
            if (existingLike.documents.length > 0) {
                return existingLike.documents[0];
            }

            // If not liked, create a new like
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                ID.unique(),
                {
                    userId,
                    videoId,
                    createdAt: new Date().toISOString()
                }
            );

            // Increment the likesCount in the video document
            const video = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId
            );

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId,
                {
                    likesCount: (video.likesCount || 0) + 1
                }
            );

            return response;
        } catch (error) {
            console.error('DatabaseService :: likeVideo :: error', error);
            throw error;
        }
    },

    unlikeVideo: async (userId: string, videoId: string) => {
        try {
            // Find the like document
            const likes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                    Query.limit(1)
                ]
            );

            if (likes.documents.length > 0) {
                // Delete the like
                await databases.deleteDocument(
                    DATABASE_ID,
                    COLLECTIONS.LIKES,
                    likes.documents[0].$id
                );

                // Decrement the likesCount in the video document
                const video = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.VIDEOS,
                    videoId
                );

                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.VIDEOS,
                    videoId,
                    {
                        likesCount: Math.max(0, (video.likesCount || 0) - 1)
                    }
                );
            }
        } catch (error) {
            console.error('DatabaseService :: unlikeVideo :: error', error);
            throw error;
        }
    },

    isVideoLiked: async (userId: string, videoId: string) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                    Query.limit(1)
                ]
            );
            return response.documents.length > 0;
        } catch (error) {
            console.error('DatabaseService :: isVideoLiked :: error', error);
            return false;
        }
    },

    // Comment Methods
    getComments: async (videoId: string, limit: number = 20) => {
        try {
            return await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                [
                    Query.equal('videoId', videoId),
                    Query.orderDesc('createdAt'),
                    Query.limit(limit)
                ]
            );
        } catch (error) {
            console.error('DatabaseService :: getComments :: error', error);
            throw error;
        }
    },

    addComment: async (userId: string, videoId: string, text: string) => {
        try {
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                ID.unique(),
                {
                    userId,
                    videoId,
                    content: text,
                    likesCount: 0,
                    createdAt: new Date().toISOString()
                }
            );

            // Increment the commentsCount in the video document
            const video = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId
            );

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId,
                {
                    commentsCount: (video.commentsCount || 0) + 1
                }
            );

            return response;
        } catch (error) {
            console.error('DatabaseService :: addComment :: error', error);
            throw error;
        }
    },

    deleteComment: async (videoId: string, commentId: string) => {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                commentId
            );

            // Decrement the commentsCount in the video document
            const video = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId
            );

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId,
                {
                    commentsCount: Math.max(0, (video.commentsCount || 0) - 1)
                }
            );
        } catch (error) {
            console.error('DatabaseService :: deleteComment :: error', error);
            throw error;
        }
    },

    likeComment: async (userId: string, commentId: string) => {
        try {
            const comment = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                commentId
            );

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                commentId,
                {
                    likesCount: (comment.likesCount || 0) + 1
                }
            );
        } catch (error) {
            console.error('DatabaseService :: likeComment :: error', error);
            throw error;
        }
    },

    unlikeComment: async (userId: string, commentId: string) => {
        try {
            const comment = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                commentId
            );

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                commentId,
                {
                    likesCount: Math.max(0, (comment.likesCount || 0) - 1)
                }
            );
        } catch (error) {
            console.error('DatabaseService :: unlikeComment :: error', error);
            throw error;
        }
    },

    // Saved Recipes Methods
    saveRecipe: async (userId: string, videoId: string) => {
        try {
            // First check if the recipe is already saved
            const existingSave = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                    Query.limit(1)
                ]
            );

            // If already saved, return the existing document
            if (existingSave.documents.length > 0) {
                return existingSave.documents[0];
            }

            // If not saved, create a new save
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                ID.unique(),
                {
                    userId,
                    videoId,
                    createdAt: new Date().toISOString()
                }
            );

            // Increment the bookmarksCount in the video document
            const video = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId
            );

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId,
                {
                    bookmarksCount: (video.bookmarksCount || 0) + 1
                }
            );

            return response;
        } catch (error) {
            console.error('DatabaseService :: saveRecipe :: error', error);
            throw error;
        }
    },

    unsaveRecipe: async (userId: string, videoId: string) => {
        try {
            const saves = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                    Query.limit(1)
                ]
            );

            if (saves.documents.length > 0) {
                await databases.deleteDocument(
                    DATABASE_ID,
                    COLLECTIONS.SAVED_RECIPES,
                    saves.documents[0].$id
                );

                // Decrement the bookmarksCount in the video document
                const video = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.VIDEOS,
                    videoId
                );

                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.VIDEOS,
                    videoId,
                    {
                        bookmarksCount: Math.max(0, (video.bookmarksCount || 0) - 1)
                    }
                );
            }
        } catch (error) {
            console.error('DatabaseService :: unsaveRecipe :: error', error);
            throw error;
        }
    },

    isRecipeSaved: async (userId: string, videoId: string) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                    Query.limit(1)
                ]
            );
            return response.documents.length > 0;
        } catch (error) {
            console.error('DatabaseService :: isRecipeSaved :: error', error);
            return false;
        }
    },

    getSavedRecipes: async (userId: string, limit: number = 10) => {
        try {
            // First get the saved video IDs
            const saved = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                [
                    Query.equal('userId', userId),
                    Query.orderDesc('createdAt'),
                    Query.limit(limit)
                ]
            );

            // Then fetch the actual videos
            const videoIds = saved.documents.map(save => save.videoId);
            if (videoIds.length === 0) return { documents: [] };

            // If there's only one video, use a simple equal query
            const queries = videoIds.length === 1 
                ? [Query.equal('$id', videoIds[0])]
                : [Query.or(videoIds.map(id => Query.equal('$id', id)))];

            const videos = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                [...queries, Query.limit(limit)]
            );

            return videos;
        } catch (error) {
            console.error('DatabaseService :: getSavedRecipes :: error', error);
            throw error;
        }
    },

    getLikedVideos: async (userId: string, limit: number = 10) => {
        try {
            // First get the liked video IDs
            const likes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                [
                    Query.equal('userId', userId),
                    Query.orderDesc('createdAt'),
                    Query.limit(limit)
                ]
            );

            // Then fetch the actual videos
            const videoIds = likes.documents.map(like => like.videoId);
            if (videoIds.length === 0) return { documents: [] };

            // If there's only one video, use a simple equal query
            const queries = videoIds.length === 1 
                ? [Query.equal('$id', videoIds[0])]
                : [Query.or(videoIds.map(id => Query.equal('$id', id)))];

            const videos = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                [...queries, Query.limit(limit)]
            );

            return videos;
        } catch (error) {
            console.error('DatabaseService :: getLikedVideos :: error', error);
            throw error;
        }
    },

    updateAllVideoThumbnails: async () => {
        try {
            // Get all videos with example.com thumbnails
            const videos = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                [
                    Query.or([
                        Query.equal('thumbnailUrl', 'https://example.com/thumb1.jpg'),
                        Query.equal('thumbnailUrl', 'https://example.com/thumb2.jpg'),
                        Query.equal('thumbnailUrl', 'https://example.com/thumb3.jpg')
                    ])
                ]
            );

            console.log('Found videos to update thumbnails:', videos.documents.length);

            // Generate thumbnails for each video
            for (const video of videos.documents) {
                try {
                    // Get video file ID from videoUrl
                    const videoId = video.videoUrl.split('/files/')[1].split('/view')[0];
                    
                    // Generate and upload thumbnail
                    const thumbnailUrl = await StorageService.generateThumbnailForExistingVideo(videoId);

                    // Update video document with thumbnail URL
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.VIDEOS,
                        video.$id,
                        {
                            thumbnailUrl: thumbnailUrl
                        }
                    );

                    console.log(`Updated thumbnail for video: ${video.$id}`);
                } catch (error) {
                    console.error(`Error updating thumbnail for video ${video.$id}:`, error);
                    // Continue with next video even if one fails
                    continue;
                }
            }
        } catch (error) {
            console.error('Error updating video thumbnails:', error);
            throw error;
        }
    }
};

// Storage service
export const StorageService = {
    generateThumbnail: async (videoUrl: string) => {
        try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
                time: 0, // Get thumbnail from first frame
                quality: 0.5, // Medium quality
            });
            return uri;
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            throw error;
        }
    },

    uploadThumbnail: async (thumbnailUri: string) => {
        try {
            // Convert uri to file object
            const response = await fetch(thumbnailUri);
            const blob = await response.blob();
            const file = {
                uri: thumbnailUri,
                name: `thumbnail-${Date.now()}.png`,
                type: 'image/png',
                size: blob.size,
            };

            const uploadedFile = await storage.createFile(
                STORAGE_ID, // Use the same storage bucket as videos
                ID.unique(),
                file
            );

            return uploadedFile;
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            throw error;
        }
    },

    uploadVideo: async (file: { uri: string; name: string; type: string; size: number }) => {
        try {
            // Upload the video first
            const videoFile = await storage.createFile(
                STORAGE_ID,
                ID.unique(),
                file
            );

            // Generate and upload thumbnail
            const videoUrl = StorageService.getVideoUrl(videoFile.$id);
            const thumbnailUri = await StorageService.generateThumbnail(videoUrl);
            const thumbnailFile = await StorageService.uploadThumbnail(thumbnailUri);

            return {
                videoFile,
                thumbnailFile,
                videoUrl,
                thumbnailUrl: StorageService.getVideoUrl(thumbnailFile.$id)
            };
        } catch (error) {
            console.error('StorageService :: uploadVideo :: error', error);
            throw error;
        }
    },

    getVideoUrl: (fileId: string) => {
        return `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}&mode=admin`;
    },

    deleteVideo: async (fileId: string) => {
        try {
            await storage.deleteFile(STORAGE_ID, fileId);
        } catch (error) {
            console.error('StorageService :: deleteVideo :: error', error);
            throw error;
        }
    },

    generateThumbnailForExistingVideo: async (videoId: string) => {
        try {
            const videoUrl = StorageService.getVideoUrl(videoId);
            const thumbnailUri = await StorageService.generateThumbnail(videoUrl);
            const thumbnailFile = await StorageService.uploadThumbnail(thumbnailUri);
            
            // Return the thumbnail URL
            return StorageService.getVideoUrl(thumbnailFile.$id);
        } catch (error) {
            console.error('Error generating thumbnail for existing video:', error);
            throw error;
        }
    }
};

export { client, account, databases, storage }; 