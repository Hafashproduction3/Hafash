"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, Image as ImageIcon, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { requestUploadUrl, refreshPhotoUrls } from "@/app/actions/storage";

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string, storageKey?: string) => void;
  userId: string;
  type: "logo" | "banner" | "photo";
  maxSizeMB?: number;
  aspectRatio?: string;
  disabled?: boolean;
  showUrlInput?: boolean;
}

export function ImageUploader({
  label,
  value,
  onChange,
  userId,
  type,
  maxSizeMB = 2,
  aspectRatio = "aspect-square",
  disabled = false,
  showUrlInput = true,
}: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUrlField, setShowUrlField] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Sirf image files allowed hain (JPG, PNG, WebP)",
      });
      return;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Max ${maxSizeMB}MB allowed hai`,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get signed upload URL
      const uploadResult = await requestUploadUrl({
        userId,
        galleryId: `branding-${type}`,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      if (!uploadResult.success || !uploadResult.uploadUrl) {
        throw new Error(uploadResult.error || "Upload URL failed");
      }

      // 2. Upload to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("PUT", uploadResult.uploadUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // 3. Generate fresh URL for immediate preview
      const urlResult = await refreshPhotoUrls([uploadResult.key!]);
      const publicUrl = urlResult.success && urlResult.urls[uploadResult.key!]
        ? urlResult.urls[uploadResult.key!]
        : uploadResult.uploadUrl.split("?")[0];

      // 4. Save URL + storageKey
      onChange(publicUrl, uploadResult.key!);

      toast({
        title: "✅ Uploaded",
        description: `${label} successfully upload ho gaya`,
      });
    } catch (error: any) {
      console.error("[IMAGE_UPLOADER]", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Please try again",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) {
      toast({ variant: "destructive", title: "URL khali hai" });
      return;
    }

    // Basic URL validation
    if (!/^https?:\/\/.+/.test(urlInput.trim())) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "URL https:// se shuru honi chahiye",
      });
      return;
    }

    onChange(urlInput.trim());
    setUrlInput("");
    setShowUrlField(false);
    toast({ title: "✅ URL saved" });
  };

  const handleRemove = () => {
    // Clear both URL and storageKey
    onChange("", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: "Removed" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </Label>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={disabled}
            className="h-7 gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 text-[10px]"
          >
            <X className="w-3 h-3" />
            Remove
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden border-2 border-dashed",
            value ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background/40",
            type === "logo" ? "w-24 h-24" : type === "photo" ? "w-24 h-24" : "w-40 h-24"
          )}
        >
          {value ? (
            <>
              <img
                src={value}
                alt={label}
                className="w-full h-full object-contain p-2"
              />
              <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                <Check className="w-3 h-3 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-bold text-primary">
                  Uploading... {uploadProgress}%
                </span>
              </div>
              <div className="h-1.5 bg-background/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="rounded-xl gap-2 border-primary/30 hover:bg-primary/5 font-bold h-10"
              >
                <Upload className="w-3.5 h-3.5" />
                {value ? "Replace" : "Upload"}
              </Button>

              {showUrlInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlField(!showUrlField)}
                  disabled={disabled}
                  className="rounded-xl gap-2 text-muted-foreground hover:text-primary h-10"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  URL
                </Button>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground italic">
            {type === "logo" && `Square image recommended · Max ${maxSizeMB}MB`}
            {type === "banner" && `Wide image recommended (1200×600) · Max ${maxSizeMB}MB`}
            {type === "photo" && `Portrait recommended · Max ${maxSizeMB}MB`}
          </p>
        </div>
      </div>

      {/* URL Input (Toggle) */}
      {showUrlField && !isUploading && (
        <div className="flex gap-2 p-3 rounded-xl bg-background/40 border border-border/30">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.png"
            className="h-10 rounded-lg text-sm font-mono"
            disabled={disabled}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlSave}
            disabled={!urlInput.trim() || disabled}
            className="rounded-lg bg-primary gap-1 h-10"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
}