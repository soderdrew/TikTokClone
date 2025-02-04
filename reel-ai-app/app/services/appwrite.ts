import { Client, Account, ID, Models, Databases } from 'react-native-appwrite';
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
const DATABASE_ID = 'reelai-main';
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
    getVideos: async (limit: number = 10) => {
        try {
            return await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                [
                    // Add queries for pagination and sorting
                ]
            );
        } catch (error) {
            console.error('DatabaseService :: getVideos :: error', error);
            throw error;
        }
    },

    // Like Methods
    likeVideo: async (userId: string, videoId: string) => {
        try {
            return await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                ID.unique(),
                {
                    userId,
                    videoId,
                    createdAt: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('DatabaseService :: likeVideo :: error', error);
            throw error;
        }
    },

    // Comment Methods
    addComment: async (userId: string, videoId: string, content: string) => {
        try {
            return await databases.createDocument(
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
        } catch (error) {
            console.error('DatabaseService :: addComment :: error', error);
            throw error;
        }
    },

    // Saved Recipes Methods
    saveRecipe: async (userId: string, videoId: string) => {
        try {
            return await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                ID.unique(),
                {
                    userId,
                    videoId,
                    createdAt: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('DatabaseService :: saveRecipe :: error', error);
            throw error;
        }
    }
};

export { client, account, databases }; 