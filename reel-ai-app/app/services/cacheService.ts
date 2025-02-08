import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}media-cache/`;
const VIDEO_CACHE_SIZE = 500 * 1024 * 1024; // 500MB for videos
const IMAGE_CACHE_SIZE = 100 * 1024 * 1024; // 100MB for images

interface CacheInfo {
  size: number;
  lastAccessed: number;
}

class CacheService {
  private cacheInfo: Map<string, CacheInfo> = new Map();
  private initialized = false;

  constructor() {
    this.initializeCache();
  }

  private async initializeCache() {
    if (this.initialized) return;
    
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
      }

      // Load existing cache info
      const files = await FileSystem.readDirectoryAsync(CACHE_FOLDER);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${CACHE_FOLDER}${file}`, { size: true });
        if (fileInfo.exists && fileInfo.size) {
          this.cacheInfo.set(file, {
            size: fileInfo.size,
            lastAccessed: Date.now()
          });
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  private async generateCacheKey(url: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url
    );
    return hash;
  }

  private async ensureCacheSpace(requiredSpace: number, isVideo: boolean) {
    const maxSize = isVideo ? VIDEO_CACHE_SIZE : IMAGE_CACHE_SIZE;
    let currentSize = 0;
    
    // Calculate current cache size
    for (const [_, info] of this.cacheInfo) {
      currentSize += info.size;
    }

    if (currentSize + requiredSpace > maxSize) {
      // Sort files by last accessed time
      const files = Array.from(this.cacheInfo.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      // Remove oldest files until we have enough space
      for (const [filename, info] of files) {
        try {
          await FileSystem.deleteAsync(`${CACHE_FOLDER}${filename}`);
          this.cacheInfo.delete(filename);
          currentSize -= info.size;

          if (currentSize + requiredSpace <= maxSize) {
            break;
          }
        } catch (error) {
          console.error(`Failed to delete cached file ${filename}:`, error);
        }
      }
    }
  }

  private formatFileUrl(path: string): string {
    console.log('Formatting file URL:', path);
    
    try {
      // Remove file:// if it exists
      path = path.replace(/^file:\/\//, '');
      
      // For iOS, handle spaces
      if (Platform.OS === 'ios') {
        path = path.replace(/%20/g, ' ');
      }
      
      // Add file:// prefix
      if (!path.startsWith('file://')) {
        path = `file://${path}`;
      }
      
      // Ensure the path is properly encoded
      const url = new URL(path);
      console.log('Formatted file URL:', url.href);
      return url.href;
    } catch (error) {
      console.error('Error formatting file URL:', error);
      // If URL formatting fails, return the original path with file:// prefix
      return path.startsWith('file://') ? path : `file://${path}`;
    }
  }

  async cacheFile(url: string, isVideo: boolean = false): Promise<string> {
    await this.initializeCache();
    console.log('Caching file:', { url, isVideo });
    
    try {
      // If it's already a local file URL, verify it exists
      if (url.startsWith('file://')) {
        const localPath = url.replace(/^file:\/\//, '');
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          console.log('Local file exists, returning as is');
          return url;
        }
        console.log('Local file does not exist, will download');
      }

      const cacheKey = await this.generateCacheKey(url);
      const cachePath = `${CACHE_FOLDER}${cacheKey}`;
      console.log('Cache path:', cachePath);
      
      // Check if file is already cached
      const fileInfo = await FileSystem.getInfoAsync(cachePath, { size: true });
      console.log('File info:', fileInfo);

      if (fileInfo.exists) {
        console.log('File already exists in cache');
        // Update last accessed time
        this.cacheInfo.set(cacheKey, {
          size: (fileInfo as any).size || 0,
          lastAccessed: Date.now()
        });
        return this.formatFileUrl(cachePath);
      }

      console.log('File not in cache, downloading...');
      
      // For videos, we'll skip the HEAD request as it might not be supported
      let contentLength = 0;
      if (!isVideo) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          contentLength = parseInt(response.headers.get('content-length') || '0');
          console.log('Content length:', contentLength);
        } catch (error) {
          console.warn('Failed to get content length:', error);
        }
      }
      
      // Ensure we have enough cache space
      await this.ensureCacheSpace(contentLength, isVideo);

      // Download and cache the file
      console.log('Starting download...');
      const downloadResult = await FileSystem.downloadAsync(url, cachePath);
      console.log('Download result:', downloadResult);
      
      if (downloadResult.status === 200) {
        // Verify the downloaded file
        const downloadedFileInfo = await FileSystem.getInfoAsync(cachePath, { size: true });
        console.log('Downloaded file info:', downloadedFileInfo);

        if (downloadedFileInfo.exists) {
          const fileSize = (downloadedFileInfo as any).size || 0;
          this.cacheInfo.set(cacheKey, {
            size: fileSize,
            lastAccessed: Date.now()
          });
          
          // Verify the file is readable
          try {
            const formattedUrl = this.formatFileUrl(cachePath);
            console.log('Successfully cached file, returning:', formattedUrl);
            return formattedUrl;
          } catch (error) {
            console.error('Error formatting cached file URL:', error);
            throw error;
          }
        }
      }
      
      console.log('Download failed or file does not exist, returning original URL');
      return url;
    } catch (error) {
      console.error('Failed to cache file:', error);
      // If caching fails, return original URL
      return url;
    }
  }

  async getCachedUrl(url: string, isVideo: boolean = false): Promise<string> {
    await this.initializeCache();
    
    try {
      const cacheKey = await this.generateCacheKey(url);
      const cachePath = `${CACHE_FOLDER}${cacheKey}`;
      
      // Check if file exists in cache
      const fileInfo = await FileSystem.getInfoAsync(cachePath);
      if (fileInfo.exists) {
        // Update last accessed time
        const info = this.cacheInfo.get(cacheKey);
        if (info) {
          this.cacheInfo.set(cacheKey, {
            ...info,
            lastAccessed: Date.now()
          });
        }
        return cachePath;
      }

      // If not in cache, cache it
      return this.cacheFile(url, isVideo);
    } catch (error) {
      console.error('Failed to get cached URL:', error);
      return url;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
      this.cacheInfo.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const cacheService = new CacheService(); 