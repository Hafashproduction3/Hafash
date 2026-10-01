"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, MapPin, MessageCircle, Instagram, Sparkles, Award,
  Crown, AlertTriangle, Star, Heart, Eye, Users, Calendar,
  Play, ChevronRight, Phone, Mail, ArrowRight, Quote,
  CheckCircle2, Facebook, Youtube, Music2, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HafashLoader } from "@/components/ui/hafash-loader";
import { getTheme } from "@/lib/portfolio-themes";

export default function StudioPortfolioPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [galleries, setGalleries] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

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

        if (userSnap.empty) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const photographerData = {
          userId: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        };
        setPhotographer(photographerData);

        // ✅ Enterprise + expiry check
        const planId = photographerData.planId;
        let canUseSubdomain = planId === "enterprise";

        if (canUseSubdomain && photographerData.planExpiryDate) {
          try {
            const expiryDate = photographerData.planExpiryDate;
            let expiryMs: number;
            if (expiryDate?.seconds) expiryMs = expiryDate.seconds * 1000;
            else if (expiryDate?.toDate) expiryMs = expiryDate.toDate().getTime();
            else expiryMs = new Date(expiryDate).getTime();
            canUseSubdomain = expiryMs > Date.now();
          } catch {
            canUseSubdomain = false;
          }
        } else if (canUseSubdomain && !photographerData.planExpiryDate) {
          canUseSubdomain = false;
        }

        if (!canUseSubdomain) {
          setNeedsUpgrade(true);
          setLoading(false);
          return;
        }

        // ✅ Load galleries
        const galleriesQuery = query(
          collection(firestore, "galleries"),
          where("userId", "==", photographerData.userId),
          where("isPublic", "==", true)
        );
        const galleriesSnap = await getDocs(galleriesQuery);

        if (cancelled) return;

        const galleriesData = galleriesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => {
            const aT = new Date(a.createdAt || 0).getTime();
            const bT = new Date(b.createdAt || 0).getTime();
            return bT - aT;
          });

        setGalleries(galleriesData);

        // ✅ Load reviews (if any)
        try {
          const reviewsQuery = query(
            collection(firestore, "networkReviews"),
            where("professionalId", "==", photographerData.userId),
            where("approved", "==", true)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          // Silent fail
        }

      } catch (err: any) {
        console.error("[STUDIO_LOAD]", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [firestore, subdomain]);

  // ✅ Get theme
  const theme = useMemo(() => getTheme(photographer?.theme), [photographer?.theme]);

  const stats = useMemo(() => {
    const totalGalleries = galleries.length;
    const totalPhotos = galleries.reduce((acc, g) => acc + (g.photoCount || 0), 0);
    return {
      totalGalleries,
      totalPhotos,
      years: photographer?.stats?.years || 5,
      clients: photographer?.stats?.clients || 100,
      appreciations: photographer?.stats?.appreciations || 0,
    };
  }, [galleries, photographer?.stats]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  if (loading) return <HafashLoader text="Loading studio..." />;

  if (needsUpgrade && photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: theme.colors.pageBg }}>
        <Card className="max-w-lg rounded-[2.5rem] border-primary/30 shadow-2xl overflow-hidden">
          <div className="h-1" style={{ background: `linear-gradient(to right, ${theme.colors.primary}, transparent)` }} />
          <CardContent className="p-10 text-center space-y-6">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <Crown className="w-10 h-10" style={{ color: theme.colors.primary }} />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-headline font-bold">Portfolio Coming Soon</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>{photographer.studioName}</strong> ka portfolio abhi activate nahi hua.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Photographer Ke Liye</p>
                <p className="text-xs text-amber-200/80 mt-1">Apna portfolio live karne ke liye Enterprise plan activate karein.</p>
              </div>
            </div>
            <Link href="/storage">
              <Button className="w-full h-12 rounded-xl font-bold gap-2" style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                <Crown className="w-4 h-4" /> View Enterprise Plan
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full h-12 rounded-xl">Back to Hafash</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: theme.colors.pageBg }}>
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <Camera className="w-14 h-14 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-headline font-bold" style={{ color: theme.colors.headingText }}>Studio Not Found</h2>
            <p className="text-sm" style={{ color: theme.colors.mutedText }}>Yeh studio ab available nahi hai.</p>
            <Link href="/">
              <Button variant="outline" className="rounded-xl">Go to Hafash</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studioName = photographer.studioName || "Professional Studio";
  const logo = photographer.studioLogo;
  const banner = photographer.studioBanner;
  const whatsapp = photographer.whatsappNumber;
  const instagram = photographer.instagramLink;
  const facebook = photographer.facebookLink;
  const youtube = photographer.youtubeLink;
  const tiktok = photographer.tiktokLink;
  const tagline = photographer.tagline;
  const city = photographer.city;
  const aboutBio = photographer.aboutBio;
  const photographerPhoto = photographer.photographerPhoto;
  const services = photographer.services || [];
  const packages = photographer.packages || [];
  const videoUrl = photographer.videoUrl;
  const displayGalleries = galleries.slice(0, 6);

  return (
    <div className="min-h-screen" style={{ background: theme.colors.pageBg, color: theme.colors.bodyText }}>

      {/* ═══ HEADER ═══ */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ background: theme.colors.headerBg, borderColor: theme.colors.headerBorder }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/studio/${subdomain}`} className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={studioName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center font-headline font-bold"
                style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                {studioName.charAt(0)}
              </div>
            )}
            <span className="font-headline font-bold text-lg hidden sm:block" style={{ color: theme.colors.headerText }}>
              {studioName}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <a href="#home" className="text-sm font-bold hover:opacity-70 transition" style={{ color: theme.colors.headerText }}>Home</a>
            <a href="#galleries" className="text-sm font-bold hover:opacity-70 transition" style={{ color: theme.colors.headerText }}>Galleries</a>
            <a href="#about" className="text-sm font-bold hover:opacity-70 transition" style={{ color: theme.colors.headerText }}>About</a>
            <a href="#booking" className="text-sm font-bold hover:opacity-70 transition" style={{ color: theme.colors.headerText }}>Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="rounded-full gap-2 font-bold" style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section id="home" className="relative h-[85vh] lg:h-[90vh] overflow-hidden">
        {banner ? (
          <img src={banner} alt={studioName} className="absolute inset-0 w-full h-full object-cover" />
        ) : galleries[0]?.coverImage ? (
          <img src={galleries[0].coverImage} alt={studioName} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.pageBg})` }} />
        )}

        <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />

        <div className="relative h-full flex flex-col justify-center max-w-7xl mx-auto px-6">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-md"
              style={{ borderColor: `${theme.colors.primary}40`, background: `${theme.colors.primary}15` }}>
              <Sparkles className="w-3 h-3" style={{ color: theme.colors.primary }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                Welcome to {studioName}
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-headline font-bold leading-[1.05] tracking-tight" style={{ color: theme.colors.heroText }}>
              {tagline || "Capturing Your Most Beautiful Moments"}
            </h1>

            <p className="text-lg lg:text-xl max-w-2xl" style={{ color: `${theme.colors.heroText}CC` }}>
              Wedding · Events · Portraits · Lifestyle
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a href="#galleries">
                <Button size="lg" className="rounded-full px-8 h-14 font-bold gap-2 shadow-2xl"
                  style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                  Explore Galleries <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="rounded-full px-8 h-14 font-bold gap-2 backdrop-blur-md"
                    style={{ background: `${theme.colors.heroText}15`, color: theme.colors.heroText, borderColor: `${theme.colors.heroText}30` }}>
                    <Phone className="w-4 h-4" /> Contact on WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-10 border-b" style={{ background: theme.colors.sectionBg, borderColor: theme.colors.border }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem icon={<Camera />} value={`${stats.totalGalleries}+`} label="Projects" theme={theme} />
          <StatItem icon={<Heart />} value={`${stats.appreciations}+`} label="Appreciations" theme={theme} />
          <StatItem icon={<Eye />} value={`${stats.totalPhotos}+`} label="Views" theme={theme} />
          <StatItem icon={<Award />} value={`${stats.years}+`} label="Years Experience" theme={theme} />
        </div>
      </section>

      {/* ═══ FEATURED GALLERIES ═══ */}
      <section id="galleries" className="py-20 lg:py-24" style={{ background: theme.colors.pageBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                  Featured Galleries
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold" style={{ color: theme.colors.headingText }}>
                Explore My Work
              </h2>
            </div>
            {galleries.length > 6 && (
              <a href="#all-galleries" className="text-sm font-bold flex items-center gap-2" style={{ color: theme.colors.primary }}>
                View All <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {displayGalleries.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed rounded-[3rem]" style={{ borderColor: theme.colors.border }}>
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: theme.colors.mutedText }} />
              <p className="text-lg italic" style={{ color: theme.colors.mutedText }}>Portfolio coming soon...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayGalleries.map((gallery: any) => (
                <Link key={gallery.id} href={`/gallery/${gallery.slug || gallery.id}`} className="group">
                  <Card className="overflow-hidden rounded-[2rem] border-0 hover:-translate-y-2 transition-all duration-500"
                    style={{ background: theme.colors.cardBg, borderColor: theme.colors.border }}>
                    <div className="aspect-[4/5] relative overflow-hidden">
                      {gallery.coverImage ? (
                        <img src={gallery.coverImage} alt={gallery.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: theme.colors.sectionBg }}>
                          <Camera className="w-12 h-12 opacity-30" style={{ color: theme.colors.mutedText }} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <Badge className="mb-3 text-[10px] uppercase tracking-widest"
                          style={{ background: `${theme.colors.primary}30`, color: theme.colors.primary, border: `1px solid ${theme.colors.primary}50` }}>
                          {gallery.category}
                        </Badge>
                        <h3 className="text-2xl font-headline font-bold text-white drop-shadow-2xl">{gallery.title}</h3>
                        {gallery.clientName && <p className="text-white/70 text-sm mt-1">{gallery.clientName}</p>}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ ABOUT ME ═══ */}
      {(aboutBio || photographerPhoto) && (
        <section id="about" className="py-20 lg:py-24" style={{ background: theme.colors.sectionBg }}>
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              {photographerPhoto ? (
                <img src={photographerPhoto} alt="Photographer" className="w-full aspect-[4/5] object-cover rounded-[2rem] shadow-2xl" />
              ) : (
                <div className="w-full aspect-[4/5] rounded-[2rem] flex items-center justify-center" style={{ background: theme.colors.cardBg }}>
                  <Camera className="w-24 h-24 opacity-10" style={{ color: theme.colors.mutedText }} />
                </div>
              )}
              <div className="absolute -bottom-6 -right-6 px-6 py-4 rounded-2xl shadow-2xl hidden lg:block"
                style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                <p className="text-3xl font-headline font-bold">{stats.clients}+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest">Happy Clients</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                  About Me
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold leading-tight" style={{ color: theme.colors.headingText }}>
                Turning Moments Into Timeless Memories
              </h2>
              <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: theme.colors.bodyText }}>
                {aboutBio || `Hi, I'm ${photographer.photographerName}. I'm a professional wedding photographer based in ${city}. I believe in real emotions, natural moments, and timeless storytelling.`}
              </p>

              {services.length > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-6">
                  {services.slice(0, 4).map((service: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: theme.colors.primary }} />
                      <span className="text-sm font-bold" style={{ color: theme.colors.headingText }}>{service.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PRICING PACKAGES ═══ */}
      {packages.length > 0 && (
        <section className="py-20 lg:py-24" style={{ background: theme.colors.pageBg }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                  Pricing
                </span>
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold" style={{ color: theme.colors.headingText }}>
                Choose Your Package
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {packages.map((pkg: any, idx: number) => (
                <Card key={idx} className="rounded-[2rem] overflow-hidden border-2 p-8 space-y-6 hover:-translate-y-2 transition-all"
                  style={{ background: theme.colors.cardBg, borderColor: idx === 1 ? theme.colors.primary : theme.colors.border }}>
                  <div>
                    <h3 className="text-2xl font-headline font-bold" style={{ color: theme.colors.headingText }}>{pkg.name}</h3>
                    <div className="flex items-baseline gap-2 mt-4">
                      <span className="text-4xl font-headline font-bold" style={{ color: theme.colors.primary }}>
                        Rs. {pkg.price?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {(pkg.features || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: theme.colors.primary }} />
                        <span style={{ color: theme.colors.bodyText }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`I want to book ${pkg.name} package`)}`} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full rounded-xl h-12 font-bold" style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                        Book {pkg.name}
                      </Button>
                    </a>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ VIDEO SECTION ═══ */}
      {videoUrl && (
        <section className="py-20 lg:py-24" style={{ background: theme.colors.sectionBg }}>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                Watch
              </span>
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
            </div>
            <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-10" style={{ color: theme.colors.headingText }}>
              Our Latest Film
            </h2>
            <div className="aspect-video rounded-[2rem] overflow-hidden shadow-2xl">
              <iframe src={videoUrl} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        </section>
      )}

      {/* ═══ CLIENT REVIEWS ═══ */}
      {reviews.length > 0 && (
        <section className="py-20 lg:py-24" style={{ background: theme.colors.pageBg }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ background: `${theme.colors.primary}15`, border: `1px solid ${theme.colors.primary}30` }}>
                <Star className="w-3 h-3 fill-current" style={{ color: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                  Client Reviews
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-3" style={{ color: theme.colors.headingText }}>
                Real Stories From Couples
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Star className="w-5 h-5 fill-current" style={{ color: theme.colors.primary }} />
                <span className="font-bold text-xl" style={{ color: theme.colors.headingText }}>{avgRating}</span>
                <span style={{ color: theme.colors.mutedText }}>({reviews.length} reviews)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((review: any, idx: number) => (
                <Card key={idx} className="rounded-[2rem] p-8 space-y-4" style={{ background: theme.colors.cardBg, borderColor: theme.colors.border }}>
                  <Quote className="w-8 h-8 opacity-20" style={{ color: theme.colors.primary }} />
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= (review.rating || 5) ? "fill-current" : ""}`} style={{ color: theme.colors.primary }} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: theme.colors.bodyText }}>
                    {review.text || review.reviewText}
                  </p>
                  <div className="pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                    <p className="font-bold text-sm" style={{ color: theme.colors.headingText }}>{review.clientName || "Happy Client"}</p>
                    <p className="text-xs" style={{ color: theme.colors.mutedText }}>{review.eventType || "Wedding"}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ BOOKING FORM ═══ */}
      <section id="booking" className="py-20 lg:py-24" style={{ background: theme.colors.sectionBg }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                Contact
              </span>
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
            </div>
            <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-3" style={{ color: theme.colors.headingText }}>
              Let's Work Together
            </h2>
            <p style={{ color: theme.colors.mutedText }}>Have a project in mind? I'd love to hear from you.</p>
          </div>

          <Card className="rounded-[2rem] p-8 lg:p-12" style={{ background: theme.colors.cardBg, borderColor: theme.colors.border }}>
            <div className="text-center space-y-6">
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Salam, I want to book you for my event.`)}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="rounded-full px-10 h-16 font-bold gap-3 text-lg shadow-2xl"
                    style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                    <MessageCircle className="w-6 h-6" />
                    Contact on WhatsApp
                  </Button>
                </a>
              )}

              <div className="flex items-center justify-center gap-6 pt-6 flex-wrap">
                {instagram && (
                  <a href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace("@", "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold hover:opacity-70"
                    style={{ color: theme.colors.headingText }}>
                    <Instagram className="w-5 h-5" /> Instagram
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold hover:opacity-70"
                    style={{ color: theme.colors.headingText }}>
                    <Facebook className="w-5 h-5" /> Facebook
                  </a>
                )}
                {youtube && (
                  <a href={youtube} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold hover:opacity-70"
                    style={{ color: theme.colors.headingText }}>
                    <Youtube className="w-5 h-5" /> YouTube
                  </a>
                )}
                {tiktok && (
                  <a href={tiktok} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold hover:opacity-70"
                    style={{ color: theme.colors.headingText }}>
                    <Music2 className="w-5 h-5" /> TikTok
                  </a>
                )}
              </div>

              {city && (
                <div className="flex items-center justify-center gap-2 pt-4 text-sm" style={{ color: theme.colors.mutedText }}>
                  <MapPin className="w-4 h-4" style={{ color: theme.colors.primary }} />
                  {city}
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12" style={{ background: theme.colors.footerBg, color: theme.colors.footerText }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 opacity-50">
              <img src="/hafash-logo.png" alt="Hafash" className="h-8 w-auto grayscale brightness-200" />
              <span className="text-[10px] font-bold uppercase tracking-[0.5em]">Powered by Hafash</span>
            </div>
            <p className="text-xs">© 2026 {studioName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══ Sub-component: Stat Item ═══
function StatItem({ icon, value, label, theme }: { icon: React.ReactNode; value: string; label: string; theme: any }) {
  return (
    <div className="text-center space-y-2">
      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${theme.colors.primary}15` }}>
        <div style={{ color: theme.colors.primary }}>{icon}</div>
      </div>
      <p className="text-3xl lg:text-4xl font-headline font-bold" style={{ color: theme.colors.headingText }}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.colors.mutedText }}>{label}</p>
    </div>
  );
}