import OpenAI from 'openai';

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

    // Create a temporary file with the audio data
    const tempFile = new File([audioBuffer], 'audio.m4a', { type: 'audio/m4a' });

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: tempFile,
      model: "whisper-1",
      language: "en",
      response_format: "json",
      prompt: "This is a list of ingredients and their quantities for a recipe."
    });

    log('Transcription completed successfully');

    return res.json({
      success: true,
      text: transcription.text
    });

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