"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, MapPin, MessageCircle, Instagram, Sparkles, Award,
  Crown, AlertTriangle, Star, Heart, Eye,
  Phone, ArrowRight, Quote, CheckCircle2, Share2, Video,
  Calendar, Mail, User, Send, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HafashLoader } from "@/components/ui/hafash-loader";
import { getTheme } from "@/lib/portfolio-themes";
import { createBooking } from "@/app/actions/portfolio";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { EVENT_TYPES, PAKISTAN_CITIES } from "@/lib/portfolio-types";
import { useToast } from "@/hooks/use-toast";

export default function StudioPortfolioPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();
  const { toast } = useToast();

  const [photographer, setPhotographer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventDate: '',
    eventType: '',
    city: '',
    budget: '',
    message: '',
    packageSelected: '',
  });
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

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

        const photographerData: any = {
          userId: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        };
        setPhotographer(photographerData);

        // Owner check
        const isOwner = photographerData.isOwner === true;
        const planId = photographerData.planId;
        let canUseSubdomain = isOwner || planId === "enterprise";

        if (!isOwner && canUseSubdomain && photographerData.planExpiryDate) {
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
        } else if (!isOwner && canUseSubdomain && !photographerData.planExpiryDate) {
          canUseSubdomain = false;
        }

        if (!canUseSubdomain) {
          setNeedsUpgrade(true);
          setLoading(false);
          return;
        }

        // ✅ Portfolio photos — FRESH URLs generate karo
        const rawPhotos: any[] = photographerData.portfolioPhotos || [];
        
        if (rawPhotos.length > 0) {
          // Collect all storage keys
          const keysToRefresh: string[] = [];
          rawPhotos.forEach((p: any) => {
            if (p.storageKey) keysToRefresh.push(p.storageKey);
            if (p.thumbKey) keysToRefresh.push(p.thumbKey);
          });

          // Generate fresh URLs
          let urlMap: Record<string, string> = {};
          if (keysToRefresh.length > 0) {
            try {
              const result = await refreshPhotoUrls(keysToRefresh);
              if (result.success) {
                urlMap = result.urls;
              }
            } catch (err) {
              console.error('[PORTFOLIO_REFRESH]', err);
            }
          }

          // Map fresh URLs to photos
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

        // Load reviews
        try {
          const reviewsQuery = query(
            collection(firestore, "networkReviews"),
            where("professionalId", "==", photographerData.userId)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          // Silent
        }

      } catch (err: any) {
        console.error("[STUDIO_LOAD]", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firestore, subdomain]);

  const theme = useMemo(() => getTheme(photographer?.theme), [photographer?.theme]);

  const stats = useMemo(() => {
    return {
      totalPhotos: portfolioPhotos.length,
      years: photographer?.stats?.years || 5,
      clients: photographer?.stats?.clients || 100,
      appreciations: photographer?.stats?.appreciations || 0,
    };
  }, [portfolioPhotos, photographer?.stats]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photographer || isSubmittingBooking) return;

    if (!bookingForm.clientName || !bookingForm.clientPhone || !bookingForm.eventDate || !bookingForm.eventType) {
      toast({
        variant: 'destructive',
        title: 'Required fields missing',
        description: 'Name, phone, event date, aur event type zaroori hain',
      });
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const result = await createBooking({
        photographerId: photographer.userId,
        photographerSubdomain: subdomain,
        clientName: bookingForm.clientName,
        clientEmail: bookingForm.clientEmail,
        clientPhone: bookingForm.clientPhone,
        eventDate: bookingForm.eventDate,
        eventType: bookingForm.eventType,
        city: bookingForm.city,
        budget: bookingForm.budget,
        message: bookingForm.message,
        packageSelected: bookingForm.packageSelected,
      });

      if (!result.success) throw new Error(result.error);

      setBookingSubmitted(true);
      toast({
        title: '✅ Booking request sent!',
        description: 'Photographer aapko jald contact karega',
      });
    } catch (error: any) {
      console.error('[BOOKING]', error);
      toast({
        variant: 'destructive',
        title: 'Booking failed',
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  if (loading) return <HafashLoader text="Loading studio..." />;

  if (needsUpgrade && photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: theme.colors.pageBg }}>
        <Card className="max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden" style={{ borderColor: `${theme.colors.primary}50` }}>
          <div className="h-1" style={{ background: `linear-gradient(to right, ${theme.colors.primary}, transparent)` }} />
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: `${theme.colors.primary}15` }}>
              <Crown className="w-10 h-10" style={{ color: theme.colors.primary }} />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-headline font-bold" style={{ color: theme.colors.headingText }}>Portfolio Coming Soon</h2>
              <p style={{ color: theme.colors.mutedText }}>
                <strong style={{ color: theme.colors.headingText }}>{photographer.studioName}</strong> ka portfolio abhi activate nahi hua.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="rounded-xl">Go to Hafash</Button>
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
            <Camera className="w-14 h-14 mx-auto" style={{ color: theme.colors.mutedText }} />
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
  const tagline = photographer.tagline;
  const city = photographer.city;
  const aboutBio = photographer.aboutBio;
  const photographerPhoto = photographer.photographerPhoto;
  const services = photographer.services || [];
  const packages = photographer.packages || [];
  const videoUrl = photographer.videoUrl;

  return (
    <div className="min-h-screen" style={{ background: theme.colors.pageBg, color: theme.colors.bodyText }}>

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ background: theme.colors.headerBg, borderColor: theme.colors.headerBorder }}>
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
            <a href="#home" className="text-sm font-bold hover:opacity-70" style={{ color: theme.colors.headerText }}>Home</a>
            <a href="#portfolio" className="text-sm font-bold hover:opacity-70" style={{ color: theme.colors.headerText }}>Portfolio</a>
            <a href="#about" className="text-sm font-bold hover:opacity-70" style={{ color: theme.colors.headerText }}>About</a>
            <a href="#booking" className="text-sm font-bold hover:opacity-70" style={{ color: theme.colors.headerText }}>Book</a>
          </nav>

          {whatsapp && (
            <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-full gap-2 font-bold"
                style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative h-[85vh] lg:h-[90vh] overflow-hidden">
        {banner ? (
          <img src={banner} alt={studioName} className="absolute inset-0 w-full h-full object-cover" />
        ) : portfolioPhotos[0]?.url ? (
          <img src={portfolioPhotos[0].url} alt={studioName} className="absolute inset-0 w-full h-full object-cover" />
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
              <a href="#portfolio">
                <Button size="lg" className="rounded-full px-8 h-14 font-bold gap-2 shadow-2xl"
                  style={{ background: theme.colors.primary, color: theme.colors.primaryText }}>
                  View Portfolio <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#booking">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 font-bold gap-2 backdrop-blur-md"
                  style={{ background: `${theme.colors.heroText}15`, color: theme.colors.heroText, borderColor: `${theme.colors.heroText}30` }}>
                  <Calendar className="w-4 h-4" /> Book Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="py-10 border-b" style={{ background: theme.colors.sectionBg, borderColor: theme.colors.border }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem icon={<Camera className="w-5 h-5" />} value={`${stats.totalPhotos}+`} label="Portfolio Photos" theme={theme} />
          <StatItem icon={<Heart className="w-5 h-5" />} value={`${stats.appreciations}+`} label="Appreciations" theme={theme} />
          <StatItem icon={<User className="w-5 h-5" />} value={`${stats.clients}+`} label="Happy Clients" theme={theme} />
          <StatItem icon={<Award className="w-5 h-5" />} value={`${stats.years}+`} label="Years" theme={theme} />
        </div>
      </section>

      {/* PORTFOLIO PHOTOS */}
      <section id="portfolio" className="py-20 lg:py-24" style={{ background: theme.colors.pageBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>
                  Portfolio
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold" style={{ color: theme.colors.headingText }}>
                My Best Work
              </h2>
            </div>
          </div>

          {portfolioPhotos.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed rounded-[3rem]" style={{ borderColor: theme.colors.border }}>
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: theme.colors.mutedText }} />
              <p className="text-lg italic" style={{ color: theme.colors.mutedText }}>Portfolio coming soon...</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {portfolioPhotos.map((photo: any, idx: number) => (
                <div key={photo.id} className="break-inside-avoid group relative overflow-hidden rounded-[2rem]">
                  <img
                    src={photo.thumbUrl || photo.url}
                    alt={photo.caption || `Portfolio ${idx + 1}`}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-1000"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-white text-sm font-bold">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ABOUT ME */}
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
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>About Me</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold leading-tight" style={{ color: theme.colors.headingText }}>
                Turning Moments Into Timeless Memories
              </h2>
              <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: theme.colors.bodyText }}>
                {aboutBio || `Hi, I'm ${photographer.photographerName}. I'm a professional wedding photographer based in ${city}.`}
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

      {/* PRICING PACKAGES */}
      {packages.length > 0 && (
        <section className="py-20 lg:py-24" style={{ background: theme.colors.pageBg }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>Pricing</span>
                <div className="h-px w-8" style={{ background: theme.colors.primary }} />
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-bold" style={{ color: theme.colors.headingText }}>
                Choose Your Package
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {packages.map((pkg: any, idx: number) => (
                <Card key={idx} className="rounded-[2rem] overflow-hidden border-2 p-8 space-y-6"
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
                  <Button
                    className="w-full rounded-xl h-12 font-bold"
                    style={{ background: theme.colors.primary, color: theme.colors.primaryText }}
                    onClick={() => {
                      setBookingForm(prev => ({ ...prev, packageSelected: pkg.name }));
                      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Book {pkg.name}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VIDEO */}
      {videoUrl && (
        <section className="py-20 lg:py-24" style={{ background: theme.colors.sectionBg }}>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>Watch</span>
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

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="py-20 lg:py-24" style={{ background: theme.colors.pageBg }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ background: `${theme.colors.primary}15`, border: `1px solid ${theme.colors.primary}30` }}>
                <Star className="w-3 h-3 fill-current" style={{ color: theme.colors.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>Client Reviews</span>
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
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BOOKING FORM */}
      <section id="booking" className="py-20 lg:py-24" style={{ background: theme.colors.sectionBg }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.colors.primary }}>Book Now</span>
              <div className="h-px w-8" style={{ background: theme.colors.primary }} />
            </div>
            <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-3" style={{ color: theme.colors.headingText }}>
              Let's Work Together
            </h2>
            <p style={{ color: theme.colors.mutedText }}>Apna event book karne ke liye form fill karein</p>
          </div>

          <Card className="rounded-[2rem] p-8 lg:p-12" style={{ background: theme.colors.cardBg, borderColor: theme.colors.border }}>
            {bookingSubmitted ? (
              <div className="text-center space-y-6 py-10">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: `${theme.colors.primary}15` }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: theme.colors.primary }} />
                </div>
                <h3 className="text-3xl font-headline font-bold" style={{ color: theme.colors.headingText }}>
                  Booking Request Sent! 🎉
                </h3>
                <p className="text-sm" style={{ color: theme.colors.mutedText }}>
                  Photographer aapse jald rabta karega. Shukriya!
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBookingSubmitted(false);
                    setBookingForm({
                      clientName: '', clientEmail: '', clientPhone: '',
                      eventDate: '', eventType: '', city: '', budget: '',
                      message: '', packageSelected: '',
                    });
                  }}
                  className="rounded-xl"
                >
                  Send Another Request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label style={{ color: theme.colors.headingText }}>Your Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                      <Input
                        value={bookingForm.clientName}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, clientName: e.target.value }))}
                        placeholder="Full name"
                        className="pl-10 h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label style={{ color: theme.colors.headingText }}>Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                      <Input
                        value={bookingForm.clientPhone}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                        placeholder="03001234567"
                        className="pl-10 h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ color: theme.colors.headingText }}>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                    <Input
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      placeholder="your@email.com"
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label style={{ color: theme.colors.headingText }}>Event Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                      <Input
                        type="date"
                        value={bookingForm.eventDate}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, eventDate: e.target.value }))}
                        className="pl-10 h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label style={{ color: theme.colors.headingText }}>Event Type *</Label>
                    <select
                      value={bookingForm.eventType}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, eventType: e.target.value }))}
                      className="w-full h-12 rounded-xl px-4 border"
                      style={{ background: theme.colors.cardBg, borderColor: theme.colors.border, color: theme.colors.bodyText }}
                      required
                    >
                      <option value="">Select type</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label style={{ color: theme.colors.headingText }}>City</Label>
                    <select
                      value={bookingForm.city}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full h-12 rounded-xl px-4 border"
                      style={{ background: theme.colors.cardBg, borderColor: theme.colors.border, color: theme.colors.bodyText }}
                    >
                      <option value="">Select city</option>
                      {PAKISTAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label style={{ color: theme.colors.headingText }}>Budget (Optional)</Label>
                    <Input
                      value={bookingForm.budget}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, budget: e.target.value }))}
                      placeholder="e.g., 50,000 - 80,000"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                {bookingForm.packageSelected && (
                  <div className="p-4 rounded-xl flex items-center justify-between"
                    style={{ background: `${theme.colors.primary}10`, border: `1px solid ${theme.colors.primary}30` }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" style={{ color: theme.colors.primary }} />
                      <span className="text-sm font-bold" style={{ color: theme.colors.headingText }}>
                        Package: {bookingForm.packageSelected}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingForm(prev => ({ ...prev, packageSelected: '' }))}
                      className="opacity-50 hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label style={{ color: theme.colors.headingText }}>Message (Optional)</Label>
                  <Textarea
                    value={bookingForm.message}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Apne event ke baare mein kuch batayein..."
                    className="rounded-xl min-h-[100px]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="w-full h-14 rounded-xl font-bold text-base gap-2"
                  style={{ background: theme.colors.primary, color: theme.colors.primaryText }}
                >
                  {isSubmittingBooking ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-5 h-5" /> Send Booking Request</>
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* FOOTER */}
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