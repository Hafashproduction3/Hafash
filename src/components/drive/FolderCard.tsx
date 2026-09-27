"use client";

import { Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    fileCount?: number;
  };
  onOpen: () => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

export function FolderCard({ folder, onOpen, onRename, onDelete }: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        className="w-full bg-gradient-to-br from-card/60 via-card/40 to-card/20 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-5 hover:border-primary/40 hover:translate-y-[-2px] transition-all duration-300 text-left"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Folder className="w-7 h-7 text-primary" fill="currentColor" fillOpacity={0.2} />
          </div>
          {onDelete && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }
              }}
              className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <MoreVertical className="w-4 h-4 text-white/60" />
            </div>
          )}
        </div>

        <p className="font-headline font-bold text-white truncate mb-1">
          {folder.name}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {folder.fileCount || 0} files
        </p>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-16 right-4 z-30 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[140px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onRename?.(folder.id, folder.name);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-sm font-bold text-white/80 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete?.(folder.id);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 text-sm font-bold text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}