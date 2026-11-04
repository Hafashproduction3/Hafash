"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { collection, query, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Loader2, Trash2, FolderPlus, UploadCloud, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { requestUploadUrl, refreshPhotoUrls } from "@/app/actions/storage";
import { updatePortfolioData } from "@/app/actions/admin-portfolio";

export default function AdminPortfolioManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const albumsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "portfolio_albums"));
  }, [firestore]);

  const { data: albums, loading } = useCollection(albumsQuery);

  const dataRef = firestore ? doc(firestore, "portfolio_data", "master") : null;
  const { data: basicData } = useDoc(dataRef);

  const [formData, setFormData] = useState({
    heroImage: "",
    aboutImage: "",
    bioText: "",
    whatsapp: "",
    instagram: "",
  });

  useEffect(() => {
    if (basicData) {
      setFormData({
        heroImage: basicData.heroImage || "",
        aboutImage: basicData.aboutImage || "",
        bioText: basicData.bioText || "",
        whatsapp: basicData.whatsapp || "",
        instagram: basicData.instagram || "",
      });
    }
  }, [basicData]);

  const handleSaveBasicInfo = async () => {
    const res = await updatePortfolioData(formData);
    if (res.success) toast({ title: "Basic Info Updated" });
    else toast({ variant: "destructive", title: "Error", description: res.error });
  };

  const handleCreateAlbum = async () => {
    if (!firestore || !newAlbumName) return;
    setIsCreating(true);
    try {
      await addDoc(collection(firestore, "portfolio_albums"), {
        name: newAlbumName,
        photos: [],
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Album Created", description: `${newAlbumName} category added.` });
      setNewAlbumName("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!firestore || !confirm("Delete this entire album?")) return;
    await deleteDoc(doc(firestore, "portfolio_albums", albumId));
    toast({ title: "Album Deleted" });
  };

  // ✅ Function to Refresh URLs of a specific album
  const refreshAlbumUrls = async (album: any) => {
    if (!album.photos || album.photos.length === 0) {
      setSelectedAlbum({ ...album, displayUrls: [] });
      return;
    }

    setRefreshing(true);
    try {
      // 🔍 DEBUG: Konsi keys database se aa rahi hain
      console.log("🔍 Album Photos (Keys):", album.photos);
      
      const res = await refreshPhotoUrls(album.photos);
      
      // 🔍 DEBUG: Kya URL generate hua
      console.log("🔍 Refreshed URLs:", res.urls);

      if (res.success) {
        const urls = album.photos.map((key: string) => res.urls[key] || '');
        setSelectedAlbum({ ...album, displayUrls: urls });
      }
    } catch (err) {
      console.error("Failed to refresh URLs", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectAlbum = (album: any) => {
    setSelectedAlbum(album);
    refreshAlbumUrls(album);
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !selectedAlbum || !firestore) return;

    setUploading(true);
    setUploadProgress(0);
    const newPhotoKeys: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { success, uploadUrl, key } = await requestUploadUrl({
          userId: user.uid,
          galleryId: "portfolio",
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });

        if (success && uploadUrl && key) {
          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          newPhotoKeys.push(key);
        }
      } catch (err) {
        console.error("Upload failed for", file.name);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    if (newPhotoKeys.length > 0) {
      const albumRef = doc(firestore, "portfolio_albums", selectedAlbum.id);
      const updatedPhotos = [...(selectedAlbum.photos || []), ...newPhotoKeys];
      
      await updateDoc(albumRef, { photos: updatedPhotos });
      
      toast({ title: "Upload Complete", description: `${newPhotoKeys.length} photos added.` });
      
      // Nayi photos ke sath urls refresh karein
      await refreshAlbumUrls({ ...selectedAlbum, photos: updatedPhotos });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeletePhoto = async (indexToDelete: number) => {
    if (!firestore || !selectedAlbum) return;
    
    const updatedPhotos = selectedAlbum.photos.filter((_: any, i: number) => i !== indexToDelete);
    
    await updateDoc(doc(firestore, "portfolio_albums", selectedAlbum.id), {
      photos: updatedPhotos
    });
    
    const updatedDisplayUrls = selectedAlbum.displayUrls.filter((_: any, i: number) => i !== indexToDelete);
    setSelectedAlbum({ ...selectedAlbum, photos: updatedPhotos, displayUrls: updatedDisplayUrls });
    toast({ title: "Photo Removed" });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="text-3xl font-headline font-bold text-white mb-1">Portfolio Manager</h1>
        <p className="text-muted-foreground text-sm">Manage your personal albums and bio.</p>
      </div>

      {/* Basic Info Section */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="font-bold text-primary uppercase tracking-widest text-xs">Basic Info & Hero</h3>
        <Textarea 
          placeholder="Bio..." 
          value={formData.bioText} 
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, bioText: e.target.value})} 
          className="h-20 bg-background border-border/50" 
        />
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="WhatsApp (e.g. 923001234567)" value={formData.whatsapp} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, whatsapp: e.target.value})} className="bg-background border-border/50" />
          <Input placeholder="Instagram URL" value={formData.instagram} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, instagram: e.target.value})} className="bg-background border-border/50" />
        </div>
        <Input placeholder="Hero Image URL" value={formData.heroImage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, heroImage: e.target.value})} className="bg-background border-border/50" />
        <Button onClick={handleSaveBasicInfo} className="bg-primary text-black font-bold">Save Basic Info</Button>
      </div>

      {/* Albums Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary uppercase tracking-widest text-xs">Portfolio Categories (Albums)</h3>
          <div className="flex gap-2">
            <Input placeholder="E.g., Barat, Walima..." value={newAlbumName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAlbumName(e.target.value)} className="w-64 bg-background border-border/50" />
            <Button onClick={handleCreateAlbum} disabled={isCreating || !newAlbumName} className="bg-primary text-black font-bold gap-2">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Add Album
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {albums?.map((album: any) => (
            <div 
              key={album.id} 
              className={`relative bg-card border rounded-2xl p-4 cursor-pointer transition-all ${selectedAlbum?.id === album.id ? 'border-primary ring-2 ring-primary/20' : 'border-border/50 hover:border-primary/50'}`}
              onClick={() => handleSelectAlbum(album)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white">{album.name}</h4>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }} className="text-destructive hover:bg-destructive/10 p-1 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{album.photos?.length || 0} Photos</p>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Album Photos */}
      {selectedAlbum && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-headline font-bold text-xl text-white">Album: {selectedAlbum.name}</h3>
            <div className="flex gap-2">
              <Button onClick={() => refreshAlbumUrls(selectedAlbum)} disabled={refreshing} variant="outline" className="border-border/50 text-white gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUploadPhotos} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-primary text-black font-bold gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {uploading ? `Uploading ${uploadProgress}%` : "Upload Photos"}
              </Button>
            </div>
          </div>

          {refreshing ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {selectedAlbum.displayUrls?.map((url: string, i: number) => (
                url && (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-border/30">
                    <img src={url} alt="Portfolio" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => handleDeletePhoto(i)}
                      className="absolute top-2 right-2 bg-destructive text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              ))}
            </div>
          )}

          {(!selectedAlbum.displayUrls || selectedAlbum.displayUrls.length === 0) && !refreshing && (
            <p className="text-center text-muted-foreground text-sm py-8 italic">No photos in this album yet.</p>
          )}
        </div>
      )}
    </div>
  );
}