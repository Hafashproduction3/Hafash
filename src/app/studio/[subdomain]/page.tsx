"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, MapPin, MessageCircle, Instagram, Sparkles, Award,
  Crown, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HafashLoader } from "@/components/ui/hafash-loader";

export default function StudioPortfolioPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [galleries, setGalleries] = useState<any[]>([]);
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
        // ✅ Query publicProfiles (secure)
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

        // ✅ Plan check — ONLY Enterprise plan can activate subdomain
        const planId = photographerData.planId;
        // ✅ Enterprise + Active plan check
const planExpiryDate = photographerData.planExpiryDate;
let canUseSubdomain = planId === "enterprise";

// Expiry check
if (canUseSubdomain && planExpiryDate) {
  try {
    // Firestore Timestamp handle karein
    const expiryMs = planExpiryDate?.seconds 
      ? planExpiryDate.seconds * 1000 
      : new Date(planExpiryDate).getTime();
    canUseSubdomain = expiryMs > Date.now();
  } catch (e) {
    canUseSubdomain = false;
  }
}

// Agar expiry date nahi hai, to plan invalid
if (canUseSubdomain && !planExpiryDate) {
  canUseSubdomain = false;
}

        if (!canUseSubdomain) {
          setNeedsUpgrade(true);
          setLoading(false);
          return;
        }

        // ✅ Load public galleries
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

  const stats = useMemo(() => {
    const totalGalleries = galleries.length;
    const totalPhotos = galleries.reduce(
      (acc, g) => acc + (g.photoCount || 0),
      0
    );
    return { totalGalleries, totalPhotos };
  }, [galleries]);

  if (loading) {
    return <HafashLoader text="Loading studio..." />;
  }

  if (needsUpgrade && photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-lg rounded-[2.5rem] border-primary/30 shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          <CardContent className="p-10 text-center space-y-6">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <Crown className="w-10 h-10 text-primary" />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-headline font-bold">
                Portfolio Coming Soon
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-white">{photographer.studioName}</strong> ka portfolio abhi activate nahi hua.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Photographer Ke Liye
                </p>
                <p className="text-xs text-amber-200/80 mt-1">
                  Apna portfolio live karne ke liye Enterprise plan activate karein.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link href="/storage">
                <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2">
                  <Crown className="w-4 h-4" />
                  View Enterprise Plan
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full h-12 rounded-xl border-border/50">
                  Back to Hafash
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <Camera className="w-14 h-14 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-headline font-bold">Studio Not Found</h2>
            <p className="text-sm text-muted-foreground">
              Yeh studio ab available nahi hai.
            </p>
            <Link href="/">
              <Button variant="outline" className="rounded-xl">
                Go to Hafash
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studioName =
    photographer.studioName ||
    photographer.photographerName ||
    "Professional Studio";
  const logo = photographer.studioLogo;
  const banner = photographer.studioBanner;
  const whatsapp = photographer.whatsappNumber;
  const instagram = photographer.instagramLink;
  const tagline = photographer.tagline;
  const city = photographer.city;
  const displayGalleries = galleries.slice(0, 12);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-[70vh] lg:h-[80vh] overflow-hidden">
        {banner ? (
          <img src={banner} alt={studioName} className="absolute inset-0 w-full h-full object-cover" />
        ) : galleries[0]?.coverImage ? (
          <img src={galleries[0].coverImage} alt={studioName} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          {logo && (
            <img src={logo} alt={studioName} className="h-24 lg:h-32 w-auto mb-6 object-contain drop-shadow-2xl" />
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-12 bg-primary/60" />
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="h-px w-12 bg-primary/60" />
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-headline font-bold text-white uppercase tracking-tight drop-shadow-2xl mb-4">
            {studioName}
          </h1>

          {tagline && (
            <p className="text-lg lg:text-2xl italic text-primary/90 font-headline drop-shadow-xl mb-6">
              {tagline}
            </p>
          )}

          {city && (
            <div className="flex items-center gap-2 text-white/80 uppercase tracking-[0.3em] text-xs font-bold mb-8">
              <MapPin className="w-4 h-4 text-primary" />
              {city}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {stats.totalGalleries > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-white text-sm">
                <Camera className="w-4 h-4 text-primary" />
                {stats.totalGalleries} Events
              </div>
            )}
            {stats.totalPhotos > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-white text-sm">
                <Award className="w-4 h-4 text-primary" />
                {stats.totalPhotos} Photos
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {whatsapp && (
              <Button
                className="rounded-full px-8 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-2xl"
                onClick={() =>
                  window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}`, "_blank")
                }
              >
                <MessageCircle className="w-5 h-5" />
                Contact Studio
              </Button>
            )}
            <Button
              className="rounded-full px-8 h-14 bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 font-bold gap-3"
              onClick={() => {
                document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Camera className="w-5 h-5" />
              View Portfolio
            </Button>
          </div>
        </div>
      </div>

      <div id="portfolio" className="max-w-7xl mx-auto px-6 mt-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-4">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Portfolio
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-3">
            Recent Work
          </h2>
          <p className="text-muted-foreground text-lg">
            A glimpse into our beautiful moments
          </p>
        </div>

        {displayGalleries.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-border/30 rounded-[3rem]">
            <Camera className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
            <p className="text-muted-foreground italic text-lg">
              Portfolio coming soon...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayGalleries.map((gallery: any) => (
              <Link
                key={gallery.id}
                href={`/gallery/${gallery.slug || gallery.id}`}
                className="group"
              >
                <Card className="overflow-hidden rounded-[2rem] border-border/30 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="aspect-[4/5] relative overflow-hidden bg-muted">
                    {gallery.coverImage ? (
                      <img
                        src={gallery.coverImage}
                        alt={gallery.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
                        <Camera className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase tracking-widest mb-3 backdrop-blur-md">
                        {gallery.category}
                      </Badge>
                      <h3 className="text-2xl font-headline font-bold text-white drop-shadow-2xl">
                        {gallery.title}
                      </h3>
                      {gallery.clientName && (
                        <p className="text-white/70 text-sm mt-1">
                          {gallery.clientName}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-32 text-center">
        <div className="bg-gradient-to-br from-primary/10 via-card/60 to-background border border-primary/30 rounded-[3rem] p-12 lg:p-16">
          <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-4">
            Let's Create Magic
          </h2>
          <p className="text-muted-foreground text-lg mb-10 italic">
            Ready to book your special day?
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {whatsapp && (
              <Button
                className="rounded-full px-8 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3"
                onClick={() =>
                  window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}`, "_blank")
                }
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </Button>
            )}
            {instagram && (
              <Button
                variant="outline"
                className="rounded-full px-8 h-14 border-primary/30 font-bold gap-3"
                onClick={() =>
                  window.open(
                    instagram.startsWith("http")
                      ? instagram
                      : `https://instagram.com/${instagram.replace("@", "")}`,
                    "_blank"
                  )
                }
              >
                <Instagram className="w-5 h-5" />
                Instagram
              </Button>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-20 pt-12 pb-8 border-t border-border/20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3 opacity-50">
            <img src="/hafash-logo.png" alt="Hafash" className="h-8 w-auto grayscale brightness-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground">
              Powered by Hafash
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            © 2026 {studioName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}