import { Client, Databases, Query } from 'node-appwrite';
import OpenAI from 'openai';

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  try {
    if (!req.body) {
      return res.json({
        success: false,
        message: 'Missing request body'
      }, 400);
    }

    const data = JSON.parse(req.body);
    log('Received request body:', data);

    if (!data.videoId) {
      return res.json({
        success: false,
        message: 'Missing required parameter: videoId'
      }, 400);
    }

    const { videoId } = data;
    log(`Processing summaries for video: ${videoId}`);

    // Initialize Appwrite
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Initialize OpenAI
    if (!process.env.OPENAI_API_KEY) {
      error('Missing OPENAI_API_KEY environment variable');
      return res.json({
        success: false,
        message: 'OpenAI API key not configured'
      }, 500);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Fetch all comments for the video
    log('Fetching comments...');
    const comments = await databases.listDocuments(
      'reel-ai-main',
      'comments',
      [
        Query.equal('videoId', videoId),
        Query.orderDesc('createdAt')
      ]
    );
    log(`Found ${comments.total} comments`);

    // Fetch all reviews for the video
    log('Fetching reviews...');
    const reviews = await databases.listDocuments(
      'reel-ai-main',
      'reviews',
      [
        Query.equal('videoId', videoId),
        Query.orderDesc('createdAt')
      ]
    );
    log(`Found ${reviews.total} reviews`);

    // Generate summary for comments
    let commentsSummary = '';
    if (comments.total > 0) {
      log('Generating comments summary...');
      const commentsText = comments.documents.map(doc => doc.content).join('\n');
      const commentsCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that analyzes recipe video comments and provides concise, insightful summaries of the key points, feedback, and trends in the comments."
          },
          {
            role: "user",
            content: `Please analyze these comments and provide a brief, insightful summary of the main points and sentiment:\n\n${commentsText}`
          }
        ],
        max_tokens: 150
      });
      commentsSummary = commentsCompletion.choices[0].message.content;
      log('Comments summary generated successfully');
    } else {
      commentsSummary = 'No comments to summarize';
      log('No comments found to summarize');
    }

    // Generate summary for reviews
    let reviewsSummary = '';
    if (reviews.total > 0) {
      log('Generating reviews summary...');
      const reviewsText = reviews.documents.map(doc => 
        `Rating: ${doc.rating}/5\nReview: ${doc.content}`
      ).join('\n\n');
      
      const reviewsCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that analyzes recipe reviews and provides concise summaries highlighting the overall sentiment, common praise, criticisms, and suggestions."
          },
          {
            role: "user",
            content: `Please analyze these reviews and provide a brief summary of the overall feedback, highlighting key patterns in ratings and comments:\n\n${reviewsText}`
          }
        ],
        max_tokens: 150
      });
      reviewsSummary = reviewsCompletion.choices[0].message.content;
      log('Reviews summary generated successfully');
    } else {
      reviewsSummary = 'No reviews to summarize';
      log('No reviews found to summarize');
    }

    // Store the summaries
    log('Storing summaries in database...');
    const document = await databases.createDocument(
      'reel-ai-main',
      'video_summaries',
      videoId,
      {
        videoId,
        commentsSummary: commentsSummary || 'No comments to summarize',
        reviewsSummary: reviewsSummary || 'No reviews to summarize',
        createdAt: new Date().toISOString()
      }
    );
    log('Summaries stored successfully');

    return res.json({
      success: true,
      commentsSummary,
      reviewsSummary
    });

  } catch (err) {
    error(`Error details: ${err.message}`);
    if (err.response) {
      error(`API Response: ${JSON.stringify(err.response.data)}`);
    }
    error(`Stack trace: ${err.stack}`);
    
    // Return more detailed error information
    return res.json({
      success: false,
      message: 'Failed to generate summaries',
      error: {
        message: err.message,
        type: err.constructor.name,
        response: err.response ? err.response.data : null,
        stack: err.stack
      }
    }, 500);
  }
};
