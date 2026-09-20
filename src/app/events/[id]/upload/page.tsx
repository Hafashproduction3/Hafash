"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { 
  Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, 
  X, AlertTriangle, Activity, ShieldCheck, HardDrive, FileIcon,
  RefreshCw, Clock, Zap, Play, Pause, Lock, Share2, Timer, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN, isOwnerEmail } from '@/lib/plans';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { requestUploadUrl, completeUpload } from '@/app/actions/storage';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { 
  savePendingFile, 
  loadPendingFiles, 
  removePendingFile, 
  clearPendingFiles,
  blobToFile
} from '@/lib/upload-storage';

type UploadStepStatus = 'queued' | 'compressing' | 'uploading' | 'syncing' | 'completed' | 'error' | 'paused' | 'cancelled';

interface FileItem {
  id: string;
  file: File;
  thumbFile?: File;
  originalFile?: File;
  progress: number;
  name: string;
  size: number;
  thumbSize?: number;
  originalSize?: number;
  status: UploadStepStatus;
  error?: string;
  currentStep: string;
  speed: number;
  eta: number;
  previewUrl?: string;
  retryCount: number;
  originalReady?: boolean;
}

const PARALLEL_LIMIT = 2;
const MAX_RETRIES = 3;

// 🖼️ Thumbnail — Tiny grid
const THUMBNAIL_OPTIONS = {
  maxSizeMB: 0.05,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  initialQuality: 0.8,
  fileType: 'image/jpeg',
};

// ✅ Original — High quality, compressed
const ORIGINAL_OPTIONS = {
  maxSizeMB: 3,
  maxWidthOrHeight: 4000,
  useWebWorker: true,
  initialQuality: 0.88,
  fileType: 'image/jpeg',
};

const getResumeKey = (galleryId: string) => `hafash_upload_${galleryId}`;

