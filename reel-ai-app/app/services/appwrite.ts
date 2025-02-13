import { Client, Account, ID, Models, Databases, Query, Storage, Functions } from 'react-native-appwrite';
import Constants from 'expo-constants';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';

const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.APPWRITE_ENDPOINT as string;
const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.APPWRITE_PROJECT_ID as string;

// Add retry utility function at the top level
const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            if (i === maxRetries - 1) throw error; // Last attempt, throw the error
            
            // Check if it's a network error or 502 Bad Gateway
            const isNetworkError = error.message?.includes('502') || 
                                 error.message?.includes('Bad gateway') ||
                                 error.message?.includes('Network request failed');
            
            if (!isNetworkError) throw error; // If not a network error, throw immediately
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
};

// Initialize Appwrite Client with platform-specific settings
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Initialize Appwrite Account and Database
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);

// Database IDs - we'll create these in Appwrite Console
const DATABASE_ID = 'reel-ai-main';
const STORAGE_ID = 'recipe-videos';
const COLLECTIONS = {
    PROFILES: 'profiles',
    VIDEOS: 'videos',
    LIKES: 'likes',
    COMMENTS: 'comments',
    SAVED_RECIPES: 'saved_recipes',
    SEARCH_HISTORY: 'search_history',
    FOLLOWS: 'follows'  // Add follows collection
};

// Add this interface after the COLLECTIONS constant
interface RecipeFilters {
  cuisine?: string[];
  difficulty?: string[];
  cookingTime?: string[];
  dietaryFlags?: string[];
}

