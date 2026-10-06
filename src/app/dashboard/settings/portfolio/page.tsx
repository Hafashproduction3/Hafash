"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ArrowLeft, Upload, Loader2, Trash2, Pencil, X,
  CheckCircle2, Folder, Image as ImageIcon, Plus,
  Save, AlertTriangle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { HafashLoader } from "@/components/ui/hafash-loader";
import { requestUploadUrl, refreshPhotoUrls } from "@/app/actions/storage";
import { assignPhotoToFolder } from "@/app/actions/portfolio";

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params?.folderId as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folder, setFolder] = useState<any>(null);
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  const [folderPhotos, setFolderPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!firestore || !user || !folderId) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(firestore, "publicProfiles", user.uid));
        if (cancelled) return;

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();
        const folders: any[] = data.portfolioFolders || [];
        const found = folders.find((f: any) => f.id === folderId || f.slug === folderId);

        if (!found) {
          setLoading(false);
          return;
        }

        setFolder(found);
        setEditForm({ name: found.name || "", description: found.description || "" });

        // Load all photos
        const rawPhotos: any[] = data.portfolioPhotos || [];
        const keysToRefresh: string[] = [];
        rawPhotos.forEach((p: any) => {
          if (p.storageKey) keysToRefresh.push(p.storageKey);
          if (p.thumbKey) keysToRefresh.push(p.thumbKey);
        });

        let urlMap: Record<string, string> = {};
        if (keysToRefresh.length > 0) {
          try {
            const result = await refreshPhotoUrls(keysToRefresh);
            if (result.success) urlMap = result.urls;
          } catch {}
        }

        const refreshed = rawPhotos
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((p: any) => ({
            ...p,
            url: urlMap[p.storageKey] || p.url || '',
            thumbUrl: p.thumbKey
              ? (urlMap[p.thumbKey] || p.thumbUrl || p.url)
              : (urlMap[p.storageKey] || p.url || ''),
          }));

        setAllPhotos(refreshed);
        setFolderPhotos(refreshed.filter((p: any) => p.folderId === found.id));
      } catch (err) {
        console.error("[FOLDER_DETAIL]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firestore, user, folderId]);

  // ═══════════════════════════════════════════════════════════════
  // UPLOAD PHOTOS TO THIS FOLDER
  // ═══════════════════════════════════════════════════════════════

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !user || !firestore || !folder) return;

    const files = Array.from(e.target.files);
    const MAX_SIZE = 10 * 1024 * 1024;

    // Validate
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast({ variant: "destructive", title: `${file.name} — image nahi hai` });
        return;
      }
      if (file.size > MAX_SIZE) {
        toast({ variant: "destructive", title: `${file.name} — 10MB se bara` });
        return;
      }
    }

    if (allPhotos.length + files.length > 50) {
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: `Max 50 portfolio photos. Aapke paas ${allPhotos.length} hain.`,
      });
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const profileRef = doc(firestore, "publicProfiles", user.uid);
      const snap = await getDoc(profileRef);
      const existing: any[] = snap.data()?.portfolioPhotos || [];

      const newlyUploaded: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        try {
          // 1. Get presigned URL
          const uploadResult = await requestUploadUrl({
            userId: user.uid,
            galleryId: "portfolio",
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          });

          if (!uploadResult.success || !uploadResult.uploadUrl) {
            throw new Error(uploadResult.error || "Upload URL failed");
          }

          // 2. Upload to R2
          const xhr = new XMLHttpRequest();
          await new Promise<void>((resolve, reject) => {
            xhr.open("PUT", uploadResult.uploadUrl!);
            xhr.setRequestHeader("Content-Type", file.type);
            xhr.onload = () =>
              xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new Error(`R2: ${xhr.status}`));
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(file);
          });

          // 3. Save photo metadata with folderId
          const photoId = Math.random().toString(36).substring(2, 11);
          const newPhoto = {
            id: photoId,
            url: "",
            thumbUrl: "",
            storageKey: uploadResult.key!,
            thumbKey: "",
            caption: "",
            folderId: folder.id,     // 🆕 Direct folder assign
            order: existing.length + newlyUploaded.length,
            uploadedAt: new Date().toISOString(),
          };

          newlyUploaded.push(newPhoto);

          // Preview URL
          try {
            const urlResult = await refreshPhotoUrls([uploadResult.key!]);
            if (urlResult.success && urlResult.urls[uploadResult.key!]) {
              newPhoto.url = urlResult.urls[uploadResult.key!];
              newPhoto.thumbUrl = urlResult.urls[uploadResult.key!];
            }
          } catch {}
        } catch (err: any) {
          console.error(`[UPLOAD ${file.name}]`, err);
          toast({
            variant: "destructive",
            title: `${file.name} fail`,
            description: err.message,
          });
        }
      }

      if (newlyUploaded.length > 0) {
        // Save all photos to Firestore
        const updatedPhotos = [...existing, ...newlyUploaded];
        await updateDoc(profileRef, {
          portfolioPhotos: updatedPhotos,
          updatedAt: new Date().toISOString(),
        });

        // Update folder photoCount
        const folders: any[] = snap.data()?.portfolioFolders || [];
        const updatedFolders = folders.map((f: any) => {
          if (f.id === folder.id) {
            return { ...f, photoCount: updatedPhotos.filter((p: any) => p.folderId === f.id).length };
          }
          return f;
        });
        await updateDoc(profileRef, { portfolioFolders: updatedFolders });

        // Update state
        setAllPhotos(updatedPhotos);
        setFolderPhotos(updatedPhotos.filter((p: any) => p.folderId === folder.id));

        toast({
          title: `✅ ${newlyUploaded.length} photo(s) upload ho gayi`,
          description: `"${folder.name}" mein add ho gayi`,
        });
      }
    } catch (err: any) {
      console.error("[UPLOAD_BATCH]", err);
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // REMOVE PHOTO FROM FOLDER (unassign, not delete)
  // ═══════════════════════════════════════════════════════════════

  const handleRemoveFromFolder = async (photoId: string) => {
    if (!user || !firestore) return;
    if (!confirm("Yeh photo folder se hat jayegi (delete nahi hogi). Continue?")) return;

    try {
      const result = await assignPhotoToFolder(user.uid, photoId, null);
      if (!result.success) throw new Error(result.error);

      setAllPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, folderId: null } : p))
      );
      setFolderPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast({ title: "Photo folder se hata di" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // EDIT FOLDER
  // ═══════════════════════════════════════════════════════════════

  const handleSaveEdit = async () => {
    if (!user || !firestore || !folder) return;
    if (!editForm.name.trim()) {
      toast({ variant: "destructive", title: "Folder name zaroori hai" });
      return;
    }

    setSavingEdit(true);
    try {
      const profileRef = doc(firestore, "publicProfiles", user.uid);
      const snap = await getDoc(profileRef);
      const folders: any[] = snap.data()?.portfolioFolders || [];

      const updatedFolders = folders.map((f: any) => {
        if (f.id !== folder.id) return f;
        const name = editForm.name.trim();
        return {
          ...f,
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          description: editForm.description.trim(),
          updatedAt: new Date().toISOString(),
        };
      });

      await updateDoc(profileRef, {
        portfolioFolders: updatedFolders,
        updatedAt: new Date().toISOString(),
      });

      const updated = updatedFolders.find((f: any) => f.id === folder.id);
      setFolder(updated);
      setShowEditModal(false);
      toast({ title: "✅ Folder update ho gaya" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DELETE FOLDER
  // ═══════════════════════════════════════════════════════════════

  const handleDeleteFolder = async () => {
    if (!user || !firestore || !folder) return;
    if (!confirm(`"${folder.name}" folder delete karein? Photos "All Photos" mein chali jayengi.`)) return;

    try {
      const profileRef = doc(firestore, "publicProfiles", user.uid);
      const snap = await getDoc(profileRef);
      const folders: any[] = snap.data()?.portfolioFolders || [];
      const photos: any[] = snap.data()?.portfolioPhotos || [];

      const updatedFolders = folders
        .filter((f: any) => f.id !== folder.id)
        .map((f: any, idx: number) => ({ ...f, order: idx }));

      const updatedPhotos = photos.map((p: any) =>
        p.folderId === folder.id ? { ...p, folderId: null } : p
      );

      await updateDoc(profileRef, {
        portfolioFolders: updatedFolders,
        portfolioPhotos: updatedPhotos,
        updatedAt: new Date().toISOString(),
      });

      toast({ title: "Folder delete ho gaya" });
      router.push("/dashboard/settings?tab=portfolio");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  if (loading) return <HafashLoader text="Loading folder..." />;

  if (!folder) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="rounded-[2rem] max-w-md w-full">
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Folder className="w-10 h-10 text-primary opacity-60" />
            </div>
            <h2 className="text-2xl font-headline font-bold">Folder Nahi Mila</h2>
            <p className="text-sm text-muted-foreground">
              Yeh folder exist nahi karta ya delete ho gaya.
            </p>
            <Link href="/dashboard/settings?tab=portfolio">
              <Button className="rounded-xl gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap border-b border-border/50 pb-8">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={() => router.push("/dashboard/settings?tab=portfolio")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-headline font-bold">{folder.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {folder.description || `${folderPhotos.length} photo${folderPhotos.length === 1 ? "" : "s"} is folder mein`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowEditModal(true)}
            className="rounded-xl gap-2 h-12"
          >
            <Pencil className="w-4 h-4" />
            Edit Folder
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteFolder}
            className="rounded-xl gap-2 h-12 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="bg-card/40 border-border/50 rounded-[2rem] overflow-hidden">
        <CardContent className="p-8 lg:p-10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />

          {/* Guidance */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3 mb-6">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">💡 Is folder mein photos upload karein</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Photos automatically <strong>"{folder.name}"</strong> folder mein assign ho jayengi.
                Multiple photos ek saath select kar sakte hain (max 50 total, 10MB per photo).
              </p>
            </div>
          </div>

          {uploading ? (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <p className="font-bold text-lg">
                  Uploading... {uploadProgress.current} / {uploadProgress.total}
                </p>
                <div className="w-64 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border/40 rounded-2xl hover:border-primary/50 transition-all">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-xl mb-2">Upload Photos</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                Click karein ya photos drag karein. Multiple photos select kar sakte hain.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl gap-2 h-12 px-8 font-bold"
              >
                <Plus className="w-4 h-4" />
                Select Photos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-headline font-bold">Photos in "{folder.name}"</h2>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest">
            {folderPhotos.length} {folderPhotos.length === 1 ? "Photo" : "Photos"}
          </Badge>
        </div>

        {folderPhotos.length === 0 ? (
          <Card className="bg-card/40 border-border/50 rounded-[2rem]">
            <CardContent className="p-16 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ImageIcon className="w-10 h-10 text-primary opacity-60" />
              </div>
              <h3 className="font-headline font-bold text-xl">Abhi Koi Photo Nahi</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Upar "Select Photos" button dabayein aur is folder mein photos upload karein.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folderPhotos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-border/30">
                {photo.thumbUrl || photo.url ? (
                  <img
                    src={photo.thumbUrl || photo.url}
                    alt={photo.caption || "Portfolio"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="destructive"
                    className="rounded-full h-11 w-11"
                    onClick={() => handleRemoveFromFolder(photo.id)}
                    title="Remove from folder"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* EDIT FOLDER MODAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-[2rem]">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Pencil className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-2xl">Edit Folder</h2>
                    <p className="text-xs text-muted-foreground">Folder details update karein</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Folder Name *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Mehndi, Barat, Walima"
                    className="h-12 rounded-xl"
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Client ko yeh description dikhegi..."
                    className="rounded-xl min-h-[80px]"
                    maxLength={150}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editForm.name.trim()}
                  className="flex-1 rounded-xl gap-2 font-bold h-12"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}