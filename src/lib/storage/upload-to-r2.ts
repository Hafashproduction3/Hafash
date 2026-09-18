/**
 * Hafash — Direct R2 Upload Helper
 * Browser se directly R2 pe upload karta hai (3-5x faster)
 */

"use client";

export interface UploadProgress {
  fileName: string;
  loaded: number;
  total: number;
  percent: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
  key?: string;
}

export interface UploadOptions {
  folder?: string;      // e.g., "galleries/eventId"
  parallel?: number;    // default 5
  onProgress?: (updates: UploadProgress[]) => void;
}

/**
 * Single file ko R2 pe upload karo (direct, presigned URL se)
 */
async function uploadSingleFile(
  file: File,
  folder: string,
  onProgress: (loaded: number, total: number) => void
): Promise<{ url: string; key: string }> {
  // 1. Presigned URL lo
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      folder,
    }),
  });

  if (!presignRes.ok) {
    throw new Error("Failed to get upload URL");
  }

  const { uploadUrl, key, publicUrl } = await presignRes.json();

  // 2. XMLHttpRequest use karo (progress tracking ke liye)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ url: publicUrl, key });
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Aborted")));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Multiple files parallel upload karo
 */
export async function uploadFilesToR2(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadProgress[]> {
  const { folder = "uploads", parallel = 5, onProgress } = options;

  // Initial state
  const progress: UploadProgress[] = files.map((f) => ({
    fileName: f.name,
    loaded: 0,
    total: f.size,
    percent: 0,
    status: "pending",
  }));

  const notify = () => onProgress?.([...progress]);

  notify();

  // Parallel upload with chunking
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= files.length) return;

      const file = files[idx];
      progress[idx].status = "uploading";
      notify();

      try {
        const result = await uploadSingleFile(file, folder, (loaded, total) => {
          progress[idx].loaded = loaded;
          progress[idx].total = total;
          progress[idx].percent = Math.round((loaded / total) * 100);
          notify();
        });

        progress[idx].status = "done";
        progress[idx].percent = 100;
        progress[idx].url = result.url;
        progress[idx].key = result.key;
        notify();
      } catch (err: any) {
        progress[idx].status = "error";
        progress[idx].error = err.message;
        notify();
      }
    }
  }

  // Start N workers (parallel uploads)
  const workers = Array.from({ length: Math.min(parallel, files.length) }, () =>
    worker()
  );

  await Promise.all(workers);

  return progress;
}