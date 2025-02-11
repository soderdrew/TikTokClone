import OpenAI from 'openai';
import fs from 'fs';
import { Readable } from 'stream';
import { Buffer } from 'buffer';

export default async ({ req, res, log, error }) => {
  try {
    if (!req.body) {
      return res.json({
        success: false,
        message: 'Missing request body'
      }, 400);
    }

    const data = JSON.parse(req.body);
    log('Received request body');

    if (!data.audioBase64) {
      return res.json({
        success: false,
        message: 'Missing required parameter: audioBase64'
      }, 400);
    }

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

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(data.audioBase64, 'base64');

    // Create a temporary file path
    const tempFilePath = '/tmp/audio.m4a';

    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
      // Create a file object from the temporary file
      const file = fs.createReadStream(tempFilePath);

      // Transcribe using Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en",
        response_format: "json",
        prompt: "This is a list of ingredients and their quantities for a recipe."
      });

      // Parse the transcription into structured items using GPT
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that parses ingredient lists into structured data. 
            Extract ingredients with their quantities and units from the text.
            If a quantity is not specified, assume 1.
            If a unit is not specified, use a sensible default unit based on the ingredient type.
            Respond with a JSON array of objects, each with name, quantity, and unit properties.`
          },
          {
            role: "user",
            content: transcription.text
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      // Parse the GPT response
      const parsedItems = JSON.parse(completion.choices[0].message.content);

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      log('Transcription and parsing completed successfully');
      return res.json({
        success: true,
        text: transcription.text,
        items: parsedItems.items || []
      });
    } finally {
      // Ensure we clean up the temp file even if transcription fails
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        error('Failed to clean up temporary file:', cleanupError);
      }
    }

  } catch (err) {
    error(`Error details: ${err.message}`);
    if (err.response) {
      error(`API Response: ${JSON.stringify(err.response.data)}`);
    }
    error(`Stack trace: ${err.stack}`);
    
    return res.json({
      success: false,
      message: 'Failed to transcribe audio',
      error: {
        message: err.message,
        type: err.constructor.name,
        response: err.response ? err.response.data : null,
        stack: err.stack
      }
    }, 500);
  }
}; 