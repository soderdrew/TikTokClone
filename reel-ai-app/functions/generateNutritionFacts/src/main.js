import { Client, Databases } from 'node-appwrite';
import OpenAI from 'openai';

export default async ({ req, res, log, error }) => {
    try {
        log('Starting nutrition facts generation');

        if (!req.body) {
            error('Missing request body');
            return res.json({ success: false, message: 'Missing request body' }, 400);
        }

        const data = JSON.parse(req.body);
        if (!data.videoId) {
            error('Missing videoId in request');
            return res.json({ success: false, message: 'Missing videoId' }, 400);
        }

        const videoId = data.videoId;
        log('Processing videoId:', videoId);

        // Validate environment variables
        if (!process.env.APPWRITE_FUNCTION_API_ENDPOINT || 
            !process.env.APPWRITE_FUNCTION_PROJECT_ID || 
            !process.env.APPWRITE_API_KEY ||
            !process.env.OPENAI_API_KEY) {
            error('Missing required environment variables');
            return res.json({ success: false, message: 'Required environment variables are missing' }, 500);
        }

        // Appwrite setup
        const client = new Client()
            .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
            .setKey(process.env.APPWRITE_API_KEY);

        const databases = new Databases(client);
        const databaseId = 'reel-ai-main';
        const videosCollectionId = 'videos';

        // OpenAI setup
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Retrieve recipe data from Appwrite
        let video;
        try {
            log('Fetching video document from Appwrite');
            video = await databases.getDocument(databaseId, videosCollectionId, videoId);
            log('Successfully fetched video document');
        } catch (e) {
            error(`Error fetching video from Appwrite: ${e.message}`);
            return res.json({ 
                success: false, 
                message: 'Failed to retrieve recipe data',
                error: e.message
            }, 500);
        }

        if (!video || !video.ingredients || !video.instructions) {
            error('Recipe data is incomplete:', { video });
            return res.json({ success: false, message: 'Recipe data is incomplete' }, 400);
        }

        const ingredients = Array.isArray(video.ingredients) ? video.ingredients.join('\n') : video.ingredients;
        const instructions = Array.isArray(video.instructions) ? video.instructions.join('\n') : video.instructions;

        log('Processing recipe with ingredients and instructions');

        // OpenAI Prompt
        const prompt = `Provide the nutrition facts for the following recipe, assuming standard serving size: \nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}\n\nFormat the output as a JSON object with the following keys (include the units for each nutritional value): calories, totalFat, saturatedFat, cholesterol, sodium, carbohydrates, fiber, sugar, protein, and servingSize. If you do not know the units, leave the value as "".`;

        // Call GPT for nutrition facts
        let completion;
        try {
            log('Calling OpenAI API');
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });
            log('Successfully received OpenAI response');
        } catch (e) {
            error(`OpenAI error: ${e.message}`);
            return res.json({ 
                success: false, 
                message: 'Failed to generate nutrition facts via OpenAI',
                error: e.message
            }, 500);
        }

        // Extract and validate GPT response
        let nutritionFacts;
        try {
            log('Parsing OpenAI response');
            nutritionFacts = JSON.parse(completion.choices[0].message.content);
            log('Successfully parsed nutrition facts');

            // Basic validation
            if (!nutritionFacts.calories || !nutritionFacts.totalFat) {
                error("Incomplete nutrition data from OpenAI:", nutritionFacts);
                return res.json({ 
                    success: false, 
                    message: "Incomplete nutrition data received.",
                    partialData: nutritionFacts
                }, 500);
            }
        } catch (e) {
            error(`Error parsing OpenAI response: ${e.message}`);
            return res.json({ 
                success: false, 
                message: 'Failed to parse nutrition facts from OpenAI response', 
                rawResponse: completion.choices[0].message.content,
                error: e.message
            }, 500);
        }

        try {
            log('Saving nutrition facts to video document');
            await databases.updateDocument(
                databaseId,
                videosCollectionId,
                videoId,
                { nutritionFacts: JSON.stringify(nutritionFacts) }
            );
            log('Successfully saved nutrition facts');
        } catch (e) {
            error(`Error saving nutrition facts to Appwrite: ${e.message}`);
            return res.json({ 
                success: false, 
                message: "Failed to save nutrition facts", 
                nutritionFacts,
                error: e.message
            }, 500);
        }

        log('Function completed successfully');
        res.json({
            success: true,
            nutritionFacts,
            message: 'Nutrition facts generated successfully',
        });

    } catch (e) {
        error(`General error: ${e.message}, Stack: ${e.stack}`);
        return res.json({ 
            success: false, 
            message: 'Failed to generate nutrition facts - general error', 
            error: e.message,
            stack: e.stack
        }, 500);
    }
};
