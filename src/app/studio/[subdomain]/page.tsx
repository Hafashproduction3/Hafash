"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, MapPin, MessageCircle, Sparkles, Award,
  Crown, Star, Heart, ArrowRight, CheckCircle2,
  Calendar, Clock, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { getTheme } from "@/lib/portfolio-themes";
import { cn } from "@/lib/utils";

export default function StudioHomePage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!firestore || !subdomain) {
        setLoading(false);
        return;
      }

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

        // Use already-saved public URLs immediately.
        // Only fall back to refreshPhotoUrls for older records that do not have a URL.
        const brandingKeys: string[] = [];
        if (!photographerData.studioLogo && photographerData.studioLogoKey) brandingKeys.push(photographerData.studioLogoKey);
        if (!photographerData.studioBanner && photographerData.studioBannerKey) brandingKeys.push(photographerData.studioBannerKey);
        if (!photographerData.photographerPhoto && photographerData.photographerPhotoKey) brandingKeys.push(photographerData.photographerPhotoKey);

        if (brandingKeys.length > 0) {
          try {
            const result = await refreshPhotoUrls(brandingKeys);
            if (result.success) {
              if (!photographerData.studioLogo && photographerData.studioLogoKey) {
                photographerData.studioLogo = result.urls[photographerData.studioLogoKey] || photographerData.studioLogo || '';
              }
              if (!photographerData.studioBanner && photographerData.studioBannerKey) {
                photographerData.studioBanner = result.urls[photographerData.studioBannerKey] || photographerData.studioBanner || '';
              }
              if (!photographerData.photographerPhoto && photographerData.photographerPhotoKey) {
                photographerData.photographerPhoto = result.urls[photographerData.photographerPhotoKey] || photographerData.photographerPhoto || '';
              }
            }
          } catch {}
        }

        setPhotographer(photographerData);

        const rawPhotos: any[] = photographerData.portfolioPhotos || [];
        if (rawPhotos.length > 0) {
          // Render immediately from URLs already stored in Firestore.
          // Only refresh legacy records that are missing URLs.
          const needsRefresh = rawPhotos.some(
            (p: any) => !p.url || (p.thumbKey && !p.thumbUrl)
          );

          let urlMap: Record<string, string> = {};
          if (needsRefresh) {
            const keysToRefresh: string[] = [];
            rawPhotos.forEach((p: any) => {
              if (!p.url && p.storageKey) keysToRefresh.push(p.storageKey);
              if (p.thumbKey && !p.thumbUrl) keysToRefresh.push(p.thumbKey);
            });

            if (keysToRefresh.length > 0) {
              try {
                const result = await refreshPhotoUrls(keysToRefresh);
                if (result.success) urlMap = result.urls;
              } catch {}
            }
          }

          const refreshed = [...rawPhotos]
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((p: any) => ({
              ...p,
              url: p.url || urlMap[p.storageKey] || '',
              thumbUrl: p.thumbUrl || (p.thumbKey ? urlMap[p.thumbKey] : '') || p.url || urlMap[p.storageKey] || '',
            }));

          if (!cancelled) setPortfolioPhotos(refreshed);
        }

        try {
          const reviewsQuery = query(
            collection(firestore, "networkReviews"),
            where("professionalId", "==", photographerData.userId)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {}
      } catch (err) {
        console.error("[HOME_LOAD]", err);
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

  const stats = useMemo(() => ({
    photos: portfolioPhotos.length,
    years: photographer?.stats?.years || 5,
    clients: photographer?.stats?.clients || 100,
    appreciations: photographer?.stats?.appreciations || 0,
  }), [portfolioPhotos, photographer?.stats]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
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

  const studioName = photographer.studioName || "Studio";
  const banner = photographer.studioBanner;
  const whatsapp = photographer.whatsappNumber;
  const tagline = photographer.tagline;
  const city = photographer.city;
  const aboutBio = photographer.aboutBio;
  const heroImage = banner || portfolioPhotos[0]?.url;
  const satisfactionPercent = Math.round(parseFloat(avgRating) * 19.6);

  return (
    <div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* KEN BURNS ANIMATION */}
      {/* ═══════════════════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="relative h-[90vh] min-h-[700px] overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={studioName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            style={{
              animation: 'kenburns 25s ease-in-out infinite alternate',
              transformOrigin: 'center',
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, var(--portfolio-primary)20, var(--portfolio-page-bg))`,
            }}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.55), rgba(0,0,0,0.25))',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.15), rgba(0,0,0,0.5))',
          }}
        />

        <div className="relative h-full flex flex-col">
          <div className="flex-1 flex items-center">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full pt-20">
              <div className="max-w-2xl space-y-7">

                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-sm"
                  style={{
                    borderColor: 'var(--portfolio-primary)80',
                    background: 'var(--portfolio-primary)10',
                  }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: 'var(--portfolio-primary)' }}
                  >
                    Welcome to {studioName}
                  </span>
                </div>

                <h1
                  className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-headline font-bold leading-[1.02] tracking-tight text-white"
                  style={{
                    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                >
                  {tagline || 'Capturing Emotions, Creating Memories'}
                </h1>

                <p className="text-base lg:text-lg leading-relaxed text-white/80 max-w-xl">
                  {aboutBio || `Timeless photography that tells your story. Capturing the intimate, the emotional, and the unforgettable moments with artistry and care.`}
                </p>

                <div className="grid grid-cols-3 gap-3 lg:gap-4 pt-2 max-w-xl">
                  <LuxuryStatCard
                    icon={<Camera className="w-5 h-5 lg:w-6 lg:h-6" />}
                    value={`${stats.photos}+`}
                    label="Photos Captured"
                  />
                  <LuxuryStatCard
                    icon={<Award className="w-5 h-5 lg:w-6 lg:h-6" />}
                    value={`${stats.years}+`}
                    label="Years of Expertise"
                  />
                  <LuxuryStatCard
                    icon={<Heart className="w-5 h-5 lg:w-6 lg:h-6" />}
                    value={`${satisfactionPercent}%`}
                    label="Client Satisfaction"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href="/portfolio">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-md px-7 h-12 font-bold gap-2 bg-transparent border-2 transition-all duration-300"
                      style={{
                        borderColor: 'var(--portfolio-primary)',
                        color: 'var(--portfolio-primary)',
                      }}
                    >
                      View Portfolio
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath booking karni hai.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="lg"
                        className="rounded-md px-7 h-12 font-bold gap-2 transition-all duration-300"
                        style={{
                          background: 'var(--portfolio-primary)',
                          color: 'var(--portfolio-primary-text)',
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Book on WhatsApp
                      </Button>
                    </a>
                  )}
                </div>

              </div>
            </div>
          </div>

          <div
            className="relative border-t backdrop-blur-sm"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.4)',
            }}
          >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
                <span className="text-xs lg:text-sm font-medium text-white/70 tracking-wide">
                  Now booking {new Date().getFullYear()}
                </span>
                <span
                  className="w-1 h-1 rounded-full hidden sm:block"
                  style={{ background: 'var(--portfolio-primary)' }}
                />
                <span className="text-xs lg:text-sm font-medium text-white/70 tracking-wide">
                  Wedding · Events · Portraits
                </span>
                <span
                  className="w-1 h-1 rounded-full hidden sm:block"
                  style={{ background: 'var(--portfolio-primary)' }}
                />
                <span className="text-xs lg:text-sm font-medium text-white/70 tracking-wide">
                  {city ? `${city}, Pakistan` : 'Pakistan'} · Worldwide
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* STATS BAR */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="py-12 border-y"
        style={{
          background: 'var(--portfolio-section-bg)',
          borderColor: 'var(--portfolio-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            <StatItem icon={<Camera />} value={`${stats.photos}+`} label="Photos Captured" />
            <StatItem icon={<Award />} value={`${stats.years}+`} label="Years Experience" />
            <StatItem icon={<Users />} value={`${stats.clients}+`} label="Happy Clients" />
            <StatItem icon={<Star />} value={avgRating} label="Client Rating" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MINI PORTFOLIO PREVIEW */}
      {/* ═══════════════════════════════════════════════════ */}
      {portfolioPhotos.length > 0 && (
        <section
          className="py-20 lg:py-28"
          style={{ background: 'var(--portfolio-page-bg)' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.4em]"
                  style={{ color: 'var(--portfolio-primary)' }}
                >
                  Recent Work
                </span>
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
              </div>
              <h2
                className="text-4xl lg:text-5xl font-headline font-bold"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                A Glimpse of My Work
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {portfolioPhotos.slice(0, 4).map((photo: any, idx: number) => (
                <div
                  key={photo.id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl",
                    idx === 0 && "lg:col-span-2 lg:row-span-2 lg:aspect-square",
                    idx !== 0 && "aspect-square"
                  )}
                  style={{ border: `1px solid var(--portfolio-border)` }}
                >
                  <img
                    src={photo.thumbUrl || photo.url}
                    alt={`Portfolio ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/portfolio">
                <Button
                  size="lg"
                  className="rounded-full px-10 h-14 font-bold gap-2 shadow-xl transition-all hover:scale-105"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  View Full Portfolio
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SIMPLE CTA */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="py-24 lg:py-32 relative overflow-hidden"
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
              Let's Work Together
            </span>
          </div>

          <h2
            className="text-4xl lg:text-6xl font-headline font-bold mb-6 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Ready to Capture Your Story?
          </h2>

          <p
            className="text-lg lg:text-xl mb-10 max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Let's create memories that last forever. Get in touch for bookings, packages & availability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/book">
              <Button
                size="lg"
                className="rounded-full px-10 h-14 font-bold gap-2 shadow-2xl transition-all hover:scale-105"
                style={{
                  background: 'var(--portfolio-primary)',
                  color: 'var(--portfolio-primary-text)',
                }}
              >
                Book Your Date
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath booking karni hai.`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-10 h-14 font-bold gap-2 transition-all hover:scale-105"
                  style={{
                    borderColor: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary)',
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Us
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LUXURY STAT CARD
// ═══════════════════════════════════════════════════════════════

function LuxuryStatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className="relative p-3 lg:p-5 rounded-md border backdrop-blur-sm text-center transition-all duration-300 hover:bg-black/60 group"
      style={{
        borderColor: 'var(--portfolio-primary)50',
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l"
        style={{ borderColor: 'var(--portfolio-primary)' }}
      />
      <div
        className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r"
        style={{ borderColor: 'var(--portfolio-primary)' }}
      />
      <div
        className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l"
        style={{ borderColor: 'var(--portfolio-primary)' }}
      />
      <div
        className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r"
        style={{ borderColor: 'var(--portfolio-primary)' }}
      />

      <div
        className="flex justify-center mb-2 lg:mb-3 transition-transform group-hover:scale-110"
        style={{ color: 'var(--portfolio-primary)' }}
      >
        {icon}
      </div>
      <p
        className="text-xl lg:text-3xl font-headline font-bold mb-0.5"
        style={{ color: 'var(--portfolio-primary)' }}
      >
        {value}
      </p>
      <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 leading-tight">
        {label}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT ITEM
// ═══════════════════════════════════════════════════════════════

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center space-y-3">
      <div
        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
        style={{ background: 'var(--portfolio-primary)15' }}
      >
        <div className="w-6 h-6" style={{ color: 'var(--portfolio-primary)' }}>
          {icon}
        </div>
      </div>
      <p
        className="text-3xl lg:text-4xl font-headline font-bold"
        style={{ color: 'var(--portfolio-heading-text)' }}
      >
        {value}
      </p>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: 'var(--portfolio-muted-text)' }}
      >
        {label}
      </p>
    </div>
  );
}