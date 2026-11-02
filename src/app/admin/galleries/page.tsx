"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Search, Loader2, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { deleteGalleryAsAdmin } from "@/app/actions/admin-galleries";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'N/A';
  try {
    const d = typeof dateVal === 'object' && dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM d, yyyy');
  } catch { return 'N/A'; }
};

export default function AdminGalleriesPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const galleriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "galleries"), orderBy("createdAt", "desc"), limit(100));
  }, [firestore, refreshKey]);

  const { data: galleries, loading } = useCollection(galleriesQuery);

  const filteredGalleries = galleries?.filter((g: any) => 
    g.title?.toLowerCase().includes(search.toLowerCase()) || 
    g.clientName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleDelete = async (galleryId: string, title: string) => {
    if (!adminUser) return;
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${title}" and all its photos? This cannot be undone.`)) return;

    setDeletingId(galleryId);
    const res = await deleteGalleryAsAdmin(adminUser.uid, galleryId);
    
    if (res.success) {
      toast({ title: "Gallery Deleted", description: "The gallery and its photos were removed." });
      setRefreshKey(prev => prev + 1);
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-white mb-1">Galleries</h1>
          <p className="text-muted-foreground text-sm">Manage all event galleries across the platform.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search galleries..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border/50 text-sm focus:border-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Gallery / Client</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Photos</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Created</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filteredGalleries.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No galleries found.</td></tr>
              ) : filteredGalleries.map((gallery: any) => (
                <tr key={gallery.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white">{gallery.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">{gallery.clientName || "No Client"}</p>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {gallery.photoCount || 0}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {safeFormatDate(gallery.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link 
                        href={`/gallery/${gallery.id}`}
                        target="_blank"
                        className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors"
                        title="View Gallery"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(gallery.id, gallery.title)}
                        disabled={deletingId === gallery.id}
                        className="p-2 bg-destructive/10 rounded-lg text-destructive hover:bg-destructive/20 transition-colors"
                        title="Delete Gallery"
                      >
                        {deletingId === gallery.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}