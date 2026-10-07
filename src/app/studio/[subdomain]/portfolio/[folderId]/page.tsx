"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, X, ChevronLeft, ChevronRight, Loader2,
  Folder, ArrowLeft, Search, Menu, Sparkles, LayoutGrid
} from "lucide-react";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { getTheme } from "@/lib/portfolio-themes";

export default function FolderDetailPublicPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const folderId = (params?.folderId as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [folder, setFolder] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!firestore || !subdomain || !folderId) {
        setLoading(false);
        return;
      }

      try {
        const userQuery = query(
          collection(firestore, "publicProfiles"),
          where("subdomain", "==", subdomain.toLowerCase()),
          limit(1)
        );
        const userSnap = await getDocs(userQuery);

        if (cancelled) return;
        if (userSnap.empty) { setLoading(false); return; }

        const photographerData: any = {
          userId: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        };

        setPhotographer(photographerData);

        const allFolders: any[] = photographerData.portfolioFolders || [];
        const matchedFolder = allFolders.find(
          (f: any) => f.slug === folderId || f.id === folderId
        );

        if (!matchedFolder) {
          setLoading(false);
          return;
        }

        // ═══ STEP 1: Folder cover image refresh ═══
        let refreshedFolder = { ...matchedFolder };
        if (matchedFolder.coverStorageKey) {
          try {
            const coverResult = await refreshPhotoUrls([matchedFolder.coverStorageKey]);
            if (coverResult.success && coverResult.urls[matchedFolder.coverStorageKey]) {
              refreshedFolder.coverImage = coverResult.urls[matchedFolder.coverStorageKey];
            }
          } catch (err) {
            console.warn("[FOLDER_COVER_REFRESH]", err);
          }
        }

        setFolder(refreshedFolder);

        // ═══ STEP 2: Folder photos refresh ═══
        const rawPhotos: any[] = photographerData.portfolioPhotos || [];
        const folderPhotos = rawPhotos.filter(
          (p: any) => p.folderId === matchedFolder.id
        );

        if (folderPhotos.length > 0) {
          const keysToRefresh: string[] = [];
          folderPhotos.forEach((p: any) => {
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

          const refreshed = folderPhotos
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((p: any) => ({
              ...p,
              url: urlMap[p.storageKey] || p.url || '',
              thumbUrl: p.thumbKey
                ? (urlMap[p.thumbKey] || p.thumbUrl || p.url)
                : (urlMap[p.storageKey] || p.url || ''),
            }));

          if (!cancelled) setPhotos(refreshed);
        }

        // ═══ STEP 3: Fallback — agar portfolioPhotos khali hai, galleries se lein ═══
        if (folderPhotos.length === 0) {
          try {
            const galleryQuery = query(
              collection(firestore, "galleries"),
              where("userId", "==", photographerData.userId)
            );
            const gallerySnap = await getDocs(galleryQuery);

            if (!cancelled && !gallerySnap.empty) {
              const allPhotos: any[] = [];
              for (const galleryDoc of gallerySnap.docs) {
                const galleryData = galleryDoc.data();
                const items = galleryData.items || [];
                items.forEach((item: any) => {
                  allPhotos.push({
                    id: item.id || `${galleryDoc.id}-${item.storageKey}`,
                    url: item.url || '',
                    thumbUrl: item.thumbUrl || item.url || '',
                    storageKey: item.storageKey,
                    thumbKey: item.thumbKey,
                    caption: item.caption || galleryData.title || 'Photo',
                    folderId: matchedFolder.id,
                  });
                });
              }

              if (allPhotos.length > 0) {
                const keysToRefresh: string[] = [];
                allPhotos.forEach((p) => {
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

                const refreshed = allPhotos.map((p) => ({
                  ...p,
                  url: urlMap[p.storageKey] || p.url || '',
                  thumbUrl: p.thumbKey
                    ? (urlMap[p.thumbKey] || p.thumbUrl || p.url)
                    : (urlMap[p.storageKey] || p.url || ''),
                }));

                if (!cancelled) setPhotos(refreshed);
              }
            }
          } catch (err) {
            console.warn("[FOLDER_GALLERY_FALLBACK]", err);
          }
        }
      } catch (err) {
        console.error("[FOLDER_DETAIL_PUBLIC]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firestore, subdomain, folderId]);

  const theme = useMemo(() => {
    if (!photographer) return getTheme('royal-gold');
    return getTheme(photographer.theme, photographer.customColors);
  }, [photographer?.theme, photographer?.customColors]);

  const visiblePhotos = photos.slice(0, displayLimit);
  const hasMore = displayLimit < photos.length;

  const goNext = () => {
    if (selectedPhotoIdx === null) return;
    setSelectedPhotoIdx((selectedPhotoIdx + 1) % photos.length);
  };
  const goPrev = () => {
    if (selectedPhotoIdx === null) return;
    setSelectedPhotoIdx((selectedPhotoIdx - 1 + photos.length) % photos.length);
  };

  useEffect(() => {
    if (selectedPhotoIdx === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhotoIdx(null);
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPhotoIdx, photos.length]);

  useEffect(() => {
    document.body.style.overflow = selectedPhotoIdx !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedPhotoIdx]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div
          className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{
            borderColor: 'var(--portfolio-border)',
            borderTopColor: 'var(--portfolio-primary)',
          }}
        />
      </div>
    );
  }

  if (!folder) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center p-6"
        style={{ background: 'var(--portfolio-page-bg)' }}
      >
        <div className="text-center space-y-6 max-w-md">
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'var(--portfolio-primary)15' }}
          >
            <Folder className="w-12 h-12" style={{ color: 'var(--portfolio-primary)', opacity: 0.4 }} />
          </div>
          <h1
            className="text-3xl font-headline font-bold"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Folder Nahi Mila
          </h1>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
            style={{
              borderColor: 'var(--portfolio-primary)',
              color: 'var(--portfolio-primary)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const studioName = photographer?.studioName || "Studio";
  const coverImage = folder.coverImage || photos[0]?.thumbUrl || photos[0]?.url;

  return (
    <div style={{ background: 'var(--portfolio-page-bg)' }}>

      <nav
        className="border-b"
        style={{
          borderColor: 'var(--portfolio-border)',
          background: 'var(--portfolio-header-bg)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link href="/" className="space-y-0.5">
            <p
              className="text-xl lg:text-2xl font-headline font-bold tracking-wider"
              style={{ color: 'var(--portfolio-heading-text)' }}
            >
              {studioName.toUpperCase()}
            </p>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.4em]"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              Production
            </p>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {[
              { label: 'Work', href: '/portfolio' },
              { label: 'Archive', href: '/portfolio' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                style={{ color: 'var(--portfolio-body-text)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--portfolio-body-text)' }}
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--portfolio-body-text)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <section className="py-10 lg:py-16" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] mb-8 transition-opacity hover:opacity-70"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Portfolio
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <div
                className="aspect-square rounded-2xl overflow-hidden border"
                style={{ borderColor: 'var(--portfolio-border)' }}
              >
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={folder.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--portfolio-card-bg)' }}
                  >
                    <Folder className="w-20 h-20" style={{ color: 'var(--portfolio-muted-text)', opacity: 0.3 }} />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: 'var(--portfolio-primary)' }}
                >
                  Folder / Collection
                </span>
              </div>

              <h1
                className="text-5xl lg:text-7xl font-headline font-bold leading-tight uppercase tracking-tight"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                {folder.name}
              </h1>

              {folder.description && (
                <p
                  className="text-lg lg:text-xl italic leading-relaxed"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  {folder.description}
                </p>
              )}

              <p
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                {photos.length} Photos · Updated {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-16 lg:py-24 border-t"
        style={{
          background: 'var(--portfolio-section-bg)',
          borderColor: 'var(--portfolio-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {photos.length === 0 ? (
            <div className="text-center py-20">
              <LayoutGrid
                className="w-20 h-20 mx-auto mb-6"
                style={{ color: 'var(--portfolio-muted-text)', opacity: 0.2 }}
              />
              <h3
                className="text-2xl font-headline font-bold mb-3"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Abhi Koi Photo Nahi
              </h3>
              <p
                className="text-sm italic"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Is folder mein abhi photos add nahi hui.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h2
                  className="text-[11px] font-bold uppercase tracking-[0.5em]"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  All Photos — {photos.length} Items
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {visiblePhotos.map((photo: any, idx: number) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhotoIdx(idx)}
                    className="group relative overflow-hidden rounded-xl cursor-pointer border"
                    style={{ borderColor: 'var(--portfolio-border)' }}
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={photo.thumbUrl || photo.url}
                        alt={photo.caption || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                      />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 lg:p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs lg:text-sm font-bold text-white uppercase tracking-wider truncate">
                          {photo.caption || folder.name}
                        </p>
                        <p className="text-[10px] font-bold text-white/60 tracking-widest shrink-0">
                          {String(idx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-12">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 12)}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full border-2 text-xs font-bold uppercase tracking-[0.3em] transition-all hover:scale-105"
                    style={{
                      borderColor: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary)',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Load More ({photos.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {selectedPhotoIdx !== null && photos[selectedPhotoIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center"
          onClick={() => setSelectedPhotoIdx(null)}
        >
          <button
            className="absolute top-6 right-6 z-30 text-white h-14 w-14 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(null); }}
          >
            <X className="w-7 h-7" />
          </button>

          <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold">
            {selectedPhotoIdx + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                <ChevronLeft className="w-10 h-10" />
              </button>

              <button
                className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          <img
            src={photos[selectedPhotoIdx].url}
            alt={photos[selectedPhotoIdx].caption || 'Fullscreen'}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          />

          {photos[selectedPhotoIdx].caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold uppercase tracking-widest">
              {photos[selectedPhotoIdx].caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}