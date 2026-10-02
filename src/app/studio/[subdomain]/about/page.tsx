"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, MapPin, MessageCircle, Sparkles, Award, ArrowRight,
  Heart, Star, Users, Clock, CheckCircle2, Instagram,
  Facebook, Youtube, Music2, Mail, Phone, Building2,
  Calendar, Trophy, Target, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { getTheme } from "@/lib/portfolio-themes";
import { cn } from "@/lib/utils";

export default function AboutPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fresh branding URLs
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

        // Load reviews
        try {
          const reviewsQuery = query(
            collection(firestore, "networkReviews"),
            where("professionalId", "==", photographerData.userId)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {}
      } catch (err) {
        console.error("[ABOUT_LOAD]", err);
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

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

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

  const studioName = photographer.studioName || "Studio";
  const photographerName = photographer.photographerName || studioName;
  const photographerPhoto = photographer.photographerPhoto;
  const aboutBio = photographer.aboutBio;
  const city = photographer.city;
  const whatsapp = photographer.whatsappNumber;
  const instagram = photographer.instagramLink;
  const facebook = photographer.facebookLink;
  const youtube = photographer.youtubeLink;
  const tiktok = photographer.tiktokLink;
  const email = photographer.email;
  const services = photographer.services || [];
  const stats = photographer.stats || { years: 5, clients: 100, appreciations: 0 };

  // Timeline (photographer ke stats se generate)
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - (stats.years || 5);
  const timeline = [
    {
      year: String(startYear),
      title: "The Beginning",
      description: `Started ${studioName} with a passion for capturing timeless moments.`,
      icon: <Sparkles />,
    },
    {
      year: String(startYear + 2),
      title: "First Growth",
      description: `Expanded to natural light portraits and engagement sessions. Built signature style.`,
      icon: <Camera />,
    },
    {
      year: String(startYear + 3),
      title: "Studio Opened",
      description: `Opened dedicated studio space designed for natural light and elegant portraiture.`,
      icon: <Building2 />,
    },
    {
      year: String(startYear + 4),
      title: "Team Expansion",
      description: `Brought together a creative team of editors and videographers for complete services.`,
      icon: <Users />,
    },
    {
      year: String(currentYear),
      title: "Award Winning",
      description: `${stats.clients}+ happy clients served across Pakistan and beyond.`,
      icon: <Trophy />,
    },
  ];

  // Philosophy
  const philosophy = [
    {
      icon: <Heart />,
      title: "Emotion First",
      description: "I focus on real feelings and candid moments. We create space for you to be yourselves, capturing genuine connection over staged poses.",
    },
    {
      icon: <Camera />,
      title: "Storytelling",
      description: "Every couple, family, and individual has a unique narrative. I craft visuals that weave your story into beautiful imagery — honest and heartfelt.",
    },
    {
      icon: <Star />,
      title: "Timeless Elegance",
      description: "Classic, refined, and elegant. My style is natural, warm, and enduring — photography you'll treasure for decades, beyond trends.",
    },
    {
      icon: <Target />,
      title: "Bespoke Experience",
      description: "Every session is tailored to your story. We plan everything around you — your vibe, your style, your vision.",
    },
  ];

  // Why Choose Us
  const whyChooseUs = [
    "Bespoke Experience — tailored to your story",
    "Luxury Editing — fine art editing with natural tones",
    "Personal Touch — treat you like family",
    "Professional Equipment — latest gear & backup",
    "Fast Delivery — preview within 5-7 days",
    "Lifetime Memories — high-resolution originals",
  ];

  return (
    <>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PAGE HERO */}
      {/* ═══════════════════════════════════════════════════ */}
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
            <Sparkles className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              About The Photographer
            </span>
          </div>
          <h1
            className="text-5xl lg:text-7xl font-headline font-bold mb-4 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Meet {photographerName.split(' ')[0]}
          </h1>
          <p
            className="text-lg lg:text-xl max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Photographer · Storyteller · Creative Director
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PHOTOGRAPHER INTRO */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
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
                    alt={photographerName}
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
                <p className="text-3xl font-headline font-bold">{stats.clients}+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest">Happy Clients</p>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-6">
              <h2
                className="text-4xl lg:text-5xl font-headline font-bold leading-tight"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Hi, I'm {photographerName}
              </h2>

              <p
                className="text-base lg:text-lg leading-relaxed"
                style={{ color: 'var(--portfolio-body-text)' }}
              >
                {aboutBio || `I'm the founder and photographer behind ${studioName}. Based in ${city || 'Pakistan'}, I've spent the last ${stats.years} years capturing timeless love stories, portraits, and moments that matter.`}
              </p>

              <p
                className="text-base leading-relaxed italic"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                "Every frame is a memory made to be cherished for a lifetime."
              </p>

              {/* Contact Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath kaam karne mein interest hai.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      className="rounded-full px-6 h-12 font-bold gap-2 transition-all hover:scale-105"
                      style={{
                        background: 'var(--portfolio-primary)',
                        color: 'var(--portfolio-primary-text)',
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact Me
                    </Button>
                  </a>
                )}
                <Link href="/portfolio">
                  <Button
                    variant="outline"
                    className="rounded-full px-6 h-12 font-bold gap-2 transition-all hover:scale-105"
                    style={{
                      borderColor: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary)',
                    }}
                  >
                    View Portfolio
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Location */}
              {city && (
                <div
                  className="flex items-center gap-2 pt-2 text-sm"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  <MapPin className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
                  Based in {city}, serving across Pakistan
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PHILOSOPHY */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-section-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-headline font-bold mb-3"
              style={{ color: 'var(--portfolio-heading-text)' }}
            >
              My Philosophy
            </h2>
            <p
              className="text-sm uppercase tracking-widest"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              Intentional · Authentic · Timeless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {philosophy.map((item, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl text-center transition-all hover:-translate-y-1"
                style={{
                  background: 'var(--portfolio-card-bg)',
                  border: `1px solid var(--portfolio-border)`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                  style={{ background: 'var(--portfolio-primary)15' }}
                >
                  <div className="w-6 h-6" style={{ color: 'var(--portfolio-primary)' }}>
                    {item.icon}
                  </div>
                </div>
                <h3
                  className="text-lg font-headline font-bold mb-3 uppercase tracking-wider"
                  style={{ color: 'var(--portfolio-heading-text)' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--portfolio-body-text)' }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TIMELINE */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-headline font-bold mb-3"
              style={{ color: 'var(--portfolio-heading-text)' }}
            >
              My Journey
            </h2>
            <p
              className="text-sm uppercase tracking-widest"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              {stats.years}+ years of storytelling
            </p>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div
              className="absolute left-6 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-px hidden lg:block"
              style={{ background: 'var(--portfolio-border)' }}
            />

            <div className="space-y-12">
              {timeline.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative flex gap-6 lg:gap-8 items-center",
                    idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  )}
                >
                  {/* Content */}
                  <div className="flex-1 lg:text-right">
                    <div
                      className={cn(
                        "p-6 rounded-2xl inline-block max-w-md text-left",
                        idx % 2 !== 0 && "lg:text-right"
                      )}
                      style={{
                        background: 'var(--portfolio-card-bg)',
                        border: `1px solid var(--portfolio-border)`,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: 'var(--portfolio-primary)15' }}
                        >
                          <div className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }}>
                            {item.icon}
                          </div>
                        </div>
                        <span
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: 'var(--portfolio-primary)' }}
                        >
                          {item.year}
                        </span>
                      </div>
                      <h3
                        className="text-xl font-headline font-bold mb-2"
                        style={{ color: 'var(--portfolio-heading-text)' }}
                      >
                        {item.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--portfolio-body-text)' }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Dot */}
                  <div
                    className="w-3 h-3 rounded-full hidden lg:block shrink-0 z-10"
                    style={{
                      background: 'var(--portfolio-primary)',
                      boxShadow: `0 0 0 4px var(--portfolio-page-bg), 0 0 0 6px var(--portfolio-primary)40`,
                    }}
                  />

                  {/* Empty space */}
                  <div className="flex-1 hidden lg:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SERVICES */}
      {/* ═══════════════════════════════════════════════════ */}
      {services.length > 0 && (
        <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-section-bg)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2
                className="text-4xl lg:text-5xl font-headline font-bold mb-3"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Services
              </h2>
              <p
                className="text-sm uppercase tracking-widest"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                What I offer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service: any, idx: number) => (
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
                    style={{ background: 'var(--portfolio-primary)15' }}
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
      {/* WHY CHOOSE US */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-6">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
                style={{
                  borderColor: 'var(--portfolio-primary)',
                  background: 'var(--portfolio-primary)10',
                }}
              >
                <Zap className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: 'var(--portfolio-primary)' }}
                >
                  Why Choose Us
                </span>
              </div>

              <h2
                className="text-4xl lg:text-5xl font-headline font-bold leading-tight"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Your Story, Our Craft
              </h2>

              <ul className="space-y-3">
                {whyChooseUs.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'var(--portfolio-primary)20' }}
                    >
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
                    </div>
                    <span
                      className="text-sm lg:text-base leading-relaxed"
                      style={{ color: 'var(--portfolio-body-text)' }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard value={`${stats.years}+`} label="Years Experience" />
              <StatCard value={`${stats.clients}+`} label="Happy Clients" />
              <StatCard value={`${stats.appreciations}+`} label="Appreciations" />
              <StatCard value={avgRating} label="Avg Rating" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════════════════════ */}
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
          <h2
            className="text-4xl lg:text-5xl font-headline font-bold mb-6 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Let's Create Something Beautiful
          </h2>

          <p
            className="text-lg italic mb-10 max-w-2xl mx-auto"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Have a project in mind? I'd love to hear from you.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath baat karni hai.`)}`}
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
                  Let's Chat
                </Button>
              </a>
            )}

            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-10 h-14 font-bold gap-2 transition-all hover:scale-105"
                style={{
                  borderColor: 'var(--portfolio-primary)',
                  color: 'var(--portfolio-primary)',
                }}
              >
                Contact Form
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="p-6 rounded-2xl text-center"
      style={{
        background: 'var(--portfolio-card-bg)',
        border: `1px solid var(--portfolio-border)`,
      }}
    >
      <p
        className="text-3xl lg:text-4xl font-headline font-bold mb-2"
        style={{ color: 'var(--portfolio-primary)' }}
      >
        {value}
      </p>
      <p
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--portfolio-muted-text)' }}
      >
        {label}
      </p>
    </div>
  );
}