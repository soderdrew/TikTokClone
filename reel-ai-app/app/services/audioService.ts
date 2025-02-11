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

  async startRecording() {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Permission to access microphone was denied');
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;

      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      throw err;
    }
  }

  async stopRecording(): Promise<string> {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      if (!uri) {
        throw new Error('No recording URI available');
      }

      return uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      throw err;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      // Read the audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call our cloud function
      const execution = await functions.createExecution(
        'transcribeAudio',
        JSON.stringify({ audioBase64: base64Audio })
      );

      const response = JSON.parse(execution.responseBody || '{}');

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