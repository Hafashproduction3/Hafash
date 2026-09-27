"use client";

import { File, Video, Image as ImageIcon, Check, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/plans';

interface FileCardProps {
  file: {
    id: string;
    fileName: string;
    fileSize: number;
    type: 'image' | 'video' | 'file';
    thumbUrl?: string;
    url?: string;
  };
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: (id: string) => void;
}

export function FileCard({
  file,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onOpen,
  onDelete,
}: FileCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
    } else {
      onOpen?.();
    }
  };

  const imageSrc = file.thumbUrl || file.url;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative aspect-square rounded-[1.5rem] overflow-hidden border-2 bg-card/40 cursor-pointer transition-all duration-300",
        isSelected
          ? "border-primary ring-4 ring-primary/30"
          : "border-white/5 hover:border-primary/30 hover:translate-y-[-2px]"
      )}
    >
      {/* Loading placeholder */}
      {!loaded && !imgError && file.type === 'image' && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse" />
      )}

      {/* Image / Video / File icon */}
      {file.type === 'image' && !imgError && imageSrc ? (
        <img
          src={imageSrc}
          alt={file.fileName}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            loaded ? "opacity-100" : "opacity-0",
            !isSelectionMode && "group-hover:scale-105"
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setImgError(true)}
        />
      ) : file.type === 'video' ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          <Video className="w-12 h-12 text-blue-400 opacity-60 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
            Video
          </span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
          <File className="w-12 h-12 text-white/30 opacity-60 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
            File
          </span>
        </div>
      )}

      {/* Selection checkbox */}
      {isSelectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all shadow-xl",
              isSelected
                ? "bg-primary border-primary"
                : "bg-white/90 border-white/50 backdrop-blur-md"
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Hover overlay */}
      {!isSelectionMode && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <p className="text-[10px] font-bold text-white truncate mb-1">
            {file.fileName}
          </p>
          <p className="text-[9px] font-bold text-white/60">
            {formatBytes(file.fileSize)}
          </p>
        </div>
      )}

      {/* Delete button (top-left) */}
      {!isSelectionMode && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file.id);
          }}
          className="absolute top-2 left-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Image badge */}
      {file.type === 'image' && isSelectionMode && (
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1">
          <p className="text-[9px] font-bold text-white truncate max-w-[100px]">
            {file.fileName}
          </p>
        </div>
      )}
    </div>
  );
}