"use client";

import { useState } from 'react';
import { Star, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { submitReview } from '@/app/actions/reviews';

export function ReviewFormSection({
  galleryId,
  galleryTitle,
  clientName,
  eventType,
  photographerId,
}: {
  galleryId: string | null;
  galleryTitle: string;
  clientName: string;
  eventType: string;
  photographerId?: string | null;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState(clientName || '');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryId) {
      toast({ variant: 'destructive', title: 'Gallery not ready' });
      return;
    }
    if (!text.trim()) {
      toast({ variant: 'destructive', title: 'Please write a review' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitReview({
        galleryId,
        clientName: name,
        rating,
        text,
        eventType,
        photographerId: photographerId || null,
      });

      if (result.success) {
        setSubmitted(true);
        toast({
          title: '✅ Review submitted!',
          description: 'Thank you! Photographer will review it soon.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed',
          description: result.error,
        });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-headline font-bold text-white">
            Thank You!
          </h2>
          <p className="text-muted-foreground italic">
            Aapka review photographer ko chala gaya hai.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-24 px-6 overflow-hidden border-t border-border/20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="relative max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10">
            <Star className="w-3 h-3 text-primary fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Leave a Review
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-headline font-bold text-white">
            How was your experience?
          </h2>
          <p className="text-sm italic text-muted-foreground">
            Aapka feedback photographer ke liye bahut important hai
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10">
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Your Rating
            </Label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      s <= (hoverRating || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-bold text-primary">
              {rating} star{rating > 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Your Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-14 rounded-2xl bg-background/50 border-white/10 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Your Review
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Photographer ke baare mein kuch likhein..."
              className="min-h-[140px] rounded-2xl bg-background/50 border-white/10 focus:border-primary/50 text-base leading-relaxed"
              maxLength={500}
            />
            <p className="text-[10px] text-right text-muted-foreground">
              {text.length}/500
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting || !text.trim()}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 font-bold gap-2 shadow-lg shadow-primary/25 text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Review
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}