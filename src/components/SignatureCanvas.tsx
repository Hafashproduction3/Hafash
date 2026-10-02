"use client";

import { useRef, useState, useEffect } from "react";
import SignatureCanvasLib from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function SignatureCanvas({
  onSave,
  onCancel,
  className,
}: SignatureCanvasProps) {
  const sigCanvasRef = useRef<SignatureCanvasLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      return;
    }

    const dataUrl = sigCanvasRef.current.toDataURL("image/png", {
      backgroundColor: "white",
    });

    onSave(dataUrl);
  };

  const handleEnd = () => {
    if (sigCanvasRef.current) {
      setIsEmpty(sigCanvasRef.current.isEmpty());
    }
  };

  // Responsive canvas — resize on window change
  useEffect(() => {
    const handleResize = () => {
      if (sigCanvasRef.current) {
        // Data preserve karne ke liye
        const data = sigCanvasRef.current.toData();
        sigCanvasRef.current.clear();
        sigCanvasRef.current.fromData(data);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Canvas Container */}
      <div className="relative rounded-2xl border-2 border-dashed border-primary/40 bg-white overflow-hidden">
        {/* Placeholder text */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400 italic select-none">
              Yahan sign karein
            </p>
          </div>
        )}

        <SignatureCanvasLib
          ref={sigCanvasRef}
          penColor="black"
          onEnd={handleEnd}
          canvasProps={{
            className: "w-full h-48 touch-none",
            style: { touchAction: "none" },
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isEmpty}
          className="rounded-xl gap-2"
        >
          <Eraser className="w-4 h-4" />
          Clear
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="rounded-xl gap-2 text-muted-foreground"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 rounded-xl gap-2 bg-primary hover:bg-primary/90 font-bold"
        >
          <Check className="w-4 h-4" />
          Save Signature
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center italic">
        Ungli ya mouse se sign karein. Signature invoice pe print hoga.
      </p>
    </div>
  );
}