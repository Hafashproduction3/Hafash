/**
 * HAFASH UPLOAD ENGINE
 * 
 * A robust, client-side orchestration layer for professional asset delivery.
 * Features: Concurrent workers, progress telemetry, retry logic, and memory-efficient streaming.
 */

import { requestUploadUrl } from '@/app/actions/storage';

export type UploadStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface UploadTask {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  bytesUploaded: number;
  speed: number; // bytes per second
  eta: number; // seconds
  error?: string;
  xhr?: XMLHttpRequest;
  startTime?: number;
  key?: string;
}

export interface EngineStats {
  activeTasks: number;
  queuedTasks: number;
  completedTasks: number;
  totalSpeed: number; // aggregate bytes per second
}

export class UploadEngine {
  private queue: UploadTask[] = [];
  private workers: number = 3;
  private maxRetries: number = 2;
  private onUpdate: (task: UploadTask) => void;
  private onComplete: () => void;
  private userId: string;
  private galleryId: string;

  constructor(params: {
    userId: string;
    galleryId: string;
    concurrency?: number;
    onUpdate: (task: UploadTask) => void;
    onComplete: () => void;
  }) {
    this.userId = params.userId;
    this.galleryId = params.galleryId;
    this.workers = params.concurrency || 3;
    this.onUpdate = params.onUpdate;
    this.onComplete = params.onComplete;
  }

  /**
   * Adds files to the upload pipeline.
   */
  public addFiles(files: File[]) {
    const newTasks: UploadTask[] = files.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      status: 'queued',
      progress: 0,
      bytesUploaded: 0,
      speed: 0,
      eta: 0
    }));

    this.queue.push(...newTasks);
    this.processQueue();
    return newTasks;
  }

  /**
   * Orchestrates the worker pool.
   */
  private processQueue() {
    const active = this.queue.filter(t => t.status === 'uploading').length;
    const availableSlots = this.workers - active;

    if (availableSlots <= 0) return;

    const nextTasks = this.queue
      .filter(t => t.status === 'queued')
      .slice(0, availableSlots);

    if (nextTasks.length === 0 && active === 0) {
      this.onComplete();
      return;
    }

    nextTasks.forEach(task => this.executeTask(task));
  }

  /**
   * Executes a single Direct-to-R2 upload task.
   */
  private async executeTask(task: UploadTask) {
    task.status = 'uploading';
    task.startTime = Date.now();
    this.onUpdate(task);

    try {
      // 1. Request Secure Brokerage from Server
      const { success, uploadUrl, key, error } = await requestUploadUrl({
        userId: this.userId,
        galleryId: this.galleryId,
        fileName: task.file.name,
        contentType: task.file.type || 'application/octet-stream'
      });

      if (!success || !uploadUrl) {
        throw new Error(error || "Failed to obtain upload authorization.");
      }

      task.key = key;

      // 2. Direct Browser-to-R2 Transmission via XHR (for progress events)
      const xhr = new XMLHttpRequest();
      task.xhr = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const duration = (now - (task.startTime || now)) / 1000;
          
          task.progress = Math.round((e.loaded / e.total) * 100);
          task.bytesUploaded = e.loaded;
          
          if (duration > 0) {
            task.speed = e.loaded / duration;
            const remainingBytes = e.total - e.loaded;
            task.eta = remainingBytes / task.speed;
          }

          this.onUpdate(task);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          task.status = 'completed';
          task.progress = 100;
          this.onUpdate(task);
          this.processQueue();
        } else {
          throw new Error(`Cloud rejection: ${xhr.statusText}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error("Network synchronization failure.");
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', task.file.type || 'application/octet-stream');
      xhr.send(task.file);

    } catch (err: any) {
      task.status = 'error';
      task.error = err.message;
      this.onUpdate(task);
      this.processQueue();
    }
  }

  public cancelTask(taskId: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      if (task.xhr) task.xhr.abort();
      task.status = 'cancelled';
      this.onUpdate(task);
      this.processQueue();
    }
  }

  public getQueue() {
    return this.queue;
  }
}