type TimeRange = 'Under 15 mins' | '15-30 mins' | '30-60 mins' | 'Over 60 mins';

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

    updateProfile: async (userId: string, updates: {
        name?: string;
        bio?: string;
        avatarUrl?: string;
    }) => {
        try {
            return await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                userId,
                updates
            );
        } catch (error) {
            console.error('DatabaseService :: updateProfile :: error', error);
            throw error;
        }
    },

    uploadProfilePicture: async (imageUri: string) => {
        try {
            // Convert uri to file object
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const file = {
                uri: imageUri,
                name: `profile-${Date.now()}.jpg`,
                type: 'image/jpeg',
                size: blob.size,
            };

            // Upload to storage
            const uploadedFile = await storage.createFile(
                STORAGE_ID,
                ID.unique(),
                file
            );

            // Return the file URL
            return `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_ID}/files/${uploadedFile.$id}/view?project=${APPWRITE_PROJECT_ID}`;
        } catch (error) {
            console.error('DatabaseService :: uploadProfilePicture :: error', error);
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

    createVideo: async (userId: string, videoData: {
        title: string;
        description: string;
        videoUrl: string;
        thumbnailUrl: string;
        duration: number;
        cuisine: string;
        difficulty: string;
        cookingTime: number;
        ingredients?: string[];
        instructions?: string[];
        tips?: string[];
    }) => {
        try {
            // Create the video document
            const video = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                ID.unique(),
                {
                    ...videoData,
                    userId,
                    likesCount: 0,
                    commentsCount: 0,
                    bookmarksCount: 0,
                    createdAt: new Date().toISOString()
                }
            );

            // Increment the user's recipesCount
            const profile = await DatabaseService.getProfile(userId);
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                userId,
                {
                    recipesCount: (profile.recipesCount || 0) + 1
                }
            );

            return video;
        } catch (error) {
            console.error('DatabaseService :: createVideo :: error', error);
            throw error;
        }
    },

    updateRecipeDetails: async (videoId: string, recipeData: {
        ingredients?: string[];
        instructions?: string[];
        tips?: string[];
    }) => {
        try {
            return await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId,
                recipeData
            );
        } catch (error) {
            console.error('DatabaseService :: updateRecipeDetails :: error', error);
            throw error;
        }
    },

    deleteVideo: async (videoId: string, userId: string) => {
        try {
            // Delete the video document
            await databases.deleteDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                videoId
            );

            // Decrement the user's recipesCount
            const profile = await DatabaseService.getProfile(userId);
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                userId,
                {
                    recipesCount: Math.max(0, (profile.recipesCount || 0) - 1)
                }
            );
        } catch (error) {
            console.error('DatabaseService :: deleteVideo :: error', error);
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
    },

    // Recipe Methods
    getAllRecipes: async (limit: number = 10, lastId?: string | null, filters?: RecipeFilters, additionalQueries: any[] = []) => {
        try {
            const queries: any[] = [
                ...additionalQueries,
                Query.orderDesc('createdAt'),
                Query.limit(limit)
            ];
            
            if (lastId) {
                queries.push(Query.cursorAfter(lastId));
            }

            // Add filter queries
            if (filters) {
                if (filters.cuisine && filters.cuisine.length === 1) {
                    queries.push(Query.equal('cuisine', filters.cuisine[0]));
                } else if (filters.cuisine && filters.cuisine.length > 1) {
                    queries.push(Query.equal('cuisine', filters.cuisine));
                }
                
                if (filters.difficulty && filters.difficulty.length === 1) {
                    queries.push(Query.equal('difficulty', filters.difficulty[0]));
                } else if (filters.difficulty && filters.difficulty.length > 1) {
                    queries.push(Query.equal('difficulty', filters.difficulty));
                }

                if (filters.cookingTime && filters.cookingTime.length > 0) {
                    // Convert time ranges to actual numbers for comparison
                    const timeRanges = filters.cookingTime.map((value: string) => {
                        const range = value as TimeRange;
                        if (range === 'Under 15 mins') return Query.lessThan('cookingTime', 15);
                        if (range === '15-30 mins') return Query.and([
                            Query.greaterThanEqual('cookingTime', 15),
                            Query.lessThanEqual('cookingTime', 30)
                        ]);
                        if (range === '30-60 mins') return Query.and([
                            Query.greaterThanEqual('cookingTime', 30),
                            Query.lessThanEqual('cookingTime', 60)
                        ]);
                        if (range === 'Over 60 mins') return Query.greaterThan('cookingTime', 60);
                        return null;
                    }).filter((q): q is NonNullable<typeof q> => q !== null);

                    if (timeRanges.length === 1) {
                        queries.push(timeRanges[0]);
                    } else if (timeRanges.length > 1) {
                        queries.push(Query.or(timeRanges));
                    }
                }

                if (filters.dietaryFlags && filters.dietaryFlags.length > 0) {
                    // Only show recipes that have ALL selected dietary flags
                    filters.dietaryFlags.forEach(flag => {
                        queries.push(Query.equal('dietaryFlags', flag));
                    });
                }
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                queries
            );

            return response;
        } catch (error) {
            console.error('DatabaseService :: getAllRecipes :: error', error);
            throw error;
        }
    },

    getRecipesByCuisine: async (cuisine: string, limit: number = 10, lastId?: string | null, filters?: RecipeFilters, additionalQueries: any[] = []) => {
        try {
            const queries: any[] = [
                ...additionalQueries,
                Query.equal('cuisine', cuisine),
                Query.orderDesc('createdAt'),
                Query.limit(limit)
            ];
            
            if (lastId) {
                queries.push(Query.cursorAfter(lastId));
            }

            // Add filter queries
            if (filters) {
                if (filters.difficulty && filters.difficulty.length === 1) {
                    queries.push(Query.equal('difficulty', filters.difficulty[0]));
                } else if (filters.difficulty && filters.difficulty.length > 1) {
                    queries.push(Query.equal('difficulty', filters.difficulty));
                }

                if (filters.cookingTime && filters.cookingTime.length > 0) {
                    // Convert time ranges to actual numbers for comparison
                    const timeRanges = filters.cookingTime.map((value: string) => {
                        const range = value as TimeRange;
                        if (range === 'Under 15 mins') return Query.lessThan('cookingTime', 15);
                        if (range === '15-30 mins') return Query.and([
                            Query.greaterThanEqual('cookingTime', 15),
                            Query.lessThanEqual('cookingTime', 30)
                        ]);
                        if (range === '30-60 mins') return Query.and([
                            Query.greaterThanEqual('cookingTime', 30),
                            Query.lessThanEqual('cookingTime', 60)
                        ]);
                        if (range === 'Over 60 mins') return Query.greaterThan('cookingTime', 60);
                        return null;
                    }).filter((q): q is NonNullable<typeof q> => q !== null);

                    if (timeRanges.length === 1) {
                        queries.push(timeRanges[0]);
                    } else if (timeRanges.length > 1) {
                        queries.push(Query.or(timeRanges));
                    }
                }

                if (filters.dietaryFlags && filters.dietaryFlags.length > 0) {
                    // Only show recipes that have ALL selected dietary flags
                    filters.dietaryFlags.forEach(flag => {
                        queries.push(Query.equal('dietaryFlags', flag));
                    });
                }
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                queries
            );

            return response;
        } catch (error) {
            console.error('DatabaseService :: getRecipesByCuisine :: error', error);
            throw error;
        }
    },

    // Search History Methods
    addSearchQuery: async (userId: string, query: string) => {
        return retryOperation(async () => {
            try {
                if (!query.trim()) return;

                const existing = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.SEARCH_HISTORY,
                    [
                        Query.equal('userId', userId),
                        Query.equal('query', query),
                        Query.limit(1)
                    ]
                );

                if (existing.documents.length > 0) {
                    return await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.SEARCH_HISTORY,
                        existing.documents[0].$id,
                        {
                            updatedAt: new Date().toISOString()
                        }
                    );
                }

                return await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.SEARCH_HISTORY,
                    ID.unique(),
                    {
                        userId,
                        query,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                );
            } catch (error) {
                console.error('Error adding search query:', error);
                throw error;
            }
        });
    },

    getSearchHistory: async (userId: string, limit: number = 10, lastId: string | null = null) => {
        return retryOperation(async () => {
            try {
                const queries = [
                    Query.equal('userId', userId),
                    Query.orderDesc('updatedAt'),
                    Query.limit(limit)
                ];

                if (lastId) {
                    queries.push(Query.cursorAfter(lastId));
                }

                return await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.SEARCH_HISTORY,
                    queries
                );
            } catch (error) {
                console.error('Error getting search history:', error);
                throw error;
            }
        });
    },

    clearSearchHistory: async (userId: string) => {
        try {
            const history = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SEARCH_HISTORY,
                [Query.equal('userId', userId)]
            );

            // Delete each search history entry
            await Promise.all(
                history.documents.map(doc =>
                    databases.deleteDocument(
                        DATABASE_ID,
                        COLLECTIONS.SEARCH_HISTORY,
                        doc.$id
                    )
                )
            );
        } catch (error) {
            console.error('Error clearing search history:', error);
            throw error;
        }
    },

    deleteSearchQuery: async (queryId: string) => {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                COLLECTIONS.SEARCH_HISTORY,
                queryId
            );
        } catch (error) {
            console.error('Error deleting search query:', error);
            throw error;
        }
    },

    getUserVideos: async (userId: string) => {
        return retryOperation(async () => {
            try {
                return await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.VIDEOS,
                    [
                        Query.equal('userId', userId),
                        Query.orderDesc('createdAt')
                    ]
                );
            } catch (error) {
                console.error('Error getting user videos:', error);
                throw error;
            }
        });
    },

    // Follow Methods
    followUser: async (followerId: string, followedId: string) => {
        try {
            // Check if already following
            const existingFollow = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.FOLLOWS,
                [
                    Query.equal('followerId', followerId),
                    Query.equal('followedId', followedId),
                    Query.limit(1)
                ]
            );

            if (existingFollow.documents.length > 0) {
                return existingFollow.documents[0];
            }

            // Create new follow relationship
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.FOLLOWS,
                ID.unique(),
                {
                    followerId,
                    followedId,
                    createdAt: new Date().toISOString()
                }
            );

            // Update follower counts
            const followedProfile = await DatabaseService.getProfile(followedId);
            const followerProfile = await DatabaseService.getProfile(followerId);

            await Promise.all([
                databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.PROFILES,
                    followedId,
                    {
                        followersCount: (followedProfile.followersCount || 0) + 1
                    }
                ),
                databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.PROFILES,
                    followerId,
                    {
                        followingCount: (followerProfile.followingCount || 0) + 1
                    }
                )
            ]);

            return response;
        } catch (error) {
            console.error('DatabaseService :: followUser :: error', error);
            throw error;
        }
    },

    unfollowUser: async (followerId: string, followedId: string) => {
        try {
            // Find the follow relationship
            const follows = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.FOLLOWS,
                [
                    Query.equal('followerId', followerId),
                    Query.equal('followedId', followedId),
                    Query.limit(1)
                ]
            );

            if (follows.documents.length > 0) {
                // Delete the follow relationship
                await databases.deleteDocument(
                    DATABASE_ID,
                    COLLECTIONS.FOLLOWS,
                    follows.documents[0].$id
                );

                // Update follower counts
                const followedProfile = await DatabaseService.getProfile(followedId);
                const followerProfile = await DatabaseService.getProfile(followerId);

                await Promise.all([
                    databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.PROFILES,
                        followedId,
                        {
                            followersCount: Math.max(0, (followedProfile.followersCount || 0) - 1)
                        }
                    ),
                    databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.PROFILES,
                        followerId,
                        {
                            followingCount: Math.max(0, (followerProfile.followingCount || 0) - 1)
                        }
                    )
                ]);
            }
        } catch (error) {
            console.error('DatabaseService :: unfollowUser :: error', error);
            throw error;
        }
    },

    isFollowing: async (followerId: string, followedId: string) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.FOLLOWS,
                [
                    Query.equal('followerId', followerId),
                    Query.equal('followedId', followedId),
                    Query.limit(1)
                ]
            );
            return response.documents.length > 0;
        } catch (error) {
            console.error('DatabaseService :: isFollowing :: error', error);
            return false;
        }
    },

    getFollowers: async (userId: string) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.FOLLOWS,
                [
                    Query.equal('followedId', userId),
                    Query.orderDesc('createdAt')
                ]
            );
            return response.documents;
        } catch (error) {
            console.error('DatabaseService :: getFollowers :: error', error);
            throw error;
        }
    },

    getFollowing: async (userId: string) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.FOLLOWS,
                [
                    Query.equal('followerId', userId),
                    Query.orderDesc('createdAt')
                ]
            );
            return response.documents;
        } catch (error) {
            console.error('DatabaseService :: getFollowing :: error', error);
            throw error;
        }
    },

    // Add new method to sync recipes count
    syncRecipesCount: async (userId: string) => {
        try {
            // Get all videos by user
            const videos = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                [Query.equal('userId', userId)]
            );

            // Update profile with accurate count
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                userId,
                {
                    recipesCount: videos.total
                }
            );

            return videos.total;
        } catch (error) {
            console.error('DatabaseService :: syncRecipesCount :: error', error);
            throw error;
        }
    },

    // Get a single video by ID
    async getVideo(videoId: string): Promise<Models.Document> {
        return await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.VIDEOS,
            videoId
        );
    },

    // Recipe Matching
    matchRecipes: async (ingredients: string[], recipeTitles: string[]) => {
        try {
            const response = await functions.createExecution(
                'matchRecipes', // function ID
                JSON.stringify({
                    ingredients,
                    recipes: recipeTitles
                })
            );
            
            // Cast the response to access its properties
            const result = response as unknown as { response: string };
            return JSON.parse(result.response || '{"recipes": []}');
        } catch (error) {
            console.error('DatabaseService :: matchRecipes :: error', error);
            throw error;
        }
    },
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