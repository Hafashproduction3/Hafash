"use client";

import { useState, useRef } from 'react';
import { Upload, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { requestDriveUploadUrl, completeDriveUpload } from '@/app/actions/drive';

const THUMBNAIL_OPTIONS = {
  maxSizeMB: 0.05,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  initialQuality: 0.8,
  fileType: 'image/jpeg',
};

const ORIGINAL_OPTIONS = {
  maxSizeMB: 3,
  maxWidthOrHeight: 4000,
  useWebWorker: true,
  initialQuality: 0.88,
  fileType: 'image/jpeg',
};

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  folderId: string | null;
  onComplete: () => void;
}

interface FileItem {
  id: string;
  file: File;
  progress: number;
  status: 'queued' | 'compressing' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function UploadModal({ open, onClose, userId, folderId, onComplete }: UploadModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const newItems: FileItem[] = selected.map((f) => ({
      id: Math.random().toString(36).substring(2, 11),
      file: f,
      progress: 0,
      status: 'queued',
    }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  const uploadToR2 = (url: string, file: File, onProgress: (loaded: number, total: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total);
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.timeout = 600000;
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  };

  const startUpload = async () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'completed') continue;

      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'compressing' } : f))
        );

        // Compress if image
        let fileToUpload = item.file;
        if (item.file.type.startsWith('image/') && item.file.size > 4 * 1024 * 1024) {
          try {
            fileToUpload = await imageCompression(item.file, ORIGINAL_OPTIONS);
          } catch (e) {
            console.warn('Compression failed, using original');
          }
        }

        // Generate thumbnail
        let thumbFile: File | null = null;
        if (item.file.type.startsWith('image/')) {
          try {
            thumbFile = await imageCompression(fileToUpload, THUMBNAIL_OPTIONS);
          } catch (e) {}
        }

        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
        );

        // Get upload URL
        const urlResult = await requestDriveUploadUrl({
          userId,
          folderId,
          fileName: item.file.name,
          contentType: fileToUpload.type || 'image/jpeg',
          fileSize: fileToUpload.size,
        });

        if (!urlResult.success || !urlResult.uploadUrl || !urlResult.key) {
          throw new Error(urlResult.error || 'Failed to get upload URL');
        }

        // Upload original
        await uploadToR2(urlResult.uploadUrl, fileToUpload, (loaded, total) => {
          const pct = Math.round((loaded / total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
          );
        });

        // Upload thumbnail
        let thumbKey: string | undefined;
        if (thumbFile) {
          try {
            const thumbResult = await requestDriveUploadUrl({
              userId,
              folderId,
              fileName: `thumb_${item.file.name}`,
              contentType: 'image/jpeg',
              fileSize: thumbFile.size,
            });
            if (thumbResult.success && thumbResult.uploadUrl && thumbResult.key) {
              await uploadToR2(thumbResult.uploadUrl, thumbFile, () => {});
              thumbKey = thumbResult.key;
            }
          } catch (e) {}
        }

        // Complete
        const completeResult = await completeDriveUpload({
          userId,
          folderId,
          task: {
            id: item.id,
            key: urlResult.key,
            thumbKey,
            file: {
              name: item.file.name,
              size: fileToUpload.size,
              type: fileToUpload.type || 'image/jpeg',
            },
          },
        });

        if (!completeResult.success) {
          throw new Error(completeResult.error || 'Failed to finalize');
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'completed', progress: 100 } : f
          )
        );
      } catch (err: any) {
        console.error('[UPLOAD]', err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'error', error: err.message } : f
          )
        );
      }
    }

    setUploading(false);
    onComplete();
  };

  const handleClose = () => {
    if (uploading) return;
    setFiles([]);
    onClose();
  };

  if (!open) return null;

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const totalCount = files.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-card border border-primary/20 rounded-[2.5rem] p-8 lg:p-10 space-y-6 shadow-[0_50px_100px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white">Upload Files</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {folderId ? 'To current folder' : 'To Drive root'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "relative h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all shrink-0",
            uploading
              ? "border-primary/30 bg-primary/5 cursor-wait"
              : "border-border/50 bg-background/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Upload className="w-10 h-10 text-primary mb-3" />
          <p className="text-sm font-bold text-white">
            {uploading ? 'Uploading...' : 'Click to select files'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Photos, videos — up to 10GB per file
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {files.map((f) => (
              <div
                key={f.id}
                className="bg-background/40 border border-white/5 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  {f.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : f.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Upload className="w-5 h-5 text-primary/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{f.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {f.status === 'completed'
                      ? 'Uploaded'
                      : f.status === 'error'
                      ? f.error
                      : f.status === 'compressing'
                      ? 'Compressing...'
                      : `${f.progress}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 rounded-2xl h-14 border-white/10 font-bold"
          >
            {allDone ? 'Close' : 'Cancel'}
          </Button>
          {!allDone && (
            <Button
              onClick={startUpload}
              disabled={files.length === 0 || uploading}
              className="flex-1 rounded-2xl h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading {completedCount}/{totalCount}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload {files.length} Files
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}