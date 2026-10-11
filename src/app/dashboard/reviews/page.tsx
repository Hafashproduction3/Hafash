"use client";

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Star, Check, X, Trash2, Loader2, MessageSquare,
  Clock, CheckCircle2, XCircle, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { cn } from '@/lib/utils';
import {
  getDashboardReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from '@/app/actions/reviews';

export default function DashboardReviewsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!user?.uid) {
      console.log('[LOAD_REVIEWS] No user uid');
      return;
    }

    setLoading(true);
    console.log('[LOAD_REVIEWS] Loading for uid:', user.uid);

    try {
      const result = await getDashboardReviews(user.uid);

      console.log('[LOAD_REVIEWS] Result:', {
        success: result.success,
        error: result.error,
        count: result.reviews?.length,
      });

      if (result.success) {
        setReviews(result.reviews || []);
      } else {
        toast({
          variant: 'destructive',
          title: 'Reviews load failed',
          description: result.error || 'Unknown error',
        });
      }
    } catch (err: any) {
      console.error('[LOAD_REVIEWS] ❌ THROWN:', {
        message: err.message,
        digest: err.digest,
      });
      toast({
        variant: 'destructive',
        title: 'Reviews load failed',
        description: err.message || 'Server error',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.uid, toast]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.uid) {
      loadReviews();
    }
  }, [authLoading, user?.uid, loadReviews]);

  const handleApprove = async (galleryId: string, reviewId: string) => {
    setProcessingId(reviewId);
    const result = await approveReview({ galleryId, reviewId });
    if (result.success) {
      toast({ title: '✅ Review Approved' });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, status: 'approved', approvedAt: new Date().toISOString() } : r
        )
      );
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
    setProcessingId(null);
  };

  const handleReject = async (galleryId: string, reviewId: string) => {
    setProcessingId(reviewId);
    const result = await rejectReview({ galleryId, reviewId });
    if (result.success) {
      toast({ title: '❌ Review Rejected' });
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: 'rejected' } : r))
      );
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
    setProcessingId(null);
  };

  const handleDelete = async (galleryId: string, reviewId: string) => {
    if (!confirm('Delete this review?')) return;
    setProcessingId(reviewId);
    const result = await deleteReview({ galleryId, reviewId });
    if (result.success) {
      toast({ title: '🗑️ Review Deleted' });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
    setProcessingId(null);
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  if (authLoading || loading) {
    return <HafashLoader text="Loading Reviews..." />;
  }

  if (!user) return null;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl lg:text-5xl font-headline font-bold text-white">
            Client <span className="text-primary italic">Reviews</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Approve, reject, ya delete karein
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-xl gap-2 h-10 px-4 font-bold capitalize',
              filter === f && 'bg-primary text-primary-foreground'
            )}
          >
            {f === 'all' && <MessageSquare className="w-4 h-4" />}
            {f === 'pending' && <Clock className="w-4 h-4" />}
            {f === 'approved' && <CheckCircle2 className="w-4 h-4" />}
            {f === 'rejected' && <XCircle className="w-4 h-4" />}
            {f} ({counts[f]})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card/40 border-border/50 rounded-[2.5rem]">
          <CardContent className="p-16 text-center space-y-4">
            <MessageSquare className="w-20 h-20 mx-auto text-muted-foreground opacity-20" />
            <h3 className="font-headline font-bold text-xl text-white">
              No {filter !== 'all' ? filter : ''} reviews
            </h3>
            <p className="text-sm text-muted-foreground">
              Jab clients review denge, yahan dikhengi
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <Card
              key={review.id}
              className={cn(
                'bg-card/40 border-border/50 rounded-3xl overflow-hidden',
                review.status === 'pending' && 'border-amber-500/30'
              )}
            >
              <CardContent className="p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'w-4 h-4',
                              s <= review.rating ? 'fill-current text-primary' : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>

                      <Badge
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-widest',
                          review.status === 'pending' && 'bg-amber-500/20 text-amber-500 border-amber-500/30',
                          review.status === 'approved' && 'bg-green-500/20 text-green-500 border-green-500/30',
                          review.status === 'rejected' && 'bg-red-500/20 text-red-500 border-red-500/30'
                        )}
                      >
                        {review.status}
                      </Badge>

                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {review.galleryTitle}
                      </span>
                    </div>

                    <p className="text-base lg:text-lg italic text-white/90 leading-relaxed">
                      "{review.text}"
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-bold">— {review.clientName}</span>
                      {review.eventType && (
                        <span className="text-primary font-bold uppercase tracking-widest text-[10px]">
                          {review.eventType}
                        </span>
                      )}
                      {review.createdAt && (
                        <span>
                          {new Date(review.createdAt).toLocaleDateString('en-PK', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-col gap-2 lg:w-40">
                    {review.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(review.galleryId, review.id)}
                          disabled={processingId === review.id}
                          className="flex-1 lg:w-full h-11 rounded-xl bg-green-500 text-white hover:bg-green-600 font-bold gap-2"
                        >
                          {processingId === review.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(review.galleryId, review.id)}
                          disabled={processingId === review.id}
                          className="flex-1 lg:w-full h-11 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {review.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(review.galleryId, review.id)}
                        disabled={processingId === review.id}
                        className="flex-1 lg:w-full h-11 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold gap-2"
                      >
                        <X className="w-4 h-4" />
                        Unapprove
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(review.galleryId, review.id)}
                      disabled={processingId === review.id}
                      className="flex-1 lg:w-full h-11 rounded-xl text-destructive hover:bg-destructive/10 font-bold gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}