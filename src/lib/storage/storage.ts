'use server';

/**
 * Base error class for all storage-related failures.
 */
export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Specific error for configuration or connectivity issues.
 */
export class StorageConnectionError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConnectionError';
  }
}

/**
 * Supported body types for file uploads.
 * Uses standard types compatible with both Node.js and Edge environments where possible.
 */
export type StorageBody = string | Uint8Array | Buffer | ReadableStream | Blob;

/**
 * Unified Storage Provider Interface.
 * Allows the application to interact with storage without provider-specific knowledge.
 */
export interface StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param key Unique identifier (path) for the file.
   * @param body The file content.
   * @param contentType Optional MIME type.
   */
  uploadFile(key: string, body: StorageBody, contentType?: string): Promise<string>;

  /**
   * Retrieves a file as a standard ReadableStream.
   */
  downloadFile(key: string): Promise<ReadableStream | null>;

  /**
   * Permanently removes a file from storage.
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Generates a time-limited signed URL for direct client-side access.
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Generates a pre-signed URL for direct browser-to-storage uploads.
   * @param key The destination path.
   * @param contentType The expected MIME type.
   * @param expiresIn Expiration in seconds.
   */
  getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;

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
import { r2Storage } from './r2';
export const storage: StorageProvider = r2Storage;
