import { Client, Databases, Query, Models } from 'node-appwrite';
import OpenAI from 'openai';

// Define interfaces for our documents
interface Comment extends Models.Document {
    content: string;
    userId: string;
    videoId: string;
    createdAt: string;
}

interface Review extends Models.Document {
    content: string;
    rating: number;
    userId: string;
    videoId: string;
    createdAt: string;
}

// Init Appwrite
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

// Init OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateContentSummaries(req: any, res: any) {
    try {
        const { videoId } = JSON.parse(req.payload);
        
        // Fetch all comments and reviews
        const comments = await databases.listDocuments<Comment>(
            'reel-ai-main',
            'comments',
            [Query.equal('videoId', videoId)]
        );
        
        const reviews = await databases.listDocuments<Review>(
            'reel-ai-main',
            'reviews',
            [Query.equal('videoId', videoId)]
        );

        // Generate comments summary if there are comments
        let commentsSummary = null;
        if (comments.documents.length > 0) {
            const commentsCompletion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that summarizes recipe video comments. Focus on the most insightful feedback, common questions, and helpful tips shared by viewers. Keep the summary concise and actionable."
                    },
                    {
                        role: "user",
                        content: `Please summarize these recipe video comments:\n\n${comments.documents.map(c => c.content).join('\n')}`
                    }
                ],
                max_tokens: 150
            });
            commentsSummary = commentsCompletion.choices[0].message.content;
        }

        // Generate reviews summary if there are reviews
        let reviewsSummary = null;
        if (reviews.documents.length > 0) {
            const reviewsCompletion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that summarizes recipe reviews. Focus on the overall sentiment, common experiences, recipe modifications, and key takeaways from people who tried the recipe. Keep the summary concise and helpful for potential cooks."
                    },
                    {
                        role: "user",
                        content: `Please summarize these recipe reviews:\n\n${reviews.documents.map(r => `Rating: ${r.rating}/5\nReview: ${r.content}`).join('\n\n')}`
                    }
                ],
                max_tokens: 150
            });
            reviewsSummary = reviewsCompletion.choices[0].message.content;
        }

        // Update video document with new summaries
        await databases.updateDocument(
            'reel-ai-main',
            'videos',
            videoId,
            {
                commentsSummary,
                reviewsSummary,
                summariesUpdatedAt: new Date().toISOString()
            }
        );

        return res.json({
            success: true,
            summaries: {
                comments: commentsSummary,
                reviews: reviewsSummary
            }
        });
    } catch (error: any) {
        console.error('Error generating summaries:', error);
        return res.json({
            success: false,
            error: error.message
        }, 500);
    }
}

module.exports = generateContentSummaries; 