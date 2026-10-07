/**
 * 🆕 WebP Conversion Helper
 * Sirf Portfolio photos ke liye
 */

"use client";

export async function convertToWebP(
  file: File,
  quality: number = 0.85
): Promise<File> {
  // Agar already WebP hai toh skip
  if (file.type === "image/webp") return file;

  // Agar image nahi hai toh skip
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }

          const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
          const webpFile = new File([blob], newName, {
            type: "image/webp",
            lastModified: Date.now(),
          });

          console.log(
            `[WebP] ${file.name} (${(file.size / 1024).toFixed(0)}KB) → ${newName} (${(webpFile.size / 1024).toFixed(0)}KB) — ${Math.round((1 - webpFile.size / file.size) * 100)}% smaller`
          );

          resolve(webpFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
