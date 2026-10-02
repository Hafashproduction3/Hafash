"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Star, Quote, MessageCircle, ArrowRight, Sparkles,
  ThumbsUp, Filter, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme } from "@/lib/portfolio-themes";
import { cn } from "@/lib/utils";

export default function ReviewsPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [displayLimit, setDisplayLimit] = useState(12);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!firestore || !subdomain) { setLoading(false); return; }

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

        // Load reviews
        try {
          const reviewsQuery = query(
            collection(firestore, "networkReviews"),
            where("professionalId", "==", photographerData.userId)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          const reviewsData = reviewsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => {
              const aT = a.createdAt?.seconds || 0;
              const bT = b.createdAt?.seconds || 0;
              return bT - aT;
            });
          if (!cancelled) setReviews(reviewsData);
        } catch {}
      } catch (err) {
        console.error("[REVIEWS_LOAD]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firestore, subdomain]);

  const theme = useMemo(() => {
    if (!photographer) return getTheme('royal-gold');
    return getTheme(photographer.theme, photographer.customColors);
  }, [photographer?.theme, photographer?.customColors]);

  const stats = useMemo(() => {
    const emptyDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length === 0) {
      return { avg: "5.0", total: 0, distribution: emptyDist };
    }
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = sum / reviews.length;

    const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: any) => {
      const rating = Math.round(r.rating || 5);
      if (rating >= 1 && rating <= 5) distribution[rating]++;
    });

    return { avg: avg.toFixed(1), total: reviews.length, distribution };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filterRating === 'all') return reviews;
    return reviews.filter((r: any) => Math.round(r.rating || 5) === filterRating);
  }, [reviews, filterRating]);

  const visibleReviews = filteredReviews.slice(0, displayLimit);
  const hasMore = displayLimit < filteredReviews.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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

  if (!photographer) return null;

  const studioName = photographer.studioName || 'Studio';
  const whatsapp = photographer.whatsappNumber;

  return (
    <>
      {/* PAGE HERO */}
      <section
        className="py-20 lg:py-24 relative overflow-hidden"
        style={{ background: 'var(--portfolio-section-bg)' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at center, var(--portfolio-primary) 0%, transparent 70%)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
            style={{
              borderColor: 'var(--portfolio-primary)',
              background: 'var(--portfolio-primary)10',
            }}
          >
            <Star className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              Client Reviews
            </span>
          </div>
          <h1
            className="text-5xl lg:text-7xl font-headline font-bold mb-4 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Loved By Couples
          </h1>
          <p
            className="text-lg lg:text-xl max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Real stories from clients we've had the honor to serve
          </p>
        </div>
      </section>

      {/* STATS + RATING SUMMARY */}
      {reviews.length > 0 && (
        <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-page-bg)' }}>
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div
              className="rounded-3xl p-8 lg:p-12"
              style={{
                background: 'var(--portfolio-card-bg)',
                border: `1px solid var(--portfolio-border)`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

                {/* Left — Overall */}
                <div className="text-center md:text-left space-y-4">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <span
                      className="text-7xl lg:text-8xl font-headline font-bold"
                      style={{ color: 'var(--portfolio-primary)' }}
                    >
                      {stats.avg}
                    </span>
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "w-6 h-6",
                              s <= Math.round(parseFloat(String(stats.avg))) ? "fill-current" : ""
                            )}
                            style={{ color: 'var(--portfolio-primary)' }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: 'var(--portfolio-muted-text)' }}
                      >
                        {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>
                  <p
                    className="text-sm italic"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    Based on verified client reviews
                  </p>
                </div>

                {/* Right — Distribution */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = (stats.distribution as any)[star] || 0;
                    const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;

                    return (
                      <button
                        key={star}
                        onClick={() => setFilterRating(filterRating === star ? 'all' : star)}
                        className={cn(
                          "flex items-center gap-3 w-full text-left transition-all hover:opacity-80 rounded-lg p-1",
                          filterRating === star && "opacity-100"
                        )}
                      >
                        <span
                          className="text-xs font-bold w-8"
                          style={{ color: 'var(--portfolio-body-text)' }}
                        >
                          {star}★
                        </span>
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ background: 'var(--portfolio-border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              background: 'var(--portfolio-primary)',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold w-8 text-right"
                          style={{ color: 'var(--portfolio-muted-text)' }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Info */}
              {filterRating !== 'all' && (
                <div className="mt-6 pt-6 border-t flex items-center justify-between"
                  style={{ borderColor: 'var(--portfolio-border)' }}
                >
                  <p
                    className="text-sm"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    Showing only <strong style={{ color: 'var(--portfolio-primary)' }}>{filterRating}★</strong> reviews
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFilterRating('all')}
                    className="text-xs font-bold"
                    style={{ color: 'var(--portfolio-primary)' }}
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS GRID */}
      <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {reviews.length === 0 ? (
            <div className="text-center py-32">
              <MessageCircle
                className="w-20 h-20 mx-auto mb-6"
                style={{ color: 'var(--portfolio-muted-text)', opacity: 0.2 }}
              />
              <h3
                className="text-2xl font-headline font-bold mb-3"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Reviews Coming Soon
              </h3>
              <p
                className="text-sm italic"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Abhi tak koi review nahi mila.
              </p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-32">
              <p
                className="text-sm italic"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Is rating mein koi review nahi mila.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleReviews.map((review: any, idx: number) => (
                  <ReviewCard key={review.id || idx} review={review} />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-16">
                  <Button
                    size="lg"
                    onClick={() => setDisplayLimit(prev => prev + 12)}
                    className="rounded-full px-10 h-14 font-bold gap-2 shadow-xl transition-all hover:scale-105"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                    }}
                  >
                    Load More Reviews
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{ background: 'var(--portfolio-section-bg)' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at center, var(--portfolio-primary) 0%, transparent 70%)`,
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
            style={{
              borderColor: 'var(--portfolio-primary)',
              background: 'var(--portfolio-primary)10',
            }}
          >
            <Sparkles className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              Ready to Join Them?
            </span>
          </div>

          <h2
            className="text-4xl lg:text-5xl font-headline font-bold mb-6 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Let's Create Your Story
          </h2>

          <p
            className="text-lg italic mb-10 max-w-2xl mx-auto"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Join our growing family of happy clients. Book your session today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath booking karni hai.`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="rounded-full px-10 h-14 font-bold gap-2 shadow-2xl transition-all hover:scale-105"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Book Now
                </Button>
              </a>
            )}

            <Link href={`/studio/${subdomain}/book`}>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-10 h-14 font-bold gap-2 transition-all hover:scale-105"
                style={{
                  borderColor: 'var(--portfolio-primary)',
                  color: 'var(--portfolio-primary)',
                }}
              >
                Booking Form
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// REVIEW CARD
// ═══════════════════════════════════════════════════════════════

function ReviewCard({ review }: { review: any }) {
  const rating = review.rating || 5;
  const text = review.text || review.reviewText || '';
  const clientName = review.clientName || 'Happy Client';
  const eventType = review.eventType || review.event || '';
  const date = review.createdAt?.seconds
    ? new Date(review.createdAt.seconds * 1000).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div
      className="p-8 rounded-3xl flex flex-col h-full transition-all hover:-translate-y-1"
      style={{
        background: 'var(--portfolio-card-bg)',
        border: `1px solid var(--portfolio-border)`,
      }}
    >
      {/* Quote Icon */}
      <Quote
        className="w-10 h-10 mb-4"
        style={{ color: 'var(--portfolio-primary)', opacity: 0.2 }}
      />

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              "w-4 h-4",
              s <= rating ? "fill-current" : ""
            )}
            style={{ color: 'var(--portfolio-primary)' }}
          />
        ))}
      </div>

      {/* Text */}
      <p
        className="text-sm leading-relaxed mb-6 italic flex-1"
        style={{ color: 'var(--portfolio-body-text)' }}
      >
        "{text}"
      </p>

      {/* Footer */}
      <div
        className="pt-4 border-t"
        style={{ borderColor: 'var(--portfolio-border)' }}
      >
        <p
          className="text-sm font-bold mb-1"
          style={{ color: 'var(--portfolio-heading-text)' }}
        >
          — {clientName}
        </p>
        <div className="flex items-center justify-between gap-2">
          {eventType && (
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              {eventType}
            </span>
          )}
          {date && (
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              {date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}