/**
 * Metadata associated with a stored object.
 */
export interface ObjectMetadata {
  key: string;
  size: number;
  contentType?: string;
  lastModified?: Date;
}

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
 */
export type StorageBody = string | Uint8Array | Buffer | ReadableStream | Blob;

/**
 * Unified Storage Provider Interface.
 */
export interface StorageProvider {
  uploadFile(key: string, body: StorageBody, contentType?: string): Promise<string>;
  downloadFile(key: string): Promise<ReadableStream | null>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  fileExists(key: string): Promise<boolean>;
  getFileMetadata(key: string): Promise<ObjectMetadata | null>;
  listFiles(prefix?: string): Promise<string[]>;
}

/**
 * Singleton instance of the storage provider.
 * Currently defaults to Cloudflare R2.
 */
import { r2Storage } from './r2';
export const storage: StorageProvider = r2Storage;
