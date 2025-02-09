import { ID, Query, Models } from 'react-native-appwrite';
import { databases } from './appwrite';

const DATABASE_ID = 'reel-ai-main';
const REVIEWS_COLLECTION_ID = 'reviews';
const VIDEOS_COLLECTION_ID = 'videos';

export interface Review {
    $id?: string;
    userId: string;
    videoId: string;
    rating: number;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export const reviewService = {
    // Create a new review
    async createReview(userId: string, videoId: string, rating: number, content: string): Promise<Review> {
        const now = new Date().toISOString();
        const review = await databases.createDocument(
            DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            ID.unique(),
            {
                userId,
                videoId,
                rating,
                content,
                createdAt: now,
                updatedAt: now,
            }
        );

        // Update video's review stats
        await this.updateVideoReviewStats(videoId);

        return review as unknown as Review;
    },

    // Get all reviews for a video
    async getVideoReviews(videoId: string): Promise<Review[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            [
                Query.equal('videoId', videoId),
                Query.orderDesc('createdAt'),
            ]
        );
        return response.documents as unknown as Review[];
    },

    // Get a user's review for a specific video
    async getUserReview(userId: string, videoId: string): Promise<Review | null> {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                REVIEWS_COLLECTION_ID,
                [
                    Query.equal('userId', userId),
                    Query.equal('videoId', videoId),
                ]
            );
            return (response.documents[0] as unknown as Review) || null;
        } catch (error) {
            console.error('Error getting user review:', error);
            return null;
        }
    },

    // Update an existing review
    async updateReview(reviewId: string, rating: number, content: string): Promise<Review> {
        const review = await databases.updateDocument(
            DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            reviewId,
            {
                rating,
                content,
                updatedAt: new Date().toISOString(),
            }
        );

        // Update video's review stats
        await this.updateVideoReviewStats(review.videoId);

        return review as unknown as Review;
    },

    // Delete a review
    async deleteReview(reviewId: string, videoId: string): Promise<void> {
        await databases.deleteDocument(
            DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            reviewId
        );

        // Update video's review stats
        await this.updateVideoReviewStats(videoId);
    },

    // Helper function to update video's review stats (count and average rating)
    async updateVideoReviewStats(videoId: string): Promise<void> {
        const reviews = await this.getVideoReviews(videoId);
        const reviewsCount = reviews.length;
        const averageRating = reviewsCount > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount
            : 0;

        await databases.updateDocument(
            DATABASE_ID,
            VIDEOS_COLLECTION_ID,
            videoId,
            {
                reviewsCount,
                averageRating,
            }
        );
    },
}; 