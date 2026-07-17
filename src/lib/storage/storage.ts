'use server';

import { r2Storage } from './r2';

/**
 * Supported body types for file uploads.
 * Uses standard types compatible with both Node.js and Edge environments where possible.
 */
export type StorageBody = string | Uint8Array | Buffer | ReadableStream | Blob;

/**
 * Unified Storage Provider Interface.
 * This abstraction allows Hafash to support multiple storage backends (R2, S3, Firebase)
 * without leaking provider-specific details into the application logic.
 */
export interface StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param key Unique identifier (path) for the file.
   * @param body The file content.
   * @param contentType Optional MIME type.
   * @returns The unique key of the uploaded file.
   */
  uploadFile(key: string, body: StorageBody, contentType?: string): Promise<string>;

  /**
   * Retrieves a file as a readable stream.
   * Useful for proxying downloads without buffering the entire file in memory.
   */
  downloadFile(key: string): Promise<ReadableStream | null>;

  /**
   * Permanently removes a file from storage.
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Generates a time-limited signed URL for direct client-side access.
   * @param key The file key.
   * @param expiresIn Expiration time in seconds (default: 3600).
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Checks if a file exists in the storage bucket.
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Lists file keys matching a specific prefix.
   */
  listFiles(prefix?: string): Promise<string[]>;
}

/**
 * Singleton instance of the storage provider.
 * Currently defaults to Cloudflare R2.
 */
export const storage: StorageProvider = r2Storage;
