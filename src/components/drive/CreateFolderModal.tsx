"use client";

import { useState } from 'react';
import { Folder, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateFolderModal({ open, onClose, onCreate }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim());
      setName('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-card border border-primary/20 rounded-[2.5rem] p-10 space-y-8 shadow-[0_50px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Folder className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white">
                New Folder
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Create in Hafash Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Folder Name
          </label>
          <Input
            type="text"
            placeholder="e.g. Ahmed & Sara Wedding"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="h-14 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 text-lg"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl h-14 border-white/10 font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 rounded-2xl h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Folder className="w-5 h-5" />
                Create
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}