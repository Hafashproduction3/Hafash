import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand, 
  ListObjectsV2Command,
  S3ServiceException
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { 
  StorageProvider, 
  StorageBody, 
  StorageError, 
  StorageConnectionError,
  type ObjectMetadata
} from './storage';

/**
 * Cloudflare R2 Storage Provider Implementation.
 * Uses the S3-compatible API via AWS SDK v3.
 */
class R2StorageProvider implements StorageProvider {
  private client: S3Client | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('R2StorageProvider can only be initialized in a server environment.');
    }
  }

  private validateConfig(): void {
    const requiredVars = [
      'R2_BUCKET_NAME',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_ENDPOINT'
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new StorageConnectionError(
        `Critical R2 environment variables are missing: ${missing.join(', ')}`
      );
    }
  }

  private getClient(): S3Client {
    if (this.client) return this.client;

    // Validate only when needed to prevent module-level crashes during build/init
    this.validateConfig();

    this.client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      maxAttempts: 3,
    });

    return this.client;
  }

  private get bucketName(): string {
    return process.env.R2_BUCKET_NAME || "";
  }

  private log(action: string, key: string, status: 'INFO' | 'ERROR', message?: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[R2_STORAGE][${status}] ${timestamp} - ${action}: ${key}${message ? ` (${message})` : ''}`);
  }

  async uploadFile(key: string, body: StorageBody, contentType?: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body as any,
        ContentType: contentType,
      });

      await this.getClient().send(command);
      this.log('UPLOAD', key, 'INFO');
      return key;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      this.log('UPLOAD', key, 'ERROR', detail);
      throw new StorageError(`Failed to upload ${key} to R2 storage.`);
    }
  }

  async downloadFile(key: string): Promise<ReadableStream | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.getClient().send(command);
      if (!response.Body) return null;

      return response.Body.transformToWebStream() as ReadableStream;
    } catch (error: unknown) {
      if (error instanceof S3ServiceException && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) {
        return null;
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to download ${key} from R2 storage: ${detail}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.getClient().send(command);
      this.log('DELETE', key, 'INFO');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      this.log('DELETE', key, 'ERROR', detail);
      throw new StorageError(`Failed to delete object ${key} from R2 storage.`);
    }
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const expiration = expiresIn || Number(process.env.R2_SIGNED_URL_EXPIRATION) || 3600;
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getS3SignedUrl(this.getClient(), command, { expiresIn: expiration });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Could not generate signed URL for ${key}: ${detail}`);
    }
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string> {
    const expiration = expiresIn || 300; 
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getS3SignedUrl(this.getClient(), command, { expiresIn: expiration });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Could not generate signed upload URL for ${key}: ${detail}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.getClient().send(command);
      return true;
    } catch (error: unknown) {
      if (error instanceof S3ServiceException && (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404)) {
        return false;
      }
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.getClient().send(command);
      return {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error: unknown) {
      if (error instanceof S3ServiceException && (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404)) {
        return null;
      }
      throw new StorageError(`Failed to retrieve metadata for ${key}`);
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.getClient().send(command);
      return (response.Contents || [])
        .map((obj) => obj.Key || '')
        .filter(Boolean);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to list objects in R2 storage: ${detail}`);
    }
  }
}

export const r2Storage = new R2StorageProvider();
