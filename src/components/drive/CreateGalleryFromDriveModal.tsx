"use client";

import { useState } from 'react';
import { Package, Loader2, X, Folder, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGalleryFromDriveFiles } from '@/app/actions/drive';

interface CreateGalleryFromDriveModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  fileIds: string[];
  onSuccess: (galleryId: string, slug: string) => void;
}

export function CreateGalleryFromDriveModal({
  open,
  onClose,
  userId,
  fileIds,
  onSuccess,
}: CreateGalleryFromDriveModalProps) {
  const [galleryName, setGalleryName] = useState('');
  const [clientName, setClientName] = useState('');
  const [category, setCategory] = useState('Wedding');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!galleryName.trim()) {
      setError('Gallery name required');
      return;
    }
    if (fileIds.length === 0) {
      setError('No files selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createGalleryFromDriveFiles({
        userId,
        fileIds,
        galleryName: galleryName.trim(),
        clientName: clientName.trim() || 'Client',
        category: category || 'Wedding',
      });

      if (result.success && result.galleryId && result.slug) {
        onSuccess(result.galleryId, result.slug);
        setGalleryName('');
        setClientName('');
        setCategory('Wedding');
        onClose();
      } else {
        setError(result.error || 'Failed to create gallery');
      }
    } catch (err: any) {
      console.error('[CREATE_GALLERY_MODAL]', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const categories = ['Wedding', 'Engagement', 'Portrait', 'Event', 'Maternity', 'Product', 'Other'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-card border border-primary/20 rounded-[2.5rem] p-8 lg:p-10 space-y-6 shadow-[0_50px_100px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white">
                Create Gallery
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                From {fileIds.length} selected files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Folder className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-white/70 leading-relaxed">
            Selected files <strong className="text-primary">Drive mein safe rahengi</strong>. 
            Gallery unka ek reference banayegi — extra storage nahi lagega.
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Gallery Name */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-primary" />
              Gallery Name *
            </Label>
            <Input
              type="text"
              placeholder="e.g. Ahmed & Sara Wedding"
              value={galleryName}
              onChange={(e) => setGalleryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="h-14 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 text-lg"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              Client Name
            </Label>
            <Input
              type="text"
              placeholder="e.g. Ahmed Khan"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="h-14 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 text-lg"
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary" />
              Category
            </Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-background/50 border border-border/50 focus:border-primary/50 px-4 text-lg text-white appearance-none cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c} className="bg-card">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl h-14 border-white/10 font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !galleryName.trim()}
            className="flex-1 rounded-2xl h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                Create Gallery
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}