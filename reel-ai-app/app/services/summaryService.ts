import { Client, Functions, Models, Query } from 'react-native-appwrite';
import { databases } from './appwrite';
import Constants from 'expo-constants';

const client = new Client()
    .setEndpoint(Constants.expoConfig?.extra?.APPWRITE_ENDPOINT as string)
    .setProject(Constants.expoConfig?.extra?.APPWRITE_PROJECT_ID as string);

const functions = new Functions(client);

export interface VideoSummary {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  videoId: string;
  commentsSummary: string;
  reviewsSummary: string;
  createdAt: string;
}

export const summaryService = {
  // Get existing summary for a video
  getSummary: async (videoId: string): Promise<VideoSummary | null> => {
    try {
      const response = await databases.listDocuments<VideoSummary>(
        'reel-ai-main',
        'video_summaries',
        [Query.equal('videoId', videoId)]
      );
      
      return response.documents[0] || null;
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
  },

  // Generate new summaries using the cloud function
  generateSummaries: async (videoId: string): Promise<VideoSummary | null> => {
    try {
      console.log('Generating summaries for video:', videoId);
      const payload = JSON.stringify({ videoId });
      console.log('Sending payload:', payload);
      
      const execution = await functions.createExecution(
        'generateSummariesId',
        payload
      );

      console.log('Function execution response:', execution);

      if (execution.status === 'completed' && execution.responseBody) {
        const response = JSON.parse(execution.responseBody);
        console.log('Parsed response:', response);
        
        if (response.success) {
          return await summaryService.getSummary(videoId);
        } else {
          console.error('Function returned error:', response.error);
        }
      }
      
      throw new Error('Failed to generate summaries');
    } catch (error) {
      console.error('Error generating summaries:', error);
      return null;
    }
  }
}; 