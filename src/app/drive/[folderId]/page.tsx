"use client";

import { useFirestore, useUser } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Folder, Upload, Loader2, ArrowLeft, Search, 
  Image as ImageIcon, HardDrive, Home, ChevronRight,
  CheckSquare, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { FolderCard } from '@/components/drive/FolderCard';
import { FileCard } from '@/components/drive/FileCard';
import { CreateFolderModal } from '@/components/drive/CreateFolderModal';
import { UploadModal } from '@/components/drive/UploadModal';
import { cn } from '@/lib/utils';
import { 
  createDriveFolder, 
  deleteDriveFolder, 
  renameDriveFolder,
  deleteDriveFile,
  refreshDriveUrls,
} from '@/app/actions/drive';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export default function DriveFolderPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const folderId = params?.folderId as string;

  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!user?.uid || !firestore || !folderId) return;
    setLoading(true);
    try {
      const rootRef = doc(firestore, 'users', user.uid, 'drive', 'root');
      const driveRef = collection(rootRef, 'folders');
      
      // Get current folder
      const folderDocRef = doc(firestore, 'users', user.uid, 'drive', 'root', 'folders', folderId);
      const folderSnap = await getDoc(folderDocRef);
      
      if (!folderSnap.exists()) {
        toast({ variant: 'destructive', title: 'Folder not found' });
        router.push('/drive');
        return;
      }
      
      const folderData = folderSnap.data();
      setFolderName(folderData.name || 'Folder');
      setParentId(folderData.parentId || null);

      // Get subfolders
      const subfoldersSnap = await getDocs(collection(folderDocRef, 'subfolders'));
      // Fallback: query all folders and filter
      const allFoldersSnap = await getDocs(driveRef);
      const subFolders = allFoldersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((f: any) => f.parentId === folderId);
      setFolders(subFolders);

      // Get files in this folder
      const filesRef = collection(rootRef, 'files');
      const filesSnap = await getDocs(filesRef);
      const filesData = filesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((f: any) => f.folderId === folderId);

      // Refresh URLs
      if (filesData.length > 0) {
        const keysToRefresh: string[] = [];
        filesData.forEach((f: any) => {
          if (f.storageKey) keysToRefresh.push(f.storageKey);
          if (f.thumbKey) keysToRefresh.push(f.thumbKey);
        });

        let urlMap: Record<string, string> = {};
        for (let i = 0; i < keysToRefresh.length; i += 200) {
          const batch = keysToRefresh.slice(i, i + 200);
          const result = await refreshDriveUrls(batch);
          if (result.success) Object.assign(urlMap, result.urls);
        }

        const refreshedFiles = filesData.map((f: any) => ({
          ...f,
          url: urlMap[f.storageKey] || f.url,
          thumbUrl: f.thumbKey ? (urlMap[f.thumbKey] || f.thumbUrl) : (urlMap[f.storageKey] || f.url),
        }));
        setFiles(refreshedFiles);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error('[FOLDER_LOAD]', err);
      toast({ variant: 'destructive', title: 'Failed to load folder' });
    } finally {
      setLoading(false);
    }
  }, [user?.uid, firestore, folderId, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadData();
  }, [user, authLoading, loadData, router]);

  const handleCreateFolder = async (name: string) => {
    if (!user?.uid) return;
    const result = await createDriveFolder({ userId: user.uid, name, parentId: folderId });
    if (result.success) {
      toast({ title: '✅ Folder created' });
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  const handleRenameFolder = async (id: string, currentName: string) => {
    const newName = prompt('New name:', currentName);
    if (!newName || newName === currentName || !user?.uid) return;
    const result = await renameDriveFolder({ userId: user.uid, folderId: id, newName });
    if (result.success) { toast({ title: '✅ Renamed' }); loadData(); }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!user?.uid) return;
    if (!confirm('Delete this folder and ALL its files?')) return;
    const result = await deleteDriveFolder({ userId: user.uid, folderId: id });
    if (result.success) { toast({ title: '✅ Deleted' }); loadData(); }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!user?.uid) return;
    if (!confirm('Delete this file?')) return;
    const result = await deleteDriveFile({ userId: user.uid, fileId });
    if (result.success) { toast({ title: '✅ Deleted' }); loadData(); }
  };

  const toggleFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
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

  if (authLoading || loading) {
    return <HafashLoader text="Loading folder..." />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <button onClick={() => router.push('/drive')} className="hover:text-primary transition-colors flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5" />
              Drive
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">{folderName}</span>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => parentId ? router.push(`/drive/${parentId}`) : router.push('/drive')}
                className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Folder className="w-6 h-6 text-primary" fill="currentColor" fillOpacity={0.2} />
                </div>
                <div>
                  <h1 className="text-3xl font-headline font-bold text-white">{folderName}</h1>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {folders.length} folders • {files.length} files
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSelectionMode ? (
                <>
                  <span className="text-sm font-bold text-primary">{selectedFiles.size} selected</span>
                  <Button variant="ghost" onClick={clearSelection} className="rounded-2xl h-12 px-6">Cancel</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setShowCreateFolder(true)} className="rounded-2xl h-12 px-6 border-white/10 font-bold gap-2">
                    <Folder className="w-4 h-4" />
                    New Folder
                  </Button>
                  <Button onClick={() => setShowUpload(true)} className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground font-bold gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-background/60 border-white/10"
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {filteredFolders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-headline font-bold text-white">Subfolders</h2>
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
              {!isSelectionMode && (
                <Button variant="ghost" size="sm" onClick={() => setIsSelectionMode(true)} className="text-primary rounded-xl">
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
                  onOpen={() => file.url && window.open(file.url, '_blank')}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <div className="text-center py-32 border-2 border-dashed border-white/10 rounded-[3rem] bg-card/20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Folder className="w-12 h-12 text-primary opacity-60" />
            </div>
            <h3 className="text-2xl font-headline font-bold text-white mb-2">
              {search ? 'Nothing found' : 'This folder is empty'}
            </h3>
            <p className="text-muted-foreground italic mb-8">
              {search ? 'Try a different search' : 'Upload files or create subfolders'}
            </p>
            {!search && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setShowCreateFolder(true)} className="rounded-2xl h-12 px-6 border-white/10 font-bold gap-2">
                  <Folder className="w-4 h-4" />
                  New Subfolder
                </Button>
                <Button onClick={() => setShowUpload(true)} className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground font-bold gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SELECTION BAR */}
      {isSelectionMode && selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-[70]">
          <div className="bg-primary text-primary-foreground rounded-2xl px-6 py-4 shadow-[0_20px_60px_rgba(212,175,55,0.5)] flex items-center gap-4">
            <span className="font-bold text-sm">{selectedFiles.size} files selected</span>
            <div className="h-6 w-px bg-primary-foreground/20" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast({ title: '🚧 Coming soon', description: 'Create Gallery from selection' })}
              className="text-primary-foreground hover:bg-primary-foreground/20 font-bold gap-2"
            >
              <Package className="w-4 h-4" />
              Create Gallery
            </Button>
          </div>
        </div>
      )}

      <CreateFolderModal open={showCreateFolder} onClose={() => setShowCreateFolder(false)} onCreate={handleCreateFolder} />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} userId={user.uid} folderId={folderId} onComplete={loadData} />
    </div>
  );
}