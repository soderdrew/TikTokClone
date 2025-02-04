import { Client, Account, ID, Models, Databases, Query } from 'react-native-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@env';

// Initialize Appwrite Client
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setPlatform('com.soderdrew.reelai'); // Your bundle ID from app.json

// Initialize Appwrite Account and Database
const account = new Account(client);
const databases = new Databases(client);

// Database IDs - we'll create these in Appwrite Console
const DATABASE_ID = 'reel-ai-main';
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
    getProfile: async (userId: string) => {
        try {
            return await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                userId
            );
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
    getVideoComments: async (videoId: string, limit: number = 10) => {
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
            console.error('DatabaseService :: getVideoComments :: error', error);
            throw error;
        }
    },

    addComment: async (userId: string, videoId: string, content: string) => {
        try {
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                ID.unique(),
                {
                    userId,
                    videoId,
                    content,
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
            return await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                [
                    Query.equal('userId', userId),
                    Query.orderDesc('createdAt'),
                    Query.limit(limit)
                ]
            );
        } catch (error) {
            console.error('DatabaseService :: getSavedRecipes :: error', error);
            throw error;
        }
    }
};

export { client, account, databases }; 