import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Client, Functions } from 'react-native-appwrite';
import Constants from 'expo-constants';

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(Constants.expoConfig?.extra?.APPWRITE_ENDPOINT as string)
    .setProject(Constants.expoConfig?.extra?.APPWRITE_PROJECT_ID as string);

const functions = new Functions(client);

export class AudioService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private recordingUri: string | null = null;

  constructor() {
    // Ensure we start with a clean state
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    }).catch(console.error);
  }

  private async cleanup() {
    try {
      if (this.recording) {
        console.log('Cleaning up existing recording..');
        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording) {
            await this.recording.stopAndUnloadAsync();
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
        this.recording = null;
      }
      this.isRecording = false;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async startRecording() {
    try {
      // Force cleanup first
      await this.cleanup();

      console.log('Requesting permissions..');
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access microphone was denied');
      }

      // Ensure audio mode is set correctly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Creating new recording..');
      this.recording = new Audio.Recording();
      
      console.log('Preparing to record..');
      await this.recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      console.log('Starting recording..');
      await this.recording.startAsync();
      this.isRecording = true;
      console.log('Recording started successfully');

      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      await this.cleanup();
      throw err;
    }
  }

  async stopRecording(): Promise<string> {
    try {
      console.log('Stopping recording..');
      if (!this.recording) {
        throw new Error('No active recording');
      }

      // Store the URI before cleanup
      const uri = this.recording.getURI();
      if (!uri) {
        throw new Error('No recording URI available');
      }
      this.recordingUri = uri;

      await this.recording.stopAndUnloadAsync();
      console.log('Recording stopped and stored at', uri);

      await this.cleanup();
      return uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      await this.cleanup();
      throw err;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      console.log('Reading audio file..');
      if (!await FileSystem.getInfoAsync(audioUri).then(info => info.exists)) {
        throw new Error('Audio file does not exist');
      }

      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Calling transcription function..');
      const execution = await functions.createExecution(
        'transcribeAudio',
        JSON.stringify({ audioBase64: base64Audio })
      );

      console.log('Received response from function');
      const response = JSON.parse(execution.responseBody || '{}');
      console.log('Transcription response:', response);

      if (!response.success) {
        throw new Error(response.message || 'Failed to transcribe audio');
      }

      return response.text;
    } catch (err) {
      console.error('Failed to transcribe audio:', err);
      throw err;
    }
  }
} 