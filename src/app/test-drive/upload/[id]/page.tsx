
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft as ArrowLeftIcon, 
  Loader2, 
  Sparkles, 
  X, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  HardDrive, 
  FileIcon,
  ImageIcon,
  RefreshCw,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HafashLoader } from '@/components/ui/hafash-loader';

type UploadStepStatus = 'queued' | 'uploading' | 'syncing' | 'completed' | 'error' | 'cancelled';

interface FileItem {
  id: string;
  file: File;
  progress: number;
  name: string;
  size: number;
  status: UploadStepStatus;
  error?: string;
  currentStep: string;
  speed: number;
  eta: number;
  previewUrl?: string;
}

export default function TestDriveUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { events, addItems } = useStore();
  const { toast } = useToast();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const event = useMemo(() => events.find(e => e.id === id), [events, id]);

  const updateFileStatus = (fileId: string, updates: Partial<FileItem>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
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
          status: 'queued',
          currentStep: 'In Queue',
          speed: 0,
          eta: 0,
          previewUrl: isImage ? URL.createObjectURL(f) : undefined
        };
      });

      setFiles(prev => [...prev, ...newItems]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter(f => f.id !== fileId);
    });
  };

  const startUpload = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    
    // Simulate sequential upload pipeline
    for (const item of files) {
      if (item.status === 'completed' || item.status === 'cancelled') continue;

      try {
        updateFileStatus(item.id, { status: 'uploading', currentStep: 'Requesting Access...' });
        await new Promise(r => setTimeout(r, 400));

        updateFileStatus(item.id, { currentStep: 'Transferring...' });
        
        // Progress simulation
        for (let p = 0; p <= 100; p += 20) {
          updateFileStatus(item.id, { progress: p, speed: 5000000, eta: (100 - p) / 10 });
          await new Promise(r => setTimeout(r, 150));
        }

        updateFileStatus(item.id, { status: 'syncing', currentStep: 'Finalizing...' });
        await new Promise(r => setTimeout(r, 300));

        const newItem = {
          id: item.id,
          url: item.previewUrl || `https://picsum.photos/seed/${item.id}/1200/1600`,
          type: 'image' as const,
          isFavorite: false,
          fileName: item.name,
          fileSize: item.size,
          uploadedAt: new Date().toISOString()
        };

        addItems(id, [newItem]);
        updateFileStatus(item.id, { status: 'completed', progress: 100, currentStep: 'Asset Verified' });

      } catch (err: any) {
        updateFileStatus(item.id, { status: 'error', error: "Simulation failure", currentStep: 'Failed' });
      }
    }

    setIsUploading(false);
    setIsDone(true);
    toast({ title: "Sequence Completed", description: "Test storage pipeline processing finished." });
  };

  const stats = useMemo(() => {
    const totalFiles = files.length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const uploadedBytes = files.reduce((acc, f) => acc + (f.size * (f.progress / 100)), 0);
    const avgProgress = totalFiles > 0 ? (uploadedBytes / totalSize) * 100 : 0;
    
    return {
      totalFiles,
      completedFiles,
      avgProgress,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1) + " MB",
      uploadedSize: (uploadedBytes / (1024 * 1024)).toFixed(1) + " MB",
    };
  }, [files]);

  if (!isHydrated) {
    return <HafashLoader text="Preparing Test Pipeline..." />;
  }

  if (!event) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/10 transition-colors" onClick={() => router.push(`/test-drive/manage/${id}`)}>
            <ArrowLeftIcon className="w-6 h-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Sequential Delivery Hub</span>
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{event.category}</span>
            </div>
            <h1 className="text-4xl font-headline font-bold text-white">{event.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end gap-1 px-6 py-2 border-r border-border/50">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Test Quota</span>
              <div className="flex items-center gap-2">
                 <HardDrive className="w-3.5 h-3.5 text-primary" />
                 <span className="text-xs font-bold font-mono text-foreground">
                   {stats.totalSize} / 50 GB
                 </span>
              </div>
           </div>
           <Link href={`/test-drive/gallery/${event.id}`} target="_blank">
             <Button variant="outline" className="rounded-xl border-border/50 font-bold gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white">
               Public View <ArrowRight className="w-4 h-4" />
             </Button>
           </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className={cn(
            "relative h-96 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all duration-500 shadow-2xl bg-card/30 group hover:border-primary/50 cursor-pointer"
          )}>
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className={cn(
              "p-8 rounded-full mb-6 transition-all duration-500 ring-8 bg-primary/10 ring-primary/5 group-hover:scale-110"
            )}>
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-headline font-bold text-white">Deliver Masterpieces</p>
              <p className="text-sm text-muted-foreground font-medium italic">Drop test photos here or click to browse.</p>
            </div>
            
            <div className="absolute bottom-8 flex items-center gap-3 px-6 py-2 rounded-full bg-background/50 backdrop-blur-md border border-border/50">
               <Zap className="w-3 h-3 text-primary animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Direct Delivery Channel Active</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
            <div className="flex items-center gap-4">
               {files.length > 0 && !isDone && !isUploading && (
                 <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive px-6" onClick={() => setFiles([])}>
                   Purge Queue
                 </Button>
               )}
            </div>
            
            <div className="flex gap-4 w-full sm:w-auto">
              <Button 
                className={cn(
                  "rounded-2xl px-12 h-14 font-bold shadow-2xl flex-1 sm:flex-none min-w-[240px] text-lg transition-all",
                  isUploading ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:scale-[1.02]"
                )}
                onClick={startUpload}
                disabled={files.length === 0 || isUploading}
              >
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : isDone ? <RefreshCw className="w-5 h-5 mr-3" /> : <Sparkles className="w-6 h-6 mr-3" />}
                {isUploading ? 'Synchronizing...' : isDone ? 'Deliver More' : 'Begin Cloud Delivery'}
              </Button>

              {isDone && !isUploading && (
                <Link href={`/test-drive/manage/${id}`} className="flex-1 sm:flex-none">
                  <Button className="w-full rounded-2xl font-bold gap-3 px-10 h-14 bg-white text-black hover:bg-gray-100 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                    Continue to Event
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2.5rem] p-8 h-[650px] flex flex-col shadow-2xl luxury-card-hover overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold flex items-center gap-3 text-white">
              <Activity className="w-6 h-6 text-primary" /> Active Pipeline
            </h3>
            <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-[10px] font-bold tracking-widest">{files.length} ASSETS</Badge>
          </div>
          
          {files.length > 0 && isUploading && (
            <div className="mb-6 p-5 bg-background/50 rounded-2xl border border-border/30 space-y-4 animate-in fade-in zoom-in-95 duration-500">
               <div className="flex justify-between items-end text-white">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall Progress</p>
                    <p className="text-2xl font-headline font-bold text-primary">{Math.round(stats.avgProgress)}%</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="text-xs font-bold uppercase tracking-tighter">
                      {stats.completedFiles} / {stats.totalFiles} Ready
                    </p>
                  </div>
               </div>
               <Progress value={stats.avgProgress} className="h-1.5 bg-primary/10" indicatorClassName="bg-primary" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-30 text-center px-10">
                <FileIcon className="w-12 h-12 mb-4 mx-auto opacity-10" />
                Waiting for studio asset selection...
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className={cn(
                  "bg-background/40 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                  file.status === 'error' ? 'border-destructive/30 bg-destructive/5' : 
                  file.status === 'completed' ? 'border-green-500/20 bg-green-500/5' : 'border-border/30'
                )}>
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500" 
                    style={{ width: `${file.progress}%` }}
                  />
                  
                  <div className="flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/30 shadow-inner">
                      {file.previewUrl ? (
                        <img src={file.previewUrl} className="h-full w-full object-cover" alt="Thumb" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/5">
                          <FileIcon className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start text-white">
                         <p className="text-xs font-bold truncate pr-2" title={file.name}>{file.name}</p>
                         {file.status === 'completed' ? (
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                         ) : (file.status === 'uploading' || file.status === 'syncing') ? (
                           <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                         ) : file.status === 'error' ? (
                           <AlertTriangle className="w-4 h-4 text-destructive" />
                         ) : (
                           <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Queued</span>
                         )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3">
                           <span className={cn(
                             "text-[9px] font-bold uppercase tracking-tighter",
                             file.status === 'error' ? 'text-destructive' : 
                             file.status === 'completed' ? 'text-green-500' : 'text-primary'
                           )}>
                             {file.currentStep}
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           {!isUploading && file.status === 'queued' && (
                             <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                               <X className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/20 flex flex-col gap-4 text-white">
             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> Remaining Batch</span>
                <span className="font-mono">{files.length - stats.completedFiles} files</span>
             </div>
             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><HardDrive className="w-3 h-3" /> Total Transfer</span>
                <span className="font-mono text-primary">{stats.uploadedSize} / {stats.totalSize}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
