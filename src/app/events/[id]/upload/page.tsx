"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, collection, query, where } from 'firebase/firestore';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, X, Info, AlertTriangle, Activity, ShieldCheck, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type UploadStepStatus = 'queued' | 'uploading' | 'completed' | 'error';

interface FileItem {
  id: string;
  file: File;
  progress: number;
  name: string;
  status: UploadStepStatus;
  error?: string;
  currentStep: string;
}

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading: dataLoading } = useDoc(eventRef);

  // Fetch user profile for plan details
  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // Fetch all galleries to calculate current usage
  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: galleries } = useCollection(galleriesQuery);

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const currentUsageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsDone(false);
      const newFiles: FileItem[] = Array.from(e.target.files).map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        name: f.name,
        progress: 0,
        status: 'queued',
        currentStep: 'Step 1: File Selected'
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const startDemoUpload = async () => {
    if (!firestore || !user || !event) return;
    
    if (files.length === 0) {
      toast({ title: "No files selected" });
      return;
    }

    // Storage Limit Enforcement
    const pendingSizeGb = files.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024 * 1024);
    const totalPotentialUsage = currentUsageGb + pendingSizeGb;

    if (totalPotentialUsage > currentPlan.storageGb) {
      toast({
        variant: "destructive",
        title: "Storage Limit Reached",
        description: "Your pending upload exceeds your available storage. Please upgrade your plan to continue.",
      });
      return;
    }

    setIsUploading(true);
    const uploadedItems: any[] = [];
    const successfulFileIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      const fileId = fileItem.id;

      const updateStep = (status: UploadStepStatus, step: string, progress: number = 0) => {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status, currentStep: step, progress } : f));
      };

      // Step 2: Telemetry Check
      updateStep('uploading', 'Step 2: Processing Masterpiece', 30);
      await new Promise(r => setTimeout(r, 400));

      // Step 3: Optimization
      updateStep('uploading', 'Step 3: Optimizing for Web', 60);
      await new Promise(r => setTimeout(r, 400));

      // Step 4: Generating Secure URL (Demo Mode Logic)
      updateStep('uploading', 'Step 4: Finalizing Asset', 90);
      
      const previewUrl = `https://picsum.photos/seed/${fileId}/1600/1200`;
      const masterUrl = `https://picsum.photos/seed/${fileId}/4000/3000`; 
      
      uploadedItems.push({
        id: fileId,
        url: previewUrl,
        masterUrl: masterUrl,
        type: 'image',
        isFavorite: false,
        fileName: fileItem.name,
        fileSize: fileItem.file.size,
        createdAt: new Date().toISOString()
      });
      successfulFileIds.push(fileId);
      updateStep('uploading', 'Step 4: Done', 100);
    }

    const galleryRef = doc(firestore, 'galleries', id);
    const updateData = { items: arrayUnion(...uploadedItems) };

    updateDoc(galleryRef, updateData)
      .then(() => {
        setFiles(prev => prev.map(f => 
          successfulFileIds.includes(f.id) 
            ? { ...f, status: 'completed', currentStep: 'Step 5: Cloud Sync Complete' } 
            : f
        ));
        toast({ title: "Delivery Complete", description: `${uploadedItems.length} masterpieces delivered to cloud.` });
        setIsDone(true);
      })
      .catch(async (err: any) => {
        setFiles(prev => prev.map(f => 
          successfulFileIds.includes(f.id) 
            ? { ...f, status: 'error', error: `Cloud Sync Error: ${err.message}` } 
            : f
        ));
        
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: galleryRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground italic tracking-widest uppercase text-xs">Authenticating Session...</p>
      </div>
    );
  }

  if (!user || !event) return null;

  const pendingSizeGb = files.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024 * 1024);
  const isOverLimit = (currentUsageGb + pendingSizeGb) > currentPlan.storageGb;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Deliver: {event.title}</h1>
            <p className="text-muted-foreground">High-resolution delivery telemetry.</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 bg-card border border-border/50 px-4 py-2 rounded-xl">
          <HardDrive className="w-4 h-4 text-primary" />
          <div className="text-[10px] font-bold uppercase tracking-widest">
            <span className="text-muted-foreground">Quota: </span>
            <span className={isOverLimit ? "text-destructive" : "text-primary"}>
              {(currentUsageGb + pendingSizeGb).toFixed(2)} / {currentPlan.storageGb} GB
            </span>
          </div>
        </div>
      </div>

      {isOverLimit && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/50 bg-destructive/5 animate-pulse">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Storage Limit Exceeded</AlertTitle>
          <AlertDescription className="text-sm">
            This upload would put you over your {currentPlan.storageGb}GB limit. Please remove some files or 
            <Link href="/storage" className="ml-1 underline font-bold">upgrade your plan</Link>.
          </AlertDescription>
        </Alert>
      )}

      {!isOverLimit && (
        <Alert className="bg-primary/10 border-primary/20 rounded-2xl">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-bold text-primary">Studio Sync Service Active</AlertTitle>
          <AlertDescription className="text-primary/80">
            Your assets are being routed through the high-speed delivery pipeline. Master files will be synchronized upon completion.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className={cn(
            "relative h-80 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all",
            isOverLimit ? "border-destructive/30 bg-destructive/5 cursor-not-allowed" : "border-border/50 bg-card/30 group hover:border-primary/50 cursor-pointer"
          )}>
            <input 
              type="file" 
              multiple 
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              onChange={handleFileChange}
              disabled={isUploading || isOverLimit}
            />
            <div className={cn(
              "p-6 rounded-full mb-4 transition-transform",
              isOverLimit ? "bg-destructive/10" : "bg-primary/10 group-hover:scale-110"
            )}>
              <Upload className={cn("w-10 h-10", isOverLimit ? "text-destructive" : "text-primary")} />
            </div>
            <p className="text-lg font-headline font-bold">
              {isOverLimit ? "Limit Reached" : "Select Photos"}
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-mono italic">Studio Telemetry Active.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-4">
            {!isDone && (
              <Button variant="ghost" className="rounded-full px-8 h-12" onClick={() => setFiles([])} disabled={isUploading}>Clear Queue</Button>
            )}
            
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                className={cn(
                  "rounded-full px-10 h-12 font-bold shadow-lg flex-1 sm:flex-none min-w-[200px]",
                  isOverLimit ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                )}
                onClick={startDemoUpload}
                disabled={files.length === 0 || isUploading || isOverLimit}
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isUploading ? 'Finalizing...' : isDone ? 'Deliver More' : 'Deliver Gallery'}
              </Button>

              {isDone && (
                <Link href={`/events/${id}/manage`} className="flex-1 sm:flex-none">
                  <Button className="w-full rounded-full font-bold gap-2 px-10 h-12 bg-white text-black hover:bg-gray-100 shadow-xl animate-in fade-in slide-in-from-left-4 duration-500">
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 h-[500px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-headline font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Delivery Status
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold tracking-widest">{files.length} ITEMS</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-50">
                Waiting for selection...
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className={cn(
                  "bg-background/50 p-4 rounded-2xl border transition-all",
                  file.status === 'error' ? 'border-destructive/50' : 'border-border/30'
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold truncate">{file.name}</p>
                      <p className={cn(
                        "text-[10px] font-mono mt-1",
                        file.status === 'error' ? 'text-destructive' : 'text-primary'
                      )}>
                        {file.currentStep}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {file.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                      {file.status === 'error' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      {!isUploading && file.status === 'queued' && (
                        <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive">
                           <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <Progress value={file.progress} className={`h-1 rounded-full bg-border/30`} />
                  
                  {file.error && (
                    <p className="mt-2 text-[9px] text-destructive font-bold uppercase">
                      {file.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Encrypted Delivery Channel Active</span>
        </div>
      </div>
    </div>
  );
}
