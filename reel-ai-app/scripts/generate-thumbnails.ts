import { Client, Databases, Storage, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

dotenv.config();

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = 'reel-ai-main';
const STORAGE_ID = 'recipe-videos';
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
async function ensureTempDir() {
    try {
        await fs.access(TEMP_DIR);
    } catch {
        await fs.mkdir(TEMP_DIR);
    }
}

async function downloadVideo(url: string, outputPath: string) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.writeFile(outputPath, buffer);
}

async function generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: [0],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
                size: '640x360'
            })
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });
}

async function generateAndUploadThumbnail(videoId: string, videoUrl: string) {
    const videoPath = path.join(TEMP_DIR, `video-${videoId}.mp4`);
    const thumbnailPath = path.join(TEMP_DIR, `thumbnail-${videoId}.jpg`);

    try {
        // Download video
        console.log(`Downloading video ${videoId}...`);
        await downloadVideo(videoUrl, videoPath);

        // Generate thumbnail
        console.log(`Generating thumbnail for video ${videoId}...`);
        await generateThumbnail(videoPath, thumbnailPath);

        // Read the thumbnail file
        console.log('Reading thumbnail file...');
        const thumbnailData = await fs.readFile(thumbnailPath);

        // Create file object and upload to storage
        console.log('Uploading to storage...');
        const uploadedFile = await storage.createFile(
            STORAGE_ID,
            ID.unique(),
            new File([thumbnailData], `thumbnail-${videoId}.jpg`, { type: 'image/jpeg' })
        );

        // Generate thumbnail URL
        const thumbnailUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_ID}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
        
        // Update video document with thumbnail URL
        console.log('Updating video document...');
        await databases.updateDocument(
            DATABASE_ID,
            'videos',
            videoId,
            {
                thumbnailUrl
            }
        );

        console.log('Success! Thumbnail URL:', thumbnailUrl);
        return thumbnailUrl;
    } catch (error) {
        console.error(`Error processing video ${videoId}:`, error);
        return null;
    } finally {
        // Clean up temporary files
        try {
            await fs.unlink(videoPath);
            await fs.unlink(thumbnailPath);
        } catch (error) {
            console.error('Error cleaning up temporary files:', error);
        }
    }
}

async function generateMissingThumbnails() {
    try {
        // Ensure temp directory exists
        await ensureTempDir();

        // Get all videos without thumbnails or with empty thumbnails
        console.log('Fetching videos without thumbnails...');
        const videos = await databases.listDocuments(
            DATABASE_ID,
            'videos',
            [
                Query.or([
                    Query.equal('thumbnailUrl', ''),
                    Query.isNull('thumbnailUrl')
                ])
            ]
        );

        console.log(`Found ${videos.documents.length} videos without thumbnails.`);

        // Process each video
        for (const video of videos.documents) {
            try {
                console.log(`\nProcessing video: ${video.title} (${video.$id})`);
                await generateAndUploadThumbnail(video.$id, video.videoUrl);
                // Add a small delay between processing videos
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Failed to process video ${video.$id}:`, error);
                continue;
            }
        }

        console.log('\nThumbnail generation complete!');
    } catch (error) {
        console.error('Error generating thumbnails:', error);
    } finally {
        // Clean up temp directory
        try {
            await fs.rm(TEMP_DIR, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up temp directory:', error);
        }
    }
}

// Run the script
generateMissingThumbnails(); 