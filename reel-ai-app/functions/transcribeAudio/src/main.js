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

      // First, get the raw transcription
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en",
        response_format: "json",
        prompt: "This is a list of kitchen ingredients with their quantities. Each item should be clearly separated and include the quantity and unit if mentioned."
      });

      // Then, parse the transcription into structured data
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that parses kitchen ingredient lists into structured data. Extract quantities, units, and item names from the text."
          },
          {
            role: "user",
            content: `Parse this ingredient list into structured items. For each item, provide the name, quantity (default to 1 if not specified), and unit (default to 'pcs' if not specified). Return as a JSON object with an 'items' array. Example format: {"items": [{"name": "milk", "quantity": 1, "unit": "gallon"}]}\n\nText to parse: ${transcription.text}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      });

      // Parse the structured data
      const parsedItems = JSON.parse(completion.choices[0].message.content);

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      log('Transcription and parsing completed successfully');
      return res.json({
        success: true,
        text: transcription.text,
        items: parsedItems.items
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