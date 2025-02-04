import { Client, Account, ID, Models } from 'react-native-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@env';

// Initialize Appwrite Client
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setPlatform('com.soderdrew.reelai'); // Your bundle ID from app.json

// Initialize Appwrite Account
const account = new Account(client);

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

export { client, account }; 