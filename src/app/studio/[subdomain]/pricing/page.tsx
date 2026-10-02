"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Check, X, Crown, Sparkles, MessageCircle, ArrowRight,
  Star, ChevronDown, ChevronUp, Package, Clock, Users,
  Camera, Award, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTheme } from "@/lib/portfolio-themes";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

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

        setPhotographer({
          userId: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        });
      } catch (err) {
        console.error("[PRICING_LOAD]", err);
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

  const packages = photographer.packages || [];
  const whatsapp = photographer.whatsappNumber;
  const studioName = photographer.studioName || 'Studio';

  // FAQ Data
  const faqs = [
    {
      q: "How early should we book?",
      a: "We recommend booking 2-3 months before your event to secure your preferred date. However, we do accept last-minute bookings based on availability.",
    },
    {
      q: "What's included in the packages?",
      a: "All packages include professional photography coverage, professional editing, high-resolution photos, and an online gallery for viewing and downloading.",
    },
    {
      q: "Do you travel for destination weddings?",
      a: "Yes! We cover weddings across Pakistan and offer destination wedding services. Travel and accommodation charges may apply based on location.",
    },
    {
      q: "How do payments work?",
      a: "We require a 30% advance to confirm your booking. The remaining balance is split between the event day and final delivery. We accept bank transfer, EasyPaisa, JazzCash, and cash.",
    },
    {
      q: "When will we receive our photos?",
      a: "Preview photos are delivered within 5-7 days. Full edited gallery is delivered within 3-4 weeks after the event. Expedited delivery is available on request.",
    },
    {
      q: "What if we need to reschedule?",
      a: "Rescheduling is possible subject to availability. Please notify us at least 15 days before your event. Cancellation policy applies.",
    },
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
            style={{
              borderColor: 'var(--portfolio-primary)',
              background: 'var(--portfolio-primary)10',
            }}
          >
            <Crown className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              Packages & Pricing
            </span>
          </div>
          <h1
            className="text-5xl lg:text-7xl font-headline font-bold mb-4 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Luxury Wedding Photography Pricing
          </h1>
          <p
            className="text-lg lg:text-xl max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Tailored heirloom photography & cinematography for your special day. Transparent pricing, premium packages.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PACKAGES */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {packages.length === 0 ? (
            <div className="text-center py-32">
              <Package
                className="w-20 h-20 mx-auto mb-6"
                style={{ color: 'var(--portfolio-muted-text)', opacity: 0.2 }}
              />
              <h3
                className="text-2xl font-headline font-bold mb-3"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Packages Coming Soon
              </h3>
              <p className="text-sm italic mb-8" style={{ color: 'var(--portfolio-muted-text)' }}>
                Photographer abhi packages set nahi kiye.
              </p>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe pricing ke baare mein poochna hai.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    className="rounded-full px-8 h-12 font-bold gap-2"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact for Pricing
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Packages Grid */}
              <div className={cn(
                "grid gap-6 lg:gap-8",
                packages.length === 1 ? "grid-cols-1 max-w-md mx-auto" :
                packages.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" :
                "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              )}>
                {packages.map((pkg: any, idx: number) => {
                  const isPopular = idx === Math.floor(packages.length / 2) && packages.length >= 3;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "relative rounded-3xl p-8 transition-all hover:-translate-y-2 flex flex-col",
                        isPopular && "lg:scale-105 lg:-translate-y-4"
                      )}
                      style={{
                        background: 'var(--portfolio-card-bg)',
                        border: `2px solid ${isPopular ? 'var(--portfolio-primary)' : 'var(--portfolio-border)'}`,
                        boxShadow: isPopular
                          ? `0 25px 50px -12px var(--portfolio-primary)40`
                          : '0 10px 30px -15px rgba(0,0,0,0.2)',
                      }}
                    >
                      {/* Popular Badge */}
                      {isPopular && (
                        <div
                          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                          style={{
                            background: 'var(--portfolio-primary)',
                            color: 'var(--portfolio-primary-text)',
                          }}
                        >
                          ⭐ Most Popular
                        </div>
                      )}

                      {/* Package Name */}
                      <div className="text-center mb-6">
                        <h3
                          className="text-2xl font-headline font-bold uppercase tracking-widest mb-4"
                          style={{ color: 'var(--portfolio-heading-text)' }}
                        >
                          {pkg.name}
                        </h3>

                        {/* Price */}
                        <div className="flex items-baseline justify-center gap-1">
                          <span
                            className="text-sm font-bold"
                            style={{ color: 'var(--portfolio-muted-text)' }}
                          >
                            PKR
                          </span>
                          <span
                            className="text-5xl font-headline font-bold"
                            style={{ color: 'var(--portfolio-primary)' }}
                          >
                            {pkg.price?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-8 flex-1">
                        {(pkg.features || []).map((feature: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: 'var(--portfolio-primary)20' }}
                            >
                              <Check className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
                            </div>
                            <span
                              className="text-sm leading-relaxed"
                              style={{ color: 'var(--portfolio-body-text)' }}
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${pkg.name} package book karni hai (PKR ${pkg.price?.toLocaleString()}).`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            className="w-full rounded-xl h-12 font-bold gap-2 transition-all hover:scale-105"
                            style={{
                              background: isPopular ? 'var(--portfolio-primary)' : 'transparent',
                              color: isPopular ? 'var(--portfolio-primary-text)' : 'var(--portfolio-primary)',
                              border: isPopular ? 'none' : '2px solid var(--portfolio-primary)',
                            }}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Book {pkg.name}
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* COMPARISON TABLE */}
      {/* ═══════════════════════════════════════════════════ */}
      {packages.length >= 2 && (
        <section
          className="py-16 lg:py-24"
          style={{ background: 'var(--portfolio-section-bg)' }}
        >
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl lg:text-4xl font-headline font-bold mb-3"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Package Comparison
              </h2>
              <p
                className="text-sm italic"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Compare packages side-by-side
              </p>
            </div>

            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'var(--portfolio-card-bg)',
                border: `1px solid var(--portfolio-border)`,
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--portfolio-primary)' }}>
                      <th
                        className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest"
                        style={{ color: 'var(--portfolio-primary-text)' }}
                      >
                        Package
                      </th>
                      {packages.map((pkg: any, idx: number) => (
                        <th
                          key={idx}
                          className="text-center px-6 py-4 text-xs font-bold uppercase tracking-widest"
                          style={{ color: 'var(--portfolio-primary-text)' }}
                        >
                          {pkg.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: `1px solid var(--portfolio-border)` }}>
                      <td
                        className="px-6 py-4 text-sm font-bold"
                        style={{ color: 'var(--portfolio-heading-text)' }}
                      >
                        Price
                      </td>
                      {packages.map((pkg: any, idx: number) => (
                        <td
                          key={idx}
                          className="text-center px-6 py-4 font-headline font-bold"
                          style={{ color: 'var(--portfolio-primary)' }}
                        >
                          PKR {pkg.price?.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderTop: `1px solid var(--portfolio-border)` }}>
                      <td
                        className="px-6 py-4 text-sm font-bold"
                        style={{ color: 'var(--portfolio-heading-text)' }}
                      >
                        Features
                      </td>
                      {packages.map((pkg: any, idx: number) => (
                        <td
                          key={idx}
                          className="text-center px-6 py-4 text-sm"
                          style={{ color: 'var(--portfolio-body-text)' }}
                        >
                          {(pkg.features || []).length} items
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderTop: `1px solid var(--portfolio-border)` }}>
                      <td
                        className="px-6 py-4 text-sm font-bold"
                        style={{ color: 'var(--portfolio-heading-text)' }}
                      >
                        Book
                      </td>
                      {packages.map((pkg: any, idx: number) => (
                        <td key={idx} className="text-center px-6 py-4">
                          {whatsapp && (
                            <a
                              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! ${pkg.name} package book karni hai.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:opacity-80"
                              style={{ color: 'var(--portfolio-primary)' }}
                            >
                              Book <ArrowRight className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* FAQ */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl lg:text-4xl font-headline font-bold mb-3"
              style={{ color: 'var(--portfolio-heading-text)' }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className="text-sm italic"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              Everything you need to know before booking
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CTA SECTION */}
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
            Ready to Book Your Wedding Photography?
          </h2>

          <p
            className="text-lg italic mb-10 max-w-2xl mx-auto"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Let's discuss your wedding day. Chat with us on WhatsApp for quick booking, availability, and custom requests.
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
                  Book Now on WhatsApp
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
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FAQ ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--portfolio-card-bg)',
        border: `1px solid var(--portfolio-border)`,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left transition-all hover:opacity-80"
      >
        <span
          className="font-bold text-sm lg:text-base pr-4"
          style={{ color: 'var(--portfolio-heading-text)' }}
        >
          {faq.q}
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--portfolio-primary)15' }}
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className="px-5 pb-5 text-sm leading-relaxed"
          style={{ color: 'var(--portfolio-body-text)' }}
        >
          {faq.a}
        </div>
      )}
    </div>
  );
}