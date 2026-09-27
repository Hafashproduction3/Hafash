"use client";

import { useFirestore, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Folder, Upload, ArrowLeft, Search, 
  Image as ImageIcon, HardDrive, 
  CheckSquare, Package, Trash2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { StorageBar } from '@/components/drive/StorageBar';
import { FolderCard } from '@/components/drive/FolderCard';
import { FileCard } from '@/components/drive/FileCard';
import { CreateFolderModal } from '@/components/drive/CreateFolderModal';
import { UploadModal } from '@/components/drive/UploadModal';
import { CreateGalleryFromDriveModal } from '@/components/drive/CreateGalleryFromDriveModal';
import { 
  createDriveFolder, 
  renameDriveFolder,
  refreshDriveUrls,
  cleanupDriveR2Files,
} from '@/app/actions/drive';
import { 
  collection, 
  getDocs, 
  getDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';

// ✅ CLIENT-SIDE storage stats (no adminDb needed)
async function calculateDriveStats(userId: string, firestore: any) {
  try {
    let driveBytes = 0;
    const driveStorageKeys = new Set<string>();

    // ✅ Drive files
    try {
      const driveFilesRef = collection(firestore, 'users', userId, 'drive', 'root', 'files');
      const driveSnap = await getDocs(driveFilesRef);
      driveSnap.docs.forEach(d => {
        const data = d.data();
        driveBytes += Number(data.fileSize) || 0;
        if (data.storageKey) driveStorageKeys.add(data.storageKey);
      });
    } catch (e) {
      console.error('[STATS] Drive files failed:', e);
    }

    // ✅ Gallery files (from photoCount — no photo reads)
    let galleryBytes = 0;
    try {
      const galleriesRef = collection(firestore, 'galleries');
      const galleriesQuery = query(galleriesRef, where('userId', '==', userId));
      const galleriesSnap = await getDocs(galleriesQuery);
      galleriesSnap.docs.forEach(gDoc => {
        const data = gDoc.data();
        const photoCount = Number(data.photoCount) || 0;
        galleryBytes += photoCount * 6.5 * 1024 * 1024;
      });
    } catch (e) {
      console.error('[STATS] Galleries failed:', e);
    }

    // ✅ Plan info (client-side read)
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};
    const planId = userData.planId;
    const userEmail = userData.email;

    const { getUserPlan } = await import('@/lib/plans');
    const plan = getUserPlan(planId, userEmail);
    const totalGb = plan.storageGb || 0;

    const driveUsedGb = driveBytes / (1024 ** 3);
    const galleryUsedGb = galleryBytes / (1024 ** 3);

    return {
      usedGb: driveUsedGb + galleryUsedGb,
      totalGb,
      driveUsedGb,
      galleryUsedGb,
      planName: plan.name || 'No Plan',
    };
  } catch (err) {
    console.error('[STATS] FATAL:', err);
    return { usedGb: 0, totalGb: 0, driveUsedGb: 0, galleryUsedGb: 0, planName: 'No Plan' };
  }
}

export default function DrivePage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    usedGb: 0,
    totalGb: 0,
    driveUsedGb: 0,
    galleryUsedGb: 0,
    planName: 'No Plan',
  });
  const [search, setSearch] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateGallery, setShowCreateGallery] = useState(false);

  // ✅ FAST loadData — parallel loading + background refresh
  const loadData = useCallback(async (showLoader = false) => {
    if (!user?.uid || !firestore) return;
    if (showLoader) setLoading(true);
    
    try {
      // ✅ STEP 1: Parallel fetch folders + files
      const foldersRef = collection(firestore, 'users', user.uid, 'drive', 'root', 'folders');
      const filesRef = collection(firestore, 'users', user.uid, 'drive', 'root', 'files');

      const [foldersSnap, filesSnap] = await Promise.all([
        getDocs(foldersRef),
        getDocs(filesRef),
      ]);

      const foldersData = foldersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((f: any) => !f.parentId);
      
      const filesData = filesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((f: any) => !f.folderId);

      // ✅ STEP 2: Show UI immediately
      setFolders(foldersData);
      setFiles(filesData);
      setLoading(false);
      setInitialLoadDone(true);

      // ✅ STEP 3: Stats — CLIENT-SIDE
      if (showLoader) {
        calculateDriveStats(user.uid, firestore)
          .then(statsResult => setStats(statsResult))
          .catch(e => console.error('[DRIVE_LOAD] Stats failed:', e));
      }

      // ✅ STEP 4: Refresh URLs in background
      if (filesData.length > 0) {
        const keysToRefresh: string[] = [];
        filesData.forEach((f: any) => {
          if (f.storageKey) keysToRefresh.push(f.storageKey);
          if (f.thumbKey) keysToRefresh.push(f.thumbKey);
        });

        const urlMap: Record<string, string> = {};
        for (let i = 0; i < keysToRefresh.length; i += 200) {
          const batch = keysToRefresh.slice(i, i + 200);
          try {
            const result = await refreshDriveUrls(batch);
            if (result.success) Object.assign(urlMap, result.urls);
          } catch (e) {
            console.error('[REFRESH_DRIVE]', e);
          }
        }

        setFiles(prev => prev.map((f: any) => ({
          ...f,
          url: urlMap[f.storageKey] || f.url,
          thumbUrl: f.thumbKey ? (urlMap[f.thumbKey] || f.thumbUrl) : (urlMap[f.storageKey] || f.url),
        })));
      }
    } catch (err) {
      console.error('[DRIVE_LOAD]', err);
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [user?.uid, firestore]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadData(!initialLoadDone);
  }, [user, authLoading, initialLoadDone]);

  // ✅ Create Folder
  const handleCreateFolder = async (name: string) => {
    if (!user?.uid) return;
    const result = await createDriveFolder({ userId: user.uid, name, parentId: null });
    if (result.success) {
      toast({ title: '✅ Folder created' });
      loadData(false);
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  // ✅ Rename Folder
  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const newName = prompt('New name:', currentName);
    if (!newName || newName === currentName || !user?.uid) return;
    
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    
    const result = await renameDriveFolder({ userId: user.uid, folderId, newName });
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
      loadData(false);
    } else {
      toast({ title: '✅ Renamed' });
    }
  };

  // ✅ DELETE FILE — INSTANT
  const handleDeleteFile = async (fileId: string) => {
    if (!user?.uid || !firestore) return;
    if (!confirm('Delete this file permanently?')) return;

    const fileToDelete = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));

    if (fileToDelete?.fileSize) {
      const sizeGb = fileToDelete.fileSize / (1024 ** 3);
      setStats((prev: any) => ({
        ...prev,
        usedGb: Math.max(prev.usedGb - sizeGb, 0),
        driveUsedGb: Math.max(prev.driveUsedGb - sizeGb, 0),
      }));
    }

    try {
      const fileRef = doc(firestore, 'users', user.uid, 'drive', 'root', 'files', fileId);
      
      const keys: string[] = [];
      if (fileToDelete?.storageKey) keys.push(fileToDelete.storageKey);
      if (fileToDelete?.thumbKey) keys.push(fileToDelete.thumbKey);
      const folderId = fileToDelete?.folderId;

      await deleteDoc(fileRef);

      if (folderId) {
        try {
          const folderRef = doc(firestore, 'users', user.uid, 'drive', 'root', 'folders', folderId);
          const folderSnap = await getDoc(folderRef);
          if (folderSnap.exists()) {
            const currentCount = folderSnap.data().fileCount || 0;
            await updateDoc(folderRef, {
              fileCount: Math.max(currentCount - 1, 0),
            });
          }
        } catch (e) {
          console.error('[FOLDER_COUNT]', e);
        }
      }

      if (keys.length > 0) {
        cleanupDriveR2Files({ userId: user.uid, keys }).catch(e => 
          console.error('[R2_CLEANUP]', e)
        );
      }

      toast({ title: '✅ File deleted' });
    } catch (err: any) {
      console.error('[DELETE_FILE]', err);
      toast({ 
        variant: 'destructive', 
        title: 'Delete Failed', 
        description: err.message 
      });
      loadData(false);
    }
  };

  // ✅ DELETE FOLDER — INSTANT
  const handleDeleteFolder = async (folderId: string) => {
    if (!user?.uid || !firestore) return;
    if (!confirm('Delete this folder and ALL its files?')) return;

    setFolders(prev => prev.filter(f => f.id !== folderId));

    try {
      const filesRef = collection(firestore, 'users', user.uid, 'drive', 'root', 'files');
      const filesQuery = query(filesRef, where('folderId', '==', folderId));
      const filesSnap = await getDocs(filesQuery);

      const keys: string[] = [];
      filesSnap.docs.forEach(d => {
        const data = d.data();
        if (data.storageKey) keys.push(data.storageKey);
        if (data.thumbKey) keys.push(data.thumbKey);
      });

      await deleteDoc(doc(firestore, 'users', user.uid, 'drive', 'root', 'folders', folderId));
      await Promise.all(filesSnap.docs.map(d => deleteDoc(d.ref)));

      if (keys.length > 0) {
        cleanupDriveR2Files({ userId: user.uid, keys }).catch(e => 
          console.error('[R2_CLEANUP]', e)
        );
      }

      toast({ title: '✅ Folder deleted' });
    } catch (err: any) {
      console.error('[DELETE_FOLDER]', err);
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
      loadData(false);
    }
  };

  // ✅ MULTI-DELETE
  const handleDeleteSelected = async () => {
    if (!user?.uid || !firestore || selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} selected files permanently?`)) return;

    setIsDeleting(true);
    const fileIds = Array.from(selectedFiles);

    const filesToDelete = files.filter(f => fileIds.includes(f.id));
    setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));

    const totalSize = filesToDelete.reduce((sum, f) => sum + (f.fileSize || 0), 0);
    const sizeGb = totalSize / (1024 ** 3);
    setStats((prev: any) => ({
      ...prev,
      usedGb: Math.max(prev.usedGb - sizeGb, 0),
      driveUsedGb: Math.max(prev.driveUsedGb - sizeGb, 0),
    }));

    setSelectedFiles(new Set());
    setIsSelectionMode(false);

    try {
      const allKeys: string[] = [];
      const folderCounts: Record<string, number> = {};

      for (const file of filesToDelete) {
        try {
          const fileRef = doc(firestore, 'users', user.uid, 'drive', 'root', 'files', file.id);
          await deleteDoc(fileRef);

          if (file.storageKey) allKeys.push(file.storageKey);
          if (file.thumbKey) allKeys.push(file.thumbKey);
          
          if (file.folderId) {
            folderCounts[file.folderId] = (folderCounts[file.folderId] || 0) + 1;
          }
        } catch (e) {
          console.error('[MULTI_DELETE]', file.id, e);
        }
      }

      for (const [folderId, count] of Object.entries(folderCounts)) {
        try {
          const folderRef = doc(firestore, 'users', user.uid, 'drive', 'root', 'folders', folderId);
          const folderSnap = await getDoc(folderRef);
          if (folderSnap.exists()) {
            const currentCount = folderSnap.data().fileCount || 0;
            await updateDoc(folderRef, {
              fileCount: Math.max(currentCount - count, 0),
            });
          }
        } catch (e) {}
      }

      if (allKeys.length > 0) {
        cleanupDriveR2Files({ userId: user.uid, keys: allKeys }).catch(e => 
          console.error('[R2_CLEANUP]', e)
        );
      }

      toast({ 
        title: `✅ ${filesToDelete.length} files deleted`,
        description: 'R2 cleanup in progress...'
      });
    } catch (err: any) {
      console.error('[MULTI_DELETE]', err);
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
      loadData(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
    setIsSelectionMode(false);
  };

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files;
    const s = search.toLowerCase();
    return files.filter(f => f.fileName?.toLowerCase().includes(s));
  }, [files, search]);

  const filteredFolders = useMemo(() => {
    if (!search.trim()) return folders;
    const s = search.toLowerCase();
    return folders.filter(f => f.name?.toLowerCase().includes(s));
  }, [folders, search]);

  if (authLoading || (loading && !initialLoadDone)) {
    return <HafashLoader text="Loading Hafash Drive..." />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
                className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-headline font-bold text-white">Hafash Drive</h1>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    My Drive
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSelectionMode ? (
                <>
                  <span className="text-sm font-bold text-primary">
                    {selectedFiles.size} selected
                  </span>
                  <Button
                    variant="ghost"
                    onClick={clearSelection}
                    className="rounded-2xl h-12 px-6"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateFolder(true)}
                    className="rounded-2xl h-12 px-6 border-white/10 font-bold gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    New Folder
                  </Button>
                  <Button
                    onClick={() => setShowUpload(true)}
                    className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground font-bold gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-background/60 border-white/10"
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <StorageBar
          usedGb={stats.usedGb}
          totalGb={stats.totalGb}
          driveUsedGb={stats.driveUsedGb}
          galleryUsedGb={stats.galleryUsedGb}
          planName={stats.planName}
        />

        {filteredFolders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-headline font-bold text-white">Folders</h2>
              <span className="text-xs font-bold text-muted-foreground">({filteredFolders.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onOpen={() => router.push(`/drive/${folder.id}`)}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                />
              ))}
            </div>
          </div>
        )}

        {filteredFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-headline font-bold text-white">Files</h2>
                <span className="text-xs font-bold text-muted-foreground">({filteredFiles.length})</span>
              </div>
              {!isSelectionMode && filteredFiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="text-primary rounded-xl"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedFiles.has(file.id)}
                  onToggleSelect={() => toggleFile(file.id)}
                  onOpen={() => { if (file.url) window.open(file.url, '_blank'); }}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>
          </div>
        )}

        {initialLoadDone && !loading && filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <div className="text-center py-32 border-2 border-dashed border-white/10 rounded-[3rem] bg-card/20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <HardDrive className="w-12 h-12 text-primary opacity-60" />
            </div>
            <h3 className="text-2xl font-headline font-bold text-white mb-2">
              {search ? 'Nothing found' : 'Your Drive is empty'}
            </h3>
            <p className="text-muted-foreground italic mb-8">
              {search ? 'Try a different search' : 'Create a folder or upload files to get started'}
            </p>
            {!search && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateFolder(true)}
                  className="rounded-2xl h-12 px-6 border-white/10 font-bold gap-2"
                >
                  <Folder className="w-4 h-4" />
                  Create Folder
                </Button>
                <Button
                  onClick={() => setShowUpload(true)}
                  className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground font-bold gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FLOATING SELECTION BAR */}
      {isSelectionMode && selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-[70]">
          <div className="bg-primary text-primary-foreground rounded-2xl px-6 py-4 shadow-[0_20px_60px_rgba(212,175,55,0.5)] flex items-center gap-3 flex-wrap">
            <span className="font-bold text-sm">{selectedFiles.size} selected</span>
            <div className="h-6 w-px bg-primary-foreground/20" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-primary-foreground hover:bg-primary-foreground/20 font-bold"
            >
              {selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateGallery(true)}
              className="text-primary-foreground hover:bg-primary-foreground/20 font-bold gap-2"
            >
              <Package className="w-4 h-4" />
              Create Gallery
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="text-white bg-red-500/30 hover:bg-red-500/50 font-bold gap-2 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedFiles.size})
            </Button>
          </div>
        </div>
      )}

      {/* MODALS */}
      <CreateFolderModal
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
      />

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        userId={user.uid}
        folderId={null}
        onComplete={() => loadData(false)}
      />

      <CreateGalleryFromDriveModal
        open={showCreateGallery}
        onClose={() => setShowCreateGallery(false)}
        userId={user.uid}
        fileIds={Array.from(selectedFiles)}
        onSuccess={(galleryId, slug) => {
          toast({ 
            title: '✅ Gallery created!', 
            description: 'Opening gallery in new tab...'
          });
          setSelectedFiles(new Set());
          setIsSelectionMode(false);
          setTimeout(() => {
            window.open(`/gallery/${slug}`, '_blank');
          }, 1000);
        }}
      />
    </div>
  );
}