
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3ServiceException,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  StorageProvider,
  StorageBody,
  StorageError,
  StorageConnectionError,
  type ObjectMetadata,
  type MultipartCompletedPart,
} from "./storage";

class R2StorageProvider implements StorageProvider {
  private client: S3Client | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      throw new Error(
        "R2StorageProvider can only be initialized in a server environment."
      );
    }
  }

  private validateConfig(): void {
    const requiredVars = [
      "R2_BUCKET_NAME",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_ENDPOINT",
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
      throw new StorageConnectionError(
        `Critical R2 environment variables are missing: ${missing.join(", ")}`
      );
    }
  }

  private getClient(): S3Client {
    if (this.client) return this.client;

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

  private log(
    action: string,
    key: string,
    status: "INFO" | "ERROR",
    message?: string
  ): void {
    const timestamp = new Date().toISOString();

    console.log(
      `[R2_STORAGE][${status}] ${timestamp} - ${action}: ${key}${
        message ? ` (${message})` : ""
      }`
    );
  }

  async uploadFile(
    key: string,
    body: StorageBody,
    contentType?: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body as any,
        ContentType: contentType,
      });

      await this.getClient().send(command);
      this.log("UPLOAD", key, "INFO");

      return key;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      this.log("UPLOAD", key, "ERROR", detail);

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
      if (
        error instanceof S3ServiceException &&
        (error.name === "NoSuchKey" ||
          error.$metadata?.httpStatusCode === 404)
      ) {
        return null;
      }

      const detail = error instanceof Error ? error.message : String(error);

      throw new StorageError(
        `Failed to download ${key} from R2 storage: ${detail}`
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.getClient().send(command);
      this.log("DELETE", key, "INFO");
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      this.log("DELETE", key, "ERROR", detail);

      throw new StorageError(
        `Failed to delete object ${key} from R2 storage.`
      );
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn?: number
  ): Promise<string> {
    const expiration =
      expiresIn ||
      Number(process.env.R2_SIGNED_URL_EXPIRATION) ||
      3600;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getS3SignedUrl(this.getClient(), command, {
        expiresIn: expiration,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      throw new StorageError(
        `Could not generate signed URL for ${key}: ${detail}`
      );
    }
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<string> {
    const expiration = expiresIn || 300;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getS3SignedUrl(this.getClient(), command, {
        expiresIn: expiration,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      throw new StorageError(
        `Could not generate signed upload URL for ${key}: ${detail}`
      );
    }
  }

  // Start a multipart upload and return its upload ID.
  async createMultipartUpload(
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const result = await this.getClient().send(command);

      if (!result.UploadId) {
        throw new StorageError(
          "R2 did not return a multipart upload ID."
        );
      }

      this.log("MULTIPART_START", key, "INFO");

      return result.UploadId;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      this.log("MULTIPART_START", key, "ERROR", detail);

      throw new StorageError(
        `Failed to start multipart upload for ${key}: ${detail}`
      );
    }
  }

  // Generate a presigned URL for one individual part.
  async getSignedUploadPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn = 900
  ): Promise<string> {
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > 10000
    ) {
      throw new StorageError("Invalid multipart part number.");
    }

    if (!uploadId) {
      throw new StorageError("Multipart upload ID is required.");
    }

    try {
      const command = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      return await getS3SignedUrl(this.getClient(), command, {
        expiresIn,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      throw new StorageError(
        `Could not generate signed URL for part ${partNumber}: ${detail}`
      );
    }
  }

  // Complete the upload after all parts have been uploaded.
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: MultipartCompletedPart[]
  ): Promise<void> {
    if (!uploadId) {
      throw new StorageError("Multipart upload ID is required.");
    }

    if (
      parts.length === 0 ||
      parts.length > 10000 ||
      parts.some(
        (part) =>
          !Number.isInteger(part.PartNumber) ||
          part.PartNumber < 1 ||
          part.PartNumber > 10000 ||
          typeof part.ETag !== "string" ||
          part.ETag.trim().length === 0
      )
    ) {
      throw new StorageError(
        "Invalid multipart completion parts."
      );
    }

    const sortedParts = [...parts].sort(
      (a, b) => a.PartNumber - b.PartNumber
    );

    for (let i = 1; i < sortedParts.length; i++) {
      if (
        sortedParts[i].PartNumber ===
        sortedParts[i - 1].PartNumber
      ) {
        throw new StorageError(
          "Duplicate multipart part numbers are not allowed."
        );
      }
    }

    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts.map((part) => ({
            ETag: part.ETag,
            PartNumber: part.PartNumber,
          })),
        },
      });

      await this.getClient().send(command);

      this.log("MULTIPART_COMPLETE", key, "INFO");
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      this.log("MULTIPART_COMPLETE", key, "ERROR", detail);

      throw new StorageError(
        `Failed to complete multipart upload for ${key}: ${detail}`
      );
    }
  }

  // Abort an unfinished multipart upload.
  async abortMultipartUpload(
    key: string,
    uploadId: string
  ): Promise<void> {
    if (!uploadId) {
      throw new StorageError("Multipart upload ID is required.");
    }

    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      });

      await this.getClient().send(command);

      this.log("MULTIPART_ABORT", key, "INFO");
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      this.log("MULTIPART_ABORT", key, "ERROR", detail);

      throw new StorageError(
        `Failed to abort multipart upload for ${key}: ${detail}`
      );
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
      if (
        error instanceof S3ServiceException &&
        (error.name === "NotFound" ||
          error.$metadata?.httpStatusCode === 404)
      ) {
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
      if (
        error instanceof S3ServiceException &&
        (error.name === "NotFound" ||
          error.$metadata?.httpStatusCode === 404)
      ) {
        return null;
      }

      throw new StorageError(
        `Failed to retrieve metadata for ${key}`
      );
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
        .map((obj) => obj.Key || "")
        .filter(Boolean);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);

      throw new StorageError(
        `Failed to list objects in R2 storage: ${detail}`
      );
    }
  }
}

export const r2Storage = new R2StorageProvider();
