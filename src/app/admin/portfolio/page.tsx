"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { collection, query, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Loader2, Trash2, FolderPlus, UploadCloud, X, RefreshCw, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { requestUploadUrl, refreshPhotoUrls } from "@/app/actions/storage";
import { updatePortfolioData } from "@/app/actions/admin-portfolio";
import imageCompression from "browser-image-compression";

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
  const [photoCaption, setPhotoCaption] = useState(""); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);

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
    yearsExperience: "5+",
    totalWeddings: "200+",
    happyClients: "100%",
  });

  useEffect(() => {
    if (basicData) {
      setFormData({
        heroImage: basicData.heroImage || "",
        aboutImage: basicData.aboutImage || "",
        bioText: basicData.bioText || "",
        whatsapp: basicData.whatsapp || "",
        instagram: basicData.instagram || "",
        yearsExperience: basicData.yearsExperience || "5+",
        totalWeddings: basicData.totalWeddings || "200+",
        happyClients: basicData.happyClients || "100%",
      });
    }
  }, [basicData]);

  const handleSaveBasicInfo = async () => {
    const res = await updatePortfolioData(formData);
    if (res.success) toast({ title: "Basic Info Updated" });
    else toast({ variant: "destructive", title: "Error", description: res.error });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'heroImage' | 'aboutImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (type === 'heroImage') setUploadingHero(true);
    else setUploadingAbout(true);

    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: "image/jpeg" };
      const compressedFile = await imageCompression(file, options);

      const { success, uploadUrl, key } = await requestUploadUrl({
        userId: user.uid,
        galleryId: "portfolio",
        fileName: file.name,
        contentType: compressedFile.type,
        fileSize: compressedFile.size,
      });

      if (!success || !uploadUrl || !key) throw new Error("Upload URL failed");

      await fetch(uploadUrl, {
        method: "PUT",
        body: compressedFile,
        headers: { "Content-Type": compressedFile.type },
      });

      // 👇 FIX: Fresh Signed URL generate karein
      const urlRes = await refreshPhotoUrls([key]);
      
      if (!urlRes.success || !urlRes.urls[key]) {
        throw new Error("URL generation failed");
      }

      const finalUrl = urlRes.urls[key];
      
      setFormData({ ...formData, [type]: finalUrl });
      
      toast({ title: "Image Uploaded", description: "Save karna na bhoolein!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message });
    } finally {
      if (type === 'heroImage') setUploadingHero(false);
      else setUploadingAbout(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const handleCreateAlbum = async () => {
    if (!firestore || !newAlbumName) return;
    setIsCreating(true);
    try {
      await addDoc(collection(firestore, "portfolio_albums"), {
        name: newAlbumName, photos: [], createdAt: new Date().toISOString(),
      });
      toast({ title: "Album Created", description: `${newAlbumName} category added.` });
      setNewAlbumName("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setIsCreating(false); }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!firestore || !confirm("Delete this entire album?")) return;
    await deleteDoc(doc(firestore, "portfolio_albums", albumId));
    toast({ title: "Album Deleted" });
  };

  const handleUpdateAlbumName = async (newName: string) => {
    if (!firestore || !selectedAlbum) return;
    try {
      await updateDoc(doc(firestore, "portfolio_albums", selectedAlbum.id), { name: newName });
      toast({ title: "Album Name Updated" });
      setSelectedAlbum({ ...selectedAlbum, name: newName });
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  };

  const refreshAlbumUrls = async (album: any) => {
    if (!album.photos || album.photos.length === 0) {
      setSelectedAlbum({ ...album, displayItems: [] });
      return;
    }
    setRefreshing(true);
    try {
      const keys = album.photos.map((p: any) => typeof p === 'string' ? p : p.key);
      const res = await refreshPhotoUrls(keys);
      
      if (res.success) {
        const displayItems = album.photos.map((p: any) => {
          const key = typeof p === 'string' ? p : p.key;
          const caption = typeof p === 'string' ? 'General' : (p.caption || 'General');
          return { key, url: res.urls[key] || '', caption };
        });
        setSelectedAlbum({ ...album, displayItems });
      }
    } catch (err) { console.error(err); } finally { setRefreshing(false); }
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
    const newPhotoItems: any[] = [];

    const captionToUse = photoCaption.trim() || "General"; 

    for (let i = 0; i < files.length; i++) {
      let fileToUpload = files[i];
      
      try {
        if (fileToUpload.type.startsWith("image/")) {
          const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: "image/jpeg" };
          try { fileToUpload = await imageCompression(fileToUpload, options); } catch (e) {}
        }

        const { success, uploadUrl, key } = await requestUploadUrl({
          userId: user.uid,
          galleryId: "portfolio",
          fileName: fileToUpload.name,
          contentType: fileToUpload.type,
          fileSize: fileToUpload.size,
        });

        if (success && uploadUrl && key) {
          await fetch(uploadUrl, {
            method: "PUT",
            body: fileToUpload,
            headers: { "Content-Type": fileToUpload.type },
          });
          newPhotoItems.push({ key, caption: captionToUse });
        }
      } catch (err) { console.error(err); }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    if (newPhotoItems.length > 0) {
      const albumRef = doc(firestore, "portfolio_albums", selectedAlbum.id);
      const updatedPhotos = [...(selectedAlbum.photos || []), ...newPhotoItems];
      await updateDoc(albumRef, { photos: updatedPhotos });
      toast({ title: "Upload Complete", description: `${newPhotoItems.length} photos added.` });
      await refreshAlbumUrls({ ...selectedAlbum, photos: updatedPhotos });
      setPhotoCaption(""); 
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeletePhoto = async (indexToDelete: number) => {
    if (!firestore || !selectedAlbum) return;
    const updatedPhotos = selectedAlbum.photos.filter((_: any, i: number) => i !== indexToDelete);
    await updateDoc(doc(firestore, "portfolio_albums", selectedAlbum.id), { photos: updatedPhotos });
    const updatedDisplayItems = selectedAlbum.displayItems.filter((_: any, i: number) => i !== indexToDelete);
    setSelectedAlbum({ ...selectedAlbum, photos: updatedPhotos, displayItems: updatedDisplayItems });
    toast({ title: "Photo Removed" });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="text-3xl font-headline font-bold text-white mb-1">Portfolio Manager</h1>
        <p className="text-muted-foreground text-sm">Manage your personal albums and bio.</p>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="font-bold text-primary uppercase tracking-widest text-xs">Basic Info & Hero</h3>
        <Textarea placeholder="Bio..." value={formData.bioText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, bioText: e.target.value})} className="h-20 bg-background border-border/50" />
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="WhatsApp" value={formData.whatsapp} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, whatsapp: e.target.value})} className="bg-background border-border/50" />
          <Input placeholder="Instagram URL" value={formData.instagram} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, instagram: e.target.value})} className="bg-background border-border/50" />
        </div>

        <div className="bg-background/50 p-4 rounded-xl border border-white/5">
          <label className="text-xs font-bold text-muted-foreground mb-2 block">Hero Image (Main Top Photo)</label>
          <div className="flex gap-3 items-center">
             {formData.heroImage && (
               <div className="h-16 w-16 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                  <img src={formData.heroImage} alt="Hero" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
               </div>
             )}
             <div className="flex-1">
                <input type="file" accept="image/*" className="hidden" ref={heroInputRef} onChange={(e) => handleImageUpload(e, 'heroImage')} />
                <Button onClick={() => heroInputRef.current?.click()} disabled={uploadingHero} variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-2">
                  {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploadingHero ? "Uploading..." : "Upload Hero Image"}
                </Button>
             </div>
          </div>
        </div>

        <div className="bg-background/50 p-4 rounded-xl border border-white/5">
          <label className="text-xs font-bold text-muted-foreground mb-2 block">About Image (Arch Shape Photo)</label>
          <div className="flex gap-3 items-center">
             {formData.aboutImage && (
               <div className="h-16 w-16 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                  <img src={formData.aboutImage} alt="About" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
               </div>
             )}
             <div className="flex-1">
                <input type="file" accept="image/*" className="hidden" ref={aboutInputRef} onChange={(e) => handleImageUpload(e, 'aboutImage')} />
                <Button onClick={() => aboutInputRef.current?.click()} disabled={uploadingAbout} variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-2">
                  {uploadingAbout ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploadingAbout ? "Uploading..." : "Upload About Image"}
                </Button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div><label className="text-[10px] text-muted-foreground font-bold mb-1 block">Years Exp.</label><Input placeholder="5+" value={formData.yearsExperience} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, yearsExperience: e.target.value})} className="bg-background border-border/50" /></div>
          <div><label className="text-[10px] text-muted-foreground font-bold mb-1 block">Weddings</label><Input placeholder="200+" value={formData.totalWeddings} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, totalWeddings: e.target.value})} className="bg-background border-border/50" /></div>
          <div><label className="text-[10px] text-muted-foreground font-bold mb-1 block">Happy Clients</label><Input placeholder="100%" value={formData.happyClients} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, happyClients: e.target.value})} className="bg-background border-border/50" /></div>
        </div>

        <Button onClick={handleSaveBasicInfo} className="bg-primary text-black font-bold mt-2">Save Basic Info</Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary uppercase tracking-widest text-xs">Portfolio Albums</h3>
          <div className="flex gap-2">
            <Input placeholder="E.g., Barat, Birthday..." value={newAlbumName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAlbumName(e.target.value)} className="w-64 bg-background border-border/50" />
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
                <h4 className="font-bold text-white capitalize">{album.name}</h4>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }} className="text-destructive hover:bg-destructive/10 p-1 rounded-md"><Trash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground">{album.photos?.length || 0} Photos</p>
            </div>
          ))}
        </div>
      </div>

      {selectedAlbum && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
            
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-sm">Album Name:</span>
              <input 
                value={selectedAlbum.name}
                onChange={(e) => setSelectedAlbum({ ...selectedAlbum, name: e.target.value })}
                onBlur={(e) => handleUpdateAlbumName(e.target.value)}
                className="bg-background border border-border/50 text-primary font-headline font-bold text-xl px-4 py-2 rounded-lg outline-none focus:border-primary w-64"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => refreshAlbumUrls(selectedAlbum)} disabled={refreshing} variant="outline" className="border-border/50 text-white gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>

          <div className="bg-background/50 border border-white/10 rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">
                Photo Category / Baby Name (Caption)
              </label>
              <Input 
                placeholder="E.g., Alara, Fabiha..." 
                value={photoCaption} 
                onChange={(e) => setPhotoCaption(e.target.value)} 
                className="bg-background border-border/50" 
              />
              <p className="text-[10px] text-muted-foreground mt-1">Yeh naam Portfolio par Highlight group banayega.</p>
            </div>
            
            <div className="flex gap-2">
              <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleUploadPhotos} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full bg-primary text-black font-bold gap-2 h-12">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {uploading ? `Uploading ${uploadProgress}%` : "Upload Photos"}
              </Button>
            </div>
          </div>

          {refreshing ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {selectedAlbum.displayItems?.map((item: any, i: number) => (
                item.url && (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-border/30">
                    {item.url.match(/\.(mp4|webm|ogg|mov|m4v)/i) ? (
                       <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                       <img src={item.url} alt="Portfolio" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">
                      {item.caption}
                    </div>
                    <button onClick={() => handleDeletePhoto(i)} className="absolute top-2 right-2 bg-destructive text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                  </div>
                )
              ))}
            </div>
          )}

          {(!selectedAlbum.displayItems || selectedAlbum.displayItems.length === 0) && !refreshing && (
            <p className="text-center text-muted-foreground text-sm py-8 italic">No photos in this album yet.</p>
          )}
        </div>
      )}
    </div>
  );
}