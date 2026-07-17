'use server';

import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand, 
  ListObjectsV2Command 
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageProvider, StorageBody } from './storage';

/**
 * Cloudflare R2 Storage Implementation.
 * R2 provides an S3-compatible API, allowing us to use the standard AWS SDK.
 */
class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME || "";
    
    this.client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT, // e.g. https://<account_id>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }

  private log(action: string, key: string, status: 'info' | 'error', message?: string) {
    // Lightweight, non-sensitive logging
    const timestamp = new Date().toISOString();
    console.log(`[R2_STORAGE][${status.toUpperCase()}] ${timestamp} - Action: ${action} | Key: ${key}${message ? ` | Msg: ${message}` : ''}`);
  }

  async uploadFile(key: string, body: StorageBody, contentType?: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body as any, // AWS SDK handles Buffer, Stream, etc.
        ContentType: contentType,
      });

      await this.client.send(command);
      this.log('UPLOAD', key, 'info');
      return key;
    } catch (error: any) {
      this.log('UPLOAD', key, 'error', error.message);
      throw new Error(`Failed to upload file to R2: ${error.message}`);
    }
  }

  async downloadFile(key: string): Promise<ReadableStream | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) return null;

      // Handle both Node.js and Web standard streams
      return response.Body.transformToWebStream() as ReadableStream;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        this.log('DOWNLOAD', key, 'info', 'File not found');
        return null;
      }
      this.log('DOWNLOAD', key, 'error', error.message);
      throw new Error(`Failed to download file from R2: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      this.log('DELETE', key, 'info');
    } catch (error: any) {
      this.log('DELETE', key, 'error', error.message);
      throw new Error(`Failed to delete file from R2: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getS3SignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error: any) {
      this.log('SIGNED_URL', key, 'error', error.message);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.log('HEAD', key, 'error', error.message);
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      return (response.Contents || []).map(obj => obj.Key || '').filter(Boolean);
    } catch (error: any) {
      this.log('LIST', prefix || 'root', 'error', error.message);
      throw new Error(`Failed to list files in R2: ${error.message}`);
    }
  }
}

export const r2Storage = new R2StorageProvider();
