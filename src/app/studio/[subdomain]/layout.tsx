"use client";

import { useParams, usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  MessageCircle, Instagram, Facebook, Youtube, Music2,
  Mail, MapPin, Phone, Menu, X, Camera, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HafashLoader } from "@/components/ui/hafash-loader";
import { ThemeProvider } from "@/components/portfolio/ThemeProvider";
import { getTheme, getFontPair } from "@/lib/portfolio-themes";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { cn } from "@/lib/utils";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          setLoading(false);
          return;
        }

        const photographerData: any = {
          userId: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        };

        // Owner / Enterprise check
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
        }

        if (!canUseSubdomain) {
          setLoading(false);
          return;
        }

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
          } catch (err) {
            console.error('[LAYOUT_BRANDING_REFRESH]', err);
          }
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
      } catch (err: any) {
        console.error('[LAYOUT_LOAD]', err);
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

  const fontPair = useMemo(() => {
    if (!photographer) return getFontPair('playfair-ptsans');
    return getFontPair(photographer.fontPair);
  }, [photographer?.fontPair]);

  const studioName = photographer?.studioName || 'Studio';
  const logo = photographer?.studioLogo;
  const whatsapp = photographer?.whatsappNumber;
  const instagram = photographer?.instagramLink;
  const facebook = photographer?.facebookLink;
  const youtube = photographer?.youtubeLink;
  const tiktok = photographer?.tiktokLink;
  const city = photographer?.city;
  const email = photographer?.email;

  // Navigation links
  const navLinks = [
    { href: `/studio/${subdomain}`, label: 'Home' },
    { href: `/studio/${subdomain}/portfolio`, label: 'Portfolio' },
    { href: `/studio/${subdomain}/pricing`, label: 'Pricing' },
    { href: `/studio/${subdomain}/about`, label: 'About' },
    { href: `/studio/${subdomain}/reviews`, label: 'Reviews' },
    { href: `/studio/${subdomain}/contact`, label: 'Contact' },
  ];

  const isActive = (href: string) => {
    if (href === `/studio/${subdomain}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (loading) {
    return <HafashLoader text="Loading studio..." />;
  }

  if (!photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-4 max-w-md">
          <Camera className="w-16 h-16 text-muted-foreground/40 mx-auto" />
          <h1 className="text-3xl font-headline font-bold">Studio Not Found</h1>
          <p className="text-muted-foreground">
            Yeh studio ab available nahi hai ya portfolio activate nahi hua.
          </p>
          <Link href="/">
            <Button variant="outline" className="rounded-xl">
              Go to Hafash
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme} fontPair={fontPair}>
      {/* ═══════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b transition-all"
        style={{
          background: 'var(--portfolio-header-bg)',
          borderColor: 'var(--portfolio-header-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo + Studio Name */}
            <Link
              href={`/studio/${subdomain}`}
              className="flex items-center gap-3 group"
              style={{ color: 'var(--portfolio-header-text)' }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt={studioName}
                  className="h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center font-headline font-bold text-xl"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  {studioName.charAt(0)}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="font-headline font-bold text-lg leading-tight">
                  {studioName}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                  {subdomain}.hafash.pk
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-bold transition-all relative py-2",
                    isActive(link.href)
                      ? "opacity-100"
                      : "opacity-70 hover:opacity-100"
                  )}
                  style={{ color: 'var(--portfolio-header-text)' }}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'var(--portfolio-primary)' }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {instagram && (
                <a
                  href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                    opacity: 0.9,
                  }}
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                    opacity: 0.9,
                  }}
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              <Link href={`/studio/${subdomain}/book`}>
                <Button
                  className="rounded-full px-6 h-11 font-bold gap-2 transition-all hover:scale-105"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  Book Now
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'var(--portfolio-primary)',
                color: 'var(--portfolio-primary-text)',
              }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border-t"
            style={{
              background: 'var(--portfolio-header-bg)',
              borderColor: 'var(--portfolio-header-border)',
            }}
          >
            <nav className="max-w-7xl mx-auto px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    isActive(link.href) ? "opacity-100" : "opacity-70"
                  )}
                  style={{
                    color: 'var(--portfolio-header-text)',
                    background: isActive(link.href) ? 'var(--portfolio-primary)' : 'transparent',
                    ...(isActive(link.href) && { color: 'var(--portfolio-primary-text)' }),
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={`/studio/${subdomain}/book`}
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button
                  className="w-full rounded-xl h-12 font-bold mt-2"
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  Book Now
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════ */}
      <main>{children}</main>

      {/* ═══════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════ */}
      <footer
        className="border-t"
        style={{
          background: 'var(--portfolio-footer-bg)',
          borderColor: 'var(--portfolio-border)',
          color: 'var(--portfolio-footer-text)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">

          {/* Top — 4 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

            {/* Column 1 — Studio */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt={studioName} className="h-10 w-auto object-contain" />
                ) : (
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center font-bold"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                    }}
                  >
                    {studioName.charAt(0)}
                  </div>
                )}
                <p className="font-headline font-bold text-lg">{studioName}</p>
              </div>
              <p className="text-sm opacity-70 leading-relaxed">
                {photographer.tagline || 'Capturing timeless moments'}
              </p>
            </div>

            {/* Column 2 — Quick Links */}
            <div className="space-y-4">
              <h4 className="font-headline font-bold text-lg">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.slice(0, 5).map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="opacity-70 hover:opacity-100 transition-opacity"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Contact */}
            <div className="space-y-4">
              <h4 className="font-headline font-bold text-lg">Contact</h4>
              <ul className="space-y-3 text-sm">
                {whatsapp && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 opacity-60" />
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-70 hover:opacity-100"
                    >
                      {whatsapp}
                    </a>
                  </li>
                )}
                {email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 opacity-60" />
                    <a
                      href={`mailto:${email}`}
                      className="opacity-70 hover:opacity-100 truncate"
                    >
                      {email}
                    </a>
                  </li>
                )}
                {city && (
                  <li className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-60" />
                    <span className="opacity-70">{city}, Pakistan</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 4 — Social */}
            <div className="space-y-4">
              <h4 className="font-headline font-bold text-lg">Follow</h4>
              <div className="flex flex-wrap gap-3">
                {instagram && (
                  <a
                    href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                      opacity: 0.85,
                    }}
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                      opacity: 0.85,
                    }}
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {youtube && (
                  <a
                    href={youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                      opacity: 0.85,
                    }}
                    aria-label="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {tiktok && (
                  <a
                    href={tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                      opacity: 0.85,
                    }}
                    aria-label="TikTok"
                  >
                    <Music2 className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
            style={{ borderColor: 'var(--portfolio-border)' }}
          >
            <p className="opacity-60">
              © {new Date().getFullYear()} {studioName}. All rights reserved.
            </p>
            <div className="flex items-center gap-2 opacity-60">
              <span>Powered by</span>
              <img
                src="/hafash-logo.png"
                alt="Hafash"
                className="h-5 w-auto grayscale brightness-200"
              />
              <span className="font-bold">Hafash.pk</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════ */}
      {/* FLOATING WHATSAPP BUTTON */}
      {/* ═══════════════════════════════════════════════════ */}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath booking karni hai.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 group"
          style={{
            background: '#25D366',
            color: '#FFFFFF',
          }}
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-7 h-7" />
          <span className="absolute right-full mr-3 px-3 py-2 rounded-lg bg-black/80 backdrop-blur-md text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat on WhatsApp
          </span>
        </a>
      )}
    </ThemeProvider>
  );
}