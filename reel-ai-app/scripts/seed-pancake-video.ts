import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = 'reel-ai-main';
const COLLECTIONS = {
    VIDEOS: 'videos'
};

async function seedPancakeVideo() {
    try {
        const videoData = {
            userId: 'user1', // Sarah's user ID
            title: 'Fluffy Blueberry Muffins',
            description: 'Bakery-style muffins loaded with fresh blueberries!',
            videoUrl: '',
            thumbnailUrl: '', // We'll update this later in the app
            duration: 240, // 4 minutes in seconds
            cuisine: 'dessert',
            difficulty: 'easy',
            cookingTime: 35, // 35 minutes (prep + baking)
            likesCount: 0,
            commentsCount: 0,
            bookmarksCount: 0,
            createdAt: new Date().toISOString(),
            dietaryFlags: [],
            allergens: ['dairy', 'eggs', 'wheat'],
            servingSize: 12,
            ingredients: [
                '2 cups all-purpose flour',
                '2 tsp baking powder',
                '1/2 tsp salt',
                '1/2 cup unsalted butter, softened',
                '1 cup granulated sugar',
                '2 large eggs',
                '1 tsp vanilla extract',
                '1/2 cup milk',
                '2 cups fresh blueberries',
                'For topping:',
                '2 tbsp coarse sugar'
            ],
            instructions: [
                'Preheat oven to 375°F (190°C)',
                'Line a 12-cup muffin tin with paper liners',
                'Whisk flour, baking powder, and salt in a bowl',
                'In another bowl, cream butter and sugar until light and fluffy',
                'Beat in eggs one at a time, then vanilla',
                'Gradually mix in flour mixture alternating with milk',
                'Gently fold in blueberries',
                'Divide batter among muffin cups',
                'Sprinkle tops with coarse sugar',
                'Bake for 20-25 minutes until golden brown',
                'Cool in pan for 5 minutes before removing'
            ],
            tips: [
                'Toss blueberries in flour to prevent sinking',
                'Don\'t overmix the batter for tender muffins',
                'Use room temperature ingredients',
                'Test doneness with a toothpick'
            ]
        };

        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.VIDEOS,
            ID.unique(),
            videoData
        );

        console.log('Successfully seeded pancake video:', response);
    } catch (error) {
        console.error('Error seeding pancake video:', error);
    }
}

// Run the seed
seedPancakeVideo(); 