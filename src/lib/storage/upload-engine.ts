/**
 * HAFASH UPLOAD TYPES
 * 
 * Simplified type definitions for the sequential upload pipeline.
 */

export type UploadStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface UploadTask {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  bytesUploaded: number;
  speed: number;
  eta: number;
  error?: string;
  key?: string;
  retryCount: number;
}

// Complex UploadEngine class removed in favor of sequential processing in the component.
export {};
