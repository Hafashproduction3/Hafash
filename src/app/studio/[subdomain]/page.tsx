"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, MapPin, MessageCircle, Instagram, Sparkles, Award,
  Crown, Star, Heart, Eye, ArrowRight, Quote, CheckCircle2,
  Calendar, Clock, Users, Play
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

        // Branding keys fresh
        const brandingKeys: string[] = [];
        if (photographerData.studioLogoKey) brandingKeys.push(photographerData.studioLogoKey);
        if (photographerData.studioBannerKey) brandingKeys.push(photographerData.studioBannerKey);
        if (photographerData.photographerPhotoKey) brandingKeys.push(photographerData.photographerPhotoKey);

        let brandingUrlMap: Record<string, string> = {};
        if (brandingKeys.length > 0) {
          try {
            const result = await refreshPhotoUrls(brandingKeys);
            if (result.success) brandingUrlMap = result.urls;
          } catch {}
        }

        if (photographerData.studioLogoKey && brandingUrlMap[photographerData.studioLogoKey]) {
          photographerData.studioLogo = brandingUrlMap[photographerData.studioLogoKey];
        }
        if (photographerData.studioBannerKey && brandingUrlMap[photographerData.studioBannerKey]) {
          photographerData.studioBanner = brandingUrlMap[photographerData.studioBannerKey];
        }
        if (photographerData.photographerPhotoKey && brandingUrlMap[photographerData.photographerPhotoKey]) {
          photographerData.photographerPhoto = brandingUrlMap[photographerData.photographerPhotoKey];
        }

        setPhotographer(photographerData);

        // Portfolio photos
        const rawPhotos: any[] = photographerData.portfolioPhotos || [];
        if (rawPhotos.length > 0) {
          const keysToRefresh: string[] = [];
          rawPhotos.forEach((p: any) => {
            if (p.storageKey) keysToRefresh.push(p.storageKey);
            if (p.thumbKey) keysToRefresh.push(p.thumbKey);
          });

          let urlMap: Record<string, string> = {};
          if (keysToRefresh.length > 0) {
            try {
              const result = await refreshPhotoUrls(keysToRefresh);
              if (result.success) urlMap = result.urls;
            } catch {}
          }

          const refreshed = rawPhotos
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((p: any) => ({
              ...p,
              url: urlMap[p.storageKey] || p.url || '',
              thumbUrl: p.thumbKey
                ? (urlMap[p.thumbKey] || p.thumbUrl || p.url)
                : (urlMap[p.storageKey] || p.url || ''),
            }));

          if (!cancelled) setPortfolioPhotos(refreshed);
        }

        // Reviews
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
  const instagram = photographer.instagramLink;
  const tagline = photographer.tagline;
  const city = photographer.city;
  const aboutBio = photographer.aboutBio;
  const photographerPhoto = photographer.photographerPhoto;
  const services = photographer.services || [];
  const packages = photographer.packages || [];
  const heroImage = banner || portfolioPhotos[0]?.url;

  return (
    <div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="relative h-[90vh] min-h-[600px] overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={studioName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, var(--portfolio-primary)20, var(--portfolio-page-bg))`,
            }}
          />
        )}

        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'var(--portfolio-hero-overlay)' }}
        />

        {/* Content */}
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
            <div className="max-w-3xl space-y-8">

              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md"
                style={{
                  borderColor: 'var(--portfolio-primary)',
                  background: 'var(--portfolio-primary)15',
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

              {/* Heading */}
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-headline font-bold leading-[1.05] tracking-tight"
                style={{ color: 'var(--portfolio-hero-text)' }}
              >
                {tagline || 'Capturing Your Most Beautiful Moments'}
              </h1>

              {/* Subheading */}
              <p
                className="text-lg lg:text-xl max-w-2xl leading-relaxed"
                style={{ color: 'var(--portfolio-hero-text)', opacity: 0.85 }}
              >
                Wedding · Events · Portraits · Lifestyle
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link href="/portfolio">
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-14 font-bold gap-2 shadow-2xl transition-all hover:scale-105"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
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
                      variant="outline"
                      className="rounded-full px-8 h-14 font-bold gap-2 backdrop-blur-md transition-all hover:scale-105"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: 'var(--portfolio-hero-text)',
                        borderColor: 'rgba(255,255,255,0.3)',
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

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div
            className="w-6 h-10 rounded-full border-2 flex items-start justify-center p-1"
            style={{ borderColor: 'var(--portfolio-hero-text)', opacity: 0.4 }}
          >
            <div
              className="w-1 h-2 rounded-full"
              style={{ background: 'var(--portfolio-hero-text)' }}
            />
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
      {/* ABOUT THE PHOTOGRAPHER */}
      {/* ═══════════════════════════════════════════════════ */}
      {(photographerPhoto || aboutBio) && (
        <section className="py-20 lg:py-28" style={{ background: 'var(--portfolio-page-bg)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">

            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.4em]"
                  style={{ color: 'var(--portfolio-primary)' }}
                >
                  About The Photographer
                </span>
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
              </div>
            </div>

            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Photo */}
              <div className="relative">
                <div
                  className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl"
                  style={{ border: `1px solid var(--portfolio-border)` }}
                >
                  {photographerPhoto ? (
                    <img
                      src={photographerPhoto}
                      alt={photographer.photographerName || studioName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: 'var(--portfolio-card-bg)' }}
                    >
                      <Camera className="w-24 h-24" style={{ color: 'var(--portfolio-muted-text)', opacity: 0.2 }} />
                    </div>
                  )}
                </div>

                {/* Floating Badge */}
                <div
                  className="absolute -bottom-6 -right-6 px-6 py-4 rounded-2xl shadow-2xl hidden lg:block"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  <p className="text-3xl font-headline font-bold">{stats.years}+</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Years Experience</p>
                </div>
              </div>

              {/* Text */}
              <div className="space-y-6">
                <h2
                  className="text-4xl lg:text-5xl font-headline font-bold leading-tight"
                  style={{ color: 'var(--portfolio-heading-text)' }}
                >
                  Hi, I'm {photographer.photographerName || studioName}
                </h2>

                <p
                  className="text-base lg:text-lg leading-relaxed"
                  style={{ color: 'var(--portfolio-body-text)' }}
                >
                  {aboutBio || `Based in ${city || 'Pakistan'}, I'm a professional photographer capturing timeless moments with a refined, cinematic approach.`}
                </p>

                {/* Quick Facts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <FactItem icon={<MapPin />} text={city ? `${city} Based` : 'Pakistan Based'} />
                  <FactItem icon={<Camera />} text="Cinematic Style" />
                  <FactItem icon={<Clock />} text="Available for Booking" />
                  <FactItem icon={<Heart />} text="1:1 Personal Approach" />
                </div>

                {/* CTA */}
                <div className="pt-4">
                  <Link href="/about">
                    <Button
                      variant="outline"
                      className="rounded-full px-8 h-12 font-bold gap-2"
                      style={{
                        borderColor: 'var(--portfolio-primary)',
                        color: 'var(--portfolio-primary)',
                      }}
                    >
                      Read Full Story
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* FEATURED PORTFOLIO PREVIEW */}
      {/* ═══════════════════════════════════════════════════ */}
      {portfolioPhotos.length > 0 && (
        <section
          className="py-20 lg:py-28"
          style={{ background: 'var(--portfolio-section-bg)' }}
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
                My Latest Portfolio
              </h2>
            </div>

            {/* Masonry Grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {portfolioPhotos.slice(0, 6).map((photo: any, idx: number) => (
                <div
                  key={photo.id}
                  className="break-inside-avoid group relative overflow-hidden rounded-[2rem] cursor-pointer"
                  style={{ border: `1px solid var(--portfolio-border)` }}
                >
                  <img
                    src={photo.thumbUrl || photo.url}
                    alt={`Portfolio ${idx + 1}`}
                    className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110"
                    loading="lazy"
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
      {/* SERVICES */}
      {/* ═══════════════════════════════════════════════════ */}
      {services.length > 0 && (
        <section className="py-20 lg:py-28" style={{ background: 'var(--portfolio-page-bg)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.4em]"
                  style={{ color: 'var(--portfolio-primary)' }}
                >
                  What I Offer
                </span>
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
              </div>
              <h2
                className="text-4xl lg:text-5xl font-headline font-bold"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Featured Services
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service: any, idx: number) => (
                <div
                  key={idx}
                  className="p-8 rounded-3xl transition-all hover:-translate-y-1"
                  style={{
                    background: 'var(--portfolio-card-bg)',
                    border: `1px solid var(--portfolio-border)`,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{
                      background: 'var(--portfolio-primary)15',
                    }}
                  >
                    <Camera className="w-6 h-6" style={{ color: 'var(--portfolio-primary)' }} />
                  </div>
                  <h3
                    className="text-xl font-headline font-bold mb-3"
                    style={{ color: 'var(--portfolio-heading-text)' }}
                  >
                    {service.title}
                  </h3>
                  {service.description && (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--portfolio-muted-text)' }}
                    >
                      {service.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* REVIEWS */}
      {/* ═══════════════════════════════════════════════════ */}
      {reviews.length > 0 && (
        <section
          className="py-20 lg:py-28"
          style={{ background: 'var(--portfolio-section-bg)' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.4em]"
                  style={{ color: 'var(--portfolio-primary)' }}
                >
                  Loved By Couples
                </span>
                <div className="h-px w-16" style={{ background: 'var(--portfolio-primary)' }} />
              </div>
              <h2
                className="text-4xl lg:text-5xl font-headline font-bold mb-4"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Client Reviews
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={cn(
                        "w-5 h-5",
                        s <= Math.round(parseFloat(avgRating)) ? "fill-current" : ""
                      )}
                      style={{ color: 'var(--portfolio-primary)' }}
                    />
                  ))}
                </div>
                <span
                  className="font-bold text-xl"
                  style={{ color: 'var(--portfolio-heading-text)' }}
                >
                  {avgRating}
                </span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  ({reviews.length} reviews)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((review: any, idx: number) => (
                <div
                  key={idx}
                  className="p-8 rounded-3xl"
                  style={{
                    background: 'var(--portfolio-card-bg)',
                    border: `1px solid var(--portfolio-border)`,
                  }}
                >
                  <Quote
                    className="w-10 h-10 mb-4"
                    style={{ color: 'var(--portfolio-primary)', opacity: 0.2 }}
                  />
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={cn(
                          "w-4 h-4",
                          s <= (review.rating || 5) ? "fill-current" : ""
                        )}
                        style={{ color: 'var(--portfolio-primary)' }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-sm leading-relaxed mb-6 italic"
                    style={{ color: 'var(--portfolio-body-text)' }}
                  >
                    "{review.text || review.reviewText}"
                  </p>
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'var(--portfolio-primary)' }}
                  >
                    — {review.clientName || 'Happy Client'}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/reviews">
                <Button
                  variant="outline"
                  className="rounded-full px-8 h-12 font-bold gap-2"
                  style={{
                    borderColor: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary)',
                  }}
                >
                  See All Reviews
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* CTA SECTION */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="py-24 lg:py-32 relative overflow-hidden"
        style={{ background: 'var(--portfolio-page-bg)' }}
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
// HELPER COMPONENTS
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

function FactItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--portfolio-primary)15' }}
      >
        <div className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }}>
          {icon}
        </div>
      </div>
      <span
        className="text-sm font-bold"
        style={{ color: 'var(--portfolio-body-text)' }}
      >
        {text}
      </span>
    </div>
  );
}