function formatTime(seconds: number): string {
  if (!seconds || seconds === Infinity || seconds <= 0) return "Calculating...";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours} hr ${mins} min`;
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [resumedCount, setResumedCount] = useState(0);
  const [uploadedNames, setUploadedNames] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(true);
  const [showPreUploadWarning, setShowPreUploadWarning] = useState(false);
  
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const speedSamplesRef = useRef<number[]>([]);

  const isOwner = useMemo(() => isOwnerEmail(user?.email), [user?.email]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !id) return;
    try {
      const saved = localStorage.getItem(getResumeKey(id));
      if (saved) {
        const data = JSON.parse(saved);
        const names = new Set<string>(data.uploadedNames || []);
        setUploadedNames(names);
        setResumedCount(names.size);
      }
    } catch (e) {}
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !id) {
      setIsRestoring(false);
      return;
    }
    let cancelled = false;

    async function restoreFiles() {
      try {
        const stored = await loadPendingFiles(id);
        if (cancelled) return;
        if (stored.length === 0) { setIsRestoring(false); return; }

        const restored: FileItem[] = stored
          .filter((s) => s.status !== 'completed')
          .map((s) => {
            const file = blobToFile(s.fileBlob, s.name, s.type);
            const isImage = s.type.startsWith('image/');
            return {
              id: s.fileId,
              file,
              name: s.name,
              size: s.size,
              progress: 0,
              status: 'queued' as UploadStepStatus,
              currentStep: 'Restored — Ready',
              speed: 0,
              eta: 0,
              retryCount: 0,
              previewUrl: isImage ? URL.createObjectURL(file) : undefined,
              originalReady: false,
            };
          });

        if (restored.length > 0 && !cancelled) {
          setFiles(restored);
          toast({
            title: `🔄 ${restored.length} files restored`,
            description: "Upload continue karne ke liye 'Begin Upload' click karein.",
          });
        }
      } catch (e) {
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }

    restoreFiles();
    return () => { cancelled = true; };
  }, [id, toast]);

  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading: dataLoading } = useDoc(eventRef);

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: galleries } = useCollection(galleriesQuery);

  const currentPlan = useMemo(() => {
    if (isOwner) {
      return {
        id: 'business' as PlanId,
        name: 'Owner (Unlimited)',
        storageGb: 999999,
        zipLimitGb: 999999,
        price: 'Rs. 0',
        priceAmount: 0,
        features: ['Unlimited Storage'],
        priorityLevel: 999,
        priorityLabel: 'Owner',
      };
    }
    const planId = (profile?.planId as PlanId) || 'none';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId, isOwner]);

  const isSubscriptionActive = useMemo(() => {
    if (isOwner) return true;
    if (!profile?.planId || currentPlan.id === 'none') return false;
    const raw = profile?.planExpiryDate;
    if (!raw) return false;
    const expiry = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw);
    return expiry.getTime() > Date.now();
  }, [isOwner, profile?.planId, profile?.planExpiryDate, currentPlan.id]);

  const currentUsageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);

  const updateFileStatus = (fileId: string, updates: Partial<FileItem>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
  };

  const saveProgress = (names: Set<string>) => {
    if (typeof window === 'undefined' || !id) return;
    try {
      localStorage.setItem(getResumeKey(id), JSON.stringify({
        uploadedNames: Array.from(names),
        timestamp: Date.now(),
      }));
    } catch (e) {}
  };

  const clearResumeState = () => {
    if (typeof window === 'undefined' || !id) return;
    try {
      localStorage.removeItem(getResumeKey(id));
      setResumedCount(0);
      setUploadedNames(new Set());
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsDone(false);
      const selectedFiles = Array.from(e.target.files);
      
      const newItems: FileItem[] = selectedFiles.map(f => {
        const isImage = f.type.startsWith('image/');
        return {
          id: Math.random().toString(36).substring(2, 11),
          file: f,
          name: f.name,
          size: f.size,
          progress: 0,
          status: uploadedNames.has(f.name) ? 'completed' : 'queued',
          currentStep: uploadedNames.has(f.name) ? 'Already Uploaded' : 'In Queue',
          speed: 0,
          eta: 0,
          retryCount: 0,
          previewUrl: isImage ? URL.createObjectURL(f) : undefined,
          originalReady: uploadedNames.has(f.name),
        };
      });

      setFiles(prev => [...prev, ...newItems]);

      if (id) {
        newItems.forEach(item => {
          if (item.status !== 'completed') {
            savePendingFile(id, {
              fileId: item.id,
              file: item.file,
              name: item.name,
              size: item.size,
              status: 'queued',
              progress: 0,
              currentStep: 'In Queue',
              originalReady: false,
            }).catch(e => {});
          }
        });
      }
      
      const newFiles = newItems.filter(f => f.status !== 'completed');
      if (newFiles.length > 20) setShowPreUploadWarning(true);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter(f => f.id !== fileId);
    });
    if (id) removePendingFile(id, fileId).catch(e => {});
  };

  const handlePause = () => {
    pauseRef.current = true;
    setIsPaused(true);
    toast({ title: "⏸ Paused", description: "Progress safe hai." });
  };

  const handleResume = () => {
    pauseRef.current = false;
    setIsPaused(false);
    toast({ title: "▶️ Resumed", description: "Wahi se continue." });
    startUpload();
  };

  const generateThumbnail = async (file: File): Promise<File | null> => {
    if (!file.type.startsWith('image/')) return null;
    try {
      return await imageCompression(file, THUMBNAIL_OPTIONS);
    } catch (err) {
      return null;
    }
  };

  const generateCompressedOriginal = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    if (file.size < 4 * 1024 * 1024) return file;
    try {
      return await imageCompression(file, ORIGINAL_OPTIONS);
    } catch (err) {
      return file;
    }
  };

  const uploadToR2 = (url: string, file: File, onProgress?: (loaded: number, total: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff > 0.5) {
              const instantSpeed = (e.loaded - lastLoaded) / timeDiff;
              speedSamplesRef.current.push(instantSpeed);
              if (speedSamplesRef.current.length > 10) speedSamplesRef.current.shift();
              onProgress(e.loaded, e.total);
              lastLoaded = e.loaded;
              lastTime = now;
            }
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`R2: ${xhr.status}`));
      });

      xhr.addEventListener('error', () => reject(new Error("Network error")));
      xhr.timeout = 900000;
      xhr.addEventListener('timeout', () => reject(new Error("Timeout")));

      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });
  };

  const startUpload = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    setIsDone(false);
    pauseRef.current = false;
    cancelRef.current = false;
    speedSamplesRef.current = [];

    const alreadyUploaded = new Set(uploadedNames);
    const tracker = new Set(uploadedNames);

    const filesToUpload = files.filter(
      (f) => f.status !== "completed" && !alreadyUploaded.has(f.name)
    );

    setFiles(prev => prev.map(f => 
      alreadyUploaded.has(f.name) && f.status !== 'completed'
        ? { ...f, status: 'completed', progress: 100, currentStep: 'Already Uploaded' }
        : f
    ));

    if (filesToUpload.length === 0) {
      toast({ title: "✅ All Done", description: "All photos uploaded." });
      setIsUploading(false);
      setIsDone(true);
      return;
    }

    let currentIndex = 0;

    const uploadSingleFile = async (item: FileItem, attempt = 1) => {
      if (pauseRef.current) {
        updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
        return;
      }
      if (cancelRef.current) {
        updateFileStatus(item.id, { status: 'cancelled', currentStep: 'Cancelled' });
        return;
      }

      try {
        // 1. Compress original
        updateFileStatus(item.id, { status: 'compressing', currentStep: 'Optimizing...' });
        const originalFile = await generateCompressedOriginal(item.file);
        const fileToUpload = originalFile;

        // 2. Generate thumbnail
        let thumbFile = item.thumbFile;
        if (!thumbFile && item.file.type.startsWith('image/')) {
          updateFileStatus(item.id, { currentStep: 'Creating thumbnail...' });
          const t = await generateThumbnail(fileToUpload);
          if (t) thumbFile = t;
        }

        setFiles(prev => prev.map(f => 
          f.id === item.id 
            ? { ...f, originalFile, originalSize: fileToUpload.size, thumbFile, thumbSize: thumbFile?.size } 
            : f
        ));

        if (pauseRef.current) {
          updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
          return;
        }

        // 3. Upload original
        updateFileStatus(item.id, { status: 'uploading', currentStep: 'Uploading...' });

        const originalResult = await requestUploadUrl({
          userId: user!.uid,
          galleryId: id,
          fileName: `original_${item.name}`,
          contentType: fileToUpload.type || 'image/jpeg',
          fileSize: fileToUpload.size,
        });

        if (!originalResult.success || !originalResult.uploadUrl) {
          throw new Error(originalResult.error || "Failed to authorize upload.");
        }

        await uploadToR2(originalResult.uploadUrl, fileToUpload, (loaded, total) => {
          const progress = Math.round((loaded / total) * 100);
          updateFileStatus(item.id, { progress });
        });

        // 4. Upload thumbnail
        let thumbKey: string | undefined;
        if (thumbFile) {
          updateFileStatus(item.id, { currentStep: "Uploading thumbnail..." });
          try {
            const thumbResult = await requestUploadUrl({
              userId: user!.uid,
              galleryId: id,
              fileName: `thumb_${item.name}`,
              contentType: 'image/jpeg',
              fileSize: thumbFile.size,
            });

            if (thumbResult.success && thumbResult.uploadUrl) {
              await uploadToR2(thumbResult.uploadUrl, thumbFile);
              thumbKey = thumbResult.key;
            }
          } catch (thumbErr) {}
        }

        // 5. Finalize
        updateFileStatus(item.id, { currentStep: "Finalizing..." });

        await completeUpload({
          userId: user!.uid,
          galleryId: id,
          task: {
            id: item.id,
            key: originalResult.key!,
            thumbKey,
            originalKey: originalResult.key!,
            originalReady: true,
            file: {
              name: item.name,
              size: fileToUpload.size,
              type: fileToUpload.type,
            },
          },
        });

        updateFileStatus(item.id, {
          status: "completed",
          progress: 100,
          currentStep: "✅ Uploaded",
          originalReady: true,
        });

        tracker.add(item.name);
        setUploadedNames(new Set(tracker));
        saveProgress(tracker);

        if (id) removePendingFile(id, item.id).catch(e => {});

      } catch (err: any) {
        if (pauseRef.current || cancelRef.current) {
          updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
          return;
        }

        if (attempt < MAX_RETRIES) {
          updateFileStatus(item.id, { currentStep: `Retry ${attempt + 1}/${MAX_RETRIES}...` });
          await new Promise(r => setTimeout(r, 1500));
          return uploadSingleFile(item, attempt + 1);
        }

        updateFileStatus(item.id, {
          status: "error",
          error: err.message,
          currentStep: "Failed",
          retryCount: attempt,
        });
      }
    };

    const worker = async () => {
      while (true) {
        if (pauseRef.current || cancelRef.current) return;
        const idx = currentIndex++;
        if (idx >= filesToUpload.length) return;
        await uploadSingleFile(filesToUpload[idx]);
      }
    };

    const workers = Array.from(
      { length: Math.min(PARALLEL_LIMIT, filesToUpload.length) },
      () => worker()
    );

    await Promise.all(workers);

    setIsUploading(false);
    
    if (pauseRef.current) {
      toast({ title: "⏸ Paused", description: "Progress safe hai." });
      return;
    }

    if (cancelRef.current) {
      toast({ title: "Cancelled", description: "Progress saved." });
      return;
    }

    setIsDone(true);
    toast({
      title: "🎉 Upload Complete!",
      description: `${filesToUpload.length} photos uploaded. Share karein.`,
    });
    clearResumeState();
    if (id) clearPendingFiles(id).catch(e => {});
  };

  const retryFailed = () => {
    setFiles(prev => prev.map(f => 
      f.status === 'error'
        ? { ...f, status: 'queued', progress: 0, error: undefined, currentStep: 'Re-queued', retryCount: 0 }
        : f
    ));
  };

  const stats = useMemo(() => {
    const totalFiles = files.length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const failedFiles = files.filter(f => f.status === 'error').length;
    const remainingFiles = totalFiles - completedFiles - failedFiles;

    const avgProgress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
    const isComplete = completedFiles === totalFiles && totalFiles > 0;

    const totalBytes = files.reduce((acc, f) => acc + (f.originalSize || f.size), 0);
    const uploadedBytes = files.reduce((acc, f) => {
      if (f.status === 'completed') return acc + (f.originalSize || f.size);
      return acc + ((f.originalSize || f.size) * (f.progress / 100));
    }, 0);
    const remainingBytes = totalBytes - uploadedBytes;

    let avgSpeed = 0;
    if (speedSamplesRef.current.length > 0) {
      avgSpeed = speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
    }
    
    const etaSeconds = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;
    const willFinishAt = etaSeconds > 0 ? new Date(Date.now() + etaSeconds * 1000) : null;

    return {
      totalFiles,
      completedFiles,
      failedFiles,
      remainingFiles,
      avgProgress,
      isComplete,
      totalSize: (totalBytes / (1024 * 1024)).toFixed(1) + " MB",
      uploadedSize: (uploadedBytes / (1024 * 1024)).toFixed(1) + " MB",
      etaSeconds,
      willFinishAt,
      avgSpeed,
    };
  }, [files]);

  const preUploadEstimate = useMemo(() => {
    const pendingFiles = files.filter(f => f.status !== 'completed');
    const estimatedBytes = pendingFiles.length * 4 * 1024 * 1024;
    const downloadSpeed = (navigator as any)?.connection?.downlink || 5;
    const estimatedUploadSpeed = (downloadSpeed / 5) * 1024 * 1024 / 8;
    const etaSeconds = estimatedBytes / Math.max(estimatedUploadSpeed, 100 * 1024);
    return {
      count: pendingFiles.length,
      sizeMb: (estimatedBytes / (1024 * 1024)).toFixed(0),
      etaMinutes: Math.round(etaSeconds / 60),
    };
  }, [files]);

  if (authLoading || dataLoading || isRestoring) {
    return <HafashLoader text="Preparing Your Luxury Assets..." />;
  }

  if (!user || !event) return null;

  const pendingSizeGb = files.reduce((acc, f) => acc + (f.status === 'queued' ? (f.originalSize || f.size) : 0), 0) / (1024 * 1024 * 1024);
  const isOverLimit = !isSubscriptionActive || (!isOwner && (currentUsageGb + pendingSizeGb) > currentPlan.storageGb);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/10" onClick={() => router.push(`/events/${id}/manage`)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Smart Delivery Hub</span>
              {isOwner && (
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] uppercase tracking-widest ml-2">
                  👑 Owner
                </Badge>
              )}
            </div>
            <h1 className="text-4xl font-headline font-bold">{event.title}</h1>
          </div>
        </div>
      </div>

      {showPreUploadWarning && !isUploading && files.length > 20 && (
        <Alert className="rounded-2xl border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="font-bold text-amber-500">Large Upload Detected</AlertTitle>
          <AlertDescription className="text-sm space-y-3">
            <p>
              <strong>{preUploadEstimate.count} photos</strong> (~{preUploadEstimate.sizeMb} MB).
              Estimated: <strong className="text-amber-500">~{preUploadEstimate.etaMinutes} minutes</strong>.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="rounded-lg border-amber-500/40 text-amber-500 hover:bg-amber-500/10" onClick={() => setShowPreUploadWarning(false)}>
                Continue
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => { setShowPreUploadWarning(false); setFiles([]); }}>
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {resumedCount > 0 && !isUploading && !isDone && (
        <Alert className="rounded-2xl border-primary/30 bg-primary/5">
          <RefreshCw className="h-5 w-5 text-primary" />
          <AlertTitle className="font-bold text-primary">Resume Available</AlertTitle>
          <AlertDescription className="text-sm">
            {resumedCount} photos pehle upload ho chuki hain. 🎯
          </AlertDescription>
        </Alert>
      )}

      {isPaused && (
        <Alert className="rounded-2xl border-orange-500/30 bg-orange-500/5">
          <Pause className="h-5 w-5 text-orange-500" />
          <AlertTitle className="font-bold text-orange-500">Upload Paused</AlertTitle>
          <AlertDescription className="text-sm">
            {stats.completedFiles} done. "Resume" click karein.
          </AlertDescription>
        </Alert>
      )}

      {isDone && stats.isComplete && (
        <Alert className="rounded-2xl border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle className="font-bold text-green-500">All Photos Uploaded ✅</AlertTitle>
          <AlertDescription className="text-sm">
            Sab {stats.totalFiles} photos ready. Ab client ko share kar sakte hain.
          </AlertDescription>
        </Alert>
      )}

      {isOverLimit && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Storage Limit</AlertTitle>
          <AlertDescription>Upgrade your plan.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className={cn(
            "relative h-96 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all",
            isOverLimit ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card/30 hover:border-primary/50 cursor-pointer"
          )}>
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
              onChange={handleFileChange}
              disabled={isUploading || isOverLimit}
            />
            <div className="p-8 rounded-full mb-6 bg-primary/10 ring-8 ring-primary/5">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-headline font-bold">Deliver Masterpieces</p>
              <p className="text-sm text-muted-foreground italic">⚡ Original Quality • Compressed to 4 MB</p>
            </div>
            
            <div className="absolute bottom-8 flex items-center gap-3 px-6 py-2 rounded-full bg-background/50 backdrop-blur-md border">
               <Zap className="w-3 h-3 text-primary animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Original • 4000px • Print-Ready</span>
            </div>
          </div>

          {files.length > 0 && (
            <div className="p-6 bg-card/40 border rounded-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upload Progress</p>
                  <p className="text-3xl font-headline font-bold text-primary">{stats.avgProgress}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ready</p>
                  <p className="text-lg font-bold">{stats.completedFiles} / {stats.totalFiles}</p>
                </div>
              </div>
              <Progress value={stats.avgProgress} className="h-2" />
              
              {isUploading && stats.avgSpeed > 0 && stats.etaSeconds > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Timer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Time Remaining</p>
                      <p className="text-sm font-bold text-primary">{formatTime(stats.etaSeconds)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Will Finish At</p>
                      <p className="text-sm font-bold text-primary">
                        {stats.willFinishAt ? formatClockTime(stats.willFinishAt) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isUploading && stats.avgSpeed > 0 && (
                <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground pt-2">
                  <span>Speed: {(stats.avgSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
                  <span>Remaining: {stats.remainingFiles} files</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 flex-wrap">
               {files.length > 0 && !isDone && !isUploading && (
                 <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => { 
                   setFiles([]); 
                   clearResumeState(); 
                   if (id) clearPendingFiles(id).catch(e => {});
                 }}>
                   Purge Queue
                 </Button>
               )}
               {stats.failedFiles > 0 && !isUploading && (
                 <Button variant="outline" className="rounded-full border-destructive/30 text-destructive gap-2" onClick={retryFailed}>
                   <RefreshCw className="w-4 h-4" />
                   Retry ({stats.failedFiles})
                 </Button>
               )}
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              {isUploading && !isPaused && (
                <Button variant="outline" className="rounded-2xl h-14 px-6 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-bold gap-2" onClick={handlePause}>
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}

              {isPaused && (
                <Button className="rounded-2xl h-14 px-6 bg-green-500 hover:bg-green-600 text-white font-bold gap-2" onClick={handleResume}>
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              
              {!isPaused && (
                <Button 
                  className={cn(
                    "rounded-2xl px-10 h-14 font-bold flex-1 sm:flex-none min-w-[220px] text-lg gap-2",
                    (isOverLimit || isUploading || stats.isComplete) 
                      ? "bg-muted cursor-not-allowed text-muted-foreground" 
                      : "bg-primary hover:bg-primary/90"
                  )}
                  onClick={startUpload}
                  disabled={files.length === 0 || isUploading || isOverLimit || stats.isComplete}
                >
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Uploading...</>
                  ) : stats.isComplete ? (
                    <><CheckCircle2 className="w-5 h-5" />Uploaded</>
                  ) : resumedCount > 0 ? (
                    <><RefreshCw className="w-5 h-5" />Resume ({resumedCount} done)</>
                  ) : (
                    <><Sparkles className="w-5 h-5" />Begin Upload</>
                  )}
                </Button>
              )}

              {stats.isComplete && (
                <Link href={`/events/${id}/manage`}>
                  <Button className="rounded-2xl h-14 px-8 bg-green-500 hover:bg-green-600 text-white font-bold gap-2">
                    <Share2 className="w-5 h-5" />
                    Share Gallery
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/40 border rounded-[2.5rem] p-8 h-[650px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" /> Active Pipeline
            </h3>
            <Badge className="bg-primary/20 text-primary">{files.length} ASSETS</Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic opacity-30 text-center px-10">
                <FileIcon className="w-12 h-12 mb-4 opacity-10" />
                Waiting for selection...
              </div>
            ) : (
              files.slice(0, 30).map(file => (
                <div key={file.id} className={cn(
                  "bg-background/40 p-4 rounded-2xl border relative overflow-hidden",
                  file.status === 'error' ? 'border-destructive/30' : 
                  file.status === 'paused' ? 'border-orange-500/30' :
                  file.status === 'completed' ? 'border-green-500/20' : 'border-border/30'
                )}>
                  <div className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500" style={{ width: `${file.progress}%` }} />
                  
                  <div className="flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                      {file.previewUrl ? (
                        <img src={file.previewUrl} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <FileIcon className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <p className="text-xs font-bold truncate pr-2">{file.name}</p>
                         {file.status === 'completed' ? (
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                         ) : (file.status === 'uploading' || file.status === 'compressing') ? (
                           <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                         ) : file.status === 'paused' ? (
                           <Pause className="w-3.5 h-3.5 text-orange-500" />
                         ) : file.status === 'error' ? (
                           <AlertTriangle className="w-4 h-4 text-destructive" />
                         ) : (
                           <span className="text-[8px] font-bold text-muted-foreground">QUEUED</span>
                         )}
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase",
                        file.status === 'error' ? 'text-destructive' : 
                        file.status === 'paused' ? 'text-orange-500' :
                        file.status === 'completed' ? 'text-green-500' : 'text-primary'
                      )}>
                        {file.currentStep}
                      </span>
                    </div>
                  </div>
                  
                  {file.error && (
                    <p className="mt-2 text-[9px] text-destructive font-bold uppercase bg-destructive/10 p-2 rounded">
                      {file.error}
                    </p>
                  )}
                </div>
              ))
            )}
            {files.length > 30 && (
              <p className="text-center text-[10px] text-muted-foreground py-2">
                ...and {files.length - 30} more
              </p>
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
             <span>Remaining</span>
             <span className="font-mono">{stats.remainingFiles} files</span>
          </div>
        </div>
      </div>
    </div>
  );
}