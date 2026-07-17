/**
 * HAFASH UPLOAD ENGINE (HARDENED)
 * 
 * A robust, client-side orchestration layer for professional asset delivery.
 * Features: Concurrent workers, progress telemetry, exponential retry logic, and memory-efficient streaming.
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
  retryCount: number;
}

export class UploadEngine {
  private queue: UploadTask[] = [];
  private workers: number = 3;
  private maxRetries: number = 3;
  private isPaused: boolean = false;
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

  public addFiles(files: File[]) {
    const newTasks: UploadTask[] = files.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      status: 'queued',
      progress: 0,
      bytesUploaded: 0,
      speed: 0,
      eta: 0,
      retryCount: 0
    }));

    this.queue.push(...newTasks);
    this.processQueue();
    return newTasks;
  }

  public pauseQueue() {
    this.isPaused = true;
    this.queue.forEach(t => {
      if (t.status === 'uploading' && t.xhr) {
        t.xhr.abort();
        t.status = 'paused';
        this.onUpdate(t);
      }
    });
  }

  public resumeQueue() {
    this.isPaused = false;
    this.queue.forEach(t => {
      if (t.status === 'paused') t.status = 'queued';
    });
    this.processQueue();
  }

  public abortAll() {
    this.isPaused = true;
    this.queue.forEach(t => {
      if (t.xhr) {
        t.xhr.abort();
        this.cleanupTask(t);
      }
      if (t.status === 'uploading' || t.status === 'queued') {
        t.status = 'cancelled';
        this.onUpdate(t);
      }
    });
    this.queue = [];
  }

  private processQueue() {
    if (this.isPaused) return;

    const active = this.queue.filter(t => t.status === 'uploading').length;
    const availableSlots = this.workers - active;

    if (availableSlots <= 0) return;

    const nextTasks = this.queue
      .filter(t => t.status === 'queued')
      .slice(0, availableSlots);

    if (nextTasks.length === 0 && active === 0) {
      const allDone = this.queue.every(t => t.status === 'completed' || t.status === 'error' || t.status === 'cancelled');
      if (allDone && this.queue.length > 0) this.onComplete();
      return;
    }

    nextTasks.forEach(task => this.executeTask(task));
  }

  private async executeTask(task: UploadTask) {
    if (this.isPaused) return;
    
    task.status = 'uploading';
    task.startTime = Date.now();
    this.onUpdate(task);

    try {
      const { success, uploadUrl, key, error } = await requestUploadUrl({
        userId: this.userId,
        galleryId: this.galleryId,
        fileName: task.file.name,
        contentType: task.file.type || 'application/octet-stream',
        fileSize: task.file.size
      });

      if (this.isPaused) {
        task.status = 'paused';
        this.onUpdate(task);
        return;
      }

      if (!success || !uploadUrl) {
        throw new Error(error || "Authorization failed.");
      }

      task.key = key;

      const xhr = new XMLHttpRequest();
      task.xhr = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const duration = (now - (task.startTime || now)) / 1000;
          
          task.progress = Math.round((e.loaded / e.total) * 100);
          task.bytesUploaded = e.loaded;
          
          if (duration > 0.5) { // Use windowed speed for stability
            task.speed = e.loaded / duration;
            const remainingBytes = e.total - e.loaded;
            task.eta = task.speed > 1024 ? remainingBytes / task.speed : 0;
          }

          this.onUpdate(task);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          task.status = 'completed';
          task.progress = 100;
          this.cleanupTask(task);
          this.onUpdate(task);
          this.processQueue();
        } else {
          this.handleTaskFailure(task, `Cloud rejection: ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        this.handleTaskFailure(task, "Network sync failure.");
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', task.file.type || 'application/octet-stream');
      xhr.send(task.file);

    } catch (err: any) {
      this.handleTaskFailure(task, err.message);
    }
  }

  private handleTaskFailure(task: UploadTask, message: string) {
    this.cleanupTask(task);
    
    if (task.retryCount < this.maxRetries && !this.isPaused) {
      task.retryCount++;
      task.status = 'queued';
      this.onUpdate(task);
      // Exponential backoff delay
      setTimeout(() => this.processQueue(), Math.pow(2, task.retryCount) * 1000);
    } else {
      task.status = 'error';
      task.error = message;
      this.onUpdate(task);
      this.processQueue();
    }
  }

  private cleanupTask(task: UploadTask) {
    if (task.xhr) {
      task.xhr.upload.onprogress = null;
      task.xhr.onload = null;
      task.xhr.onerror = null;
      task.xhr = undefined;
    }
  }

  public cancelTask(taskId: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      if (task.xhr) task.xhr.abort();
      this.cleanupTask(task);
      task.status = 'cancelled';
      this.onUpdate(task);
      this.processQueue();
    }
  }

  public getQueue() {
    return this.queue;
  }
}