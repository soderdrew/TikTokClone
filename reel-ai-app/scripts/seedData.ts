import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!); // We'll need an API key for server-side operations

const databases = new Databases(client);
const DATABASE_ID = 'reel-ai-main';

// Collection IDs
const COLLECTIONS = {
    PROFILES: 'profiles',
    VIDEOS: 'videos',
    LIKES: 'likes',
    COMMENTS: 'comments',
    SAVED_RECIPES: 'saved_recipes'
};

// Sample data
const SAMPLE_USERS = [
    { id: 'user1', name: 'Chef John', bio: 'Professional chef with 10 years experience' },
    { id: 'user2', name: 'Home Cook Sarah', bio: 'Passionate about healthy cooking' },
    { id: 'user3', name: 'Baker Mike', bio: 'Specializing in artisan breads' }
];

const SAMPLE_VIDEOS = [
    {
        userId: 'user1',
        title: 'Perfect Pasta Carbonara',
        description: 'Classic Italian carbonara with a twist',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        duration: 180,
        cuisine: 'Italian',
        difficulty: 'medium',
        cookingTime: 30
    },
    {
        userId: 'user2',
        title: 'Quick Vegetarian Stir Fry',
        description: 'Healthy and quick weeknight dinner',
        videoUrl: 'https://example.com/video2.mp4',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        duration: 240,
        cuisine: 'Asian',
        difficulty: 'easy',
        cookingTime: 20
    },
    {
        userId: 'user3',
        title: 'Sourdough Bread Masterclass',
        description: 'Learn to make perfect sourdough',
        videoUrl: 'https://example.com/video3.mp4',
        thumbnailUrl: 'https://example.com/thumb3.jpg',
        duration: 600,
        cuisine: 'Baking',
        difficulty: 'hard',
        cookingTime: 240
    }
];

async function seedDatabase() {
    try {
        console.log('Starting database seeding...');

        // Create profiles
        console.log('Creating user profiles...');
        for (const user of SAMPLE_USERS) {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                user.id,
                {
                    userId: user.id,
                    name: user.name,
                    bio: user.bio,
                    recipesCount: 0,
                    followersCount: 0,
                    followingCount: 0
                }
            );
            console.log(`Created profile for ${user.name}`);
        }

        // Create videos
        console.log('Creating videos...');
        const videoIds = [];
        for (const video of SAMPLE_VIDEOS) {
            const videoDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.VIDEOS,
                ID.unique(),
                {
                    ...video,
                    likesCount: 0,
                    commentsCount: 0,
                    createdAt: new Date().toISOString()
                }
            );
            videoIds.push(videoDoc.$id);
            console.log(`Created video: ${video.title}`);
        }

        // Create some likes
        console.log('Creating likes...');
        for (let i = 0; i < videoIds.length; i++) {
            const videoId = videoIds[i];
            const userId = SAMPLE_USERS[(i + 1) % SAMPLE_USERS.length].id;
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.LIKES,
                ID.unique(),
                {
                    userId,
                    videoId,
                    createdAt: new Date().toISOString()
                }
            );
            console.log(`Created like for video ${i + 1}`);
        }

        // Create some comments
        console.log('Creating comments...');
        for (let i = 0; i < videoIds.length; i++) {
            const videoId = videoIds[i];
            const userId = SAMPLE_USERS[(i + 2) % SAMPLE_USERS.length].id;
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.COMMENTS,
                ID.unique(),
                {
                    userId,
                    videoId,
                    content: `Great recipe! Can't wait to try it out!`,
                    createdAt: new Date().toISOString()
                }
            );
            console.log(`Created comment for video ${i + 1}`);
        }

        // Create some saved recipes
        console.log('Creating saved recipes...');
        for (let i = 0; i < videoIds.length; i++) {
            const videoId = videoIds[i];
            const userId = SAMPLE_USERS[i % SAMPLE_USERS.length].id;
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.SAVED_RECIPES,
                ID.unique(),
                {
                    userId,
                    videoId,
                    createdAt: new Date().toISOString()
                }
            );
            console.log(`Created saved recipe for video ${i + 1}`);
        }

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

// Run the seeding
seedDatabase(); 