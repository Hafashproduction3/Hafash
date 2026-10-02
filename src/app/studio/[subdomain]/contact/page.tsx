"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  MessageCircle, Mail, MapPin, Phone, Instagram, Facebook,
  Youtube, Music2, Clock, Send, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Sparkles, CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getTheme } from "@/lib/portfolio-themes";
import { EVENT_TYPES } from "@/lib/portfolio-types";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();
  const { toast } = useToast();

  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    eventType: '',
    eventDate: '',
    venue: '',
    message: '',
  });

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
        console.error("[CONTACT_LOAD]", err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photographer || submitting) return;

    // Basic validation
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required fields missing',
        description: 'Name aur phone zaroori hain',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Send via WhatsApp to photographer (fallback)
      const whatsapp = photographer.whatsappNumber;
      if (whatsapp) {
        const message = `Salam! Main *${formData.name}* hoon.\n\n*Event Inquiry:*\n📅 Event Type: ${formData.eventType || 'Not specified'}\n📆 Date: ${formData.eventDate || 'Not specified'}\n📍 Venue: ${formData.venue || 'Not specified'}\n📞 Phone: ${formData.phone}\n📧 Email: ${formData.email || 'N/A'}\n\n*Message:*\n${formData.message || 'No message'}\n\n— Sent via Hafash.pk`;

        const phone = whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      setSubmitted(true);
      toast({
        title: '✅ Message ready!',
        description: 'WhatsApp open ho gaya hai. Send dabayein.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

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
  const instagram = photographer.instagramLink;
  const facebook = photographer.facebookLink;
  const youtube = photographer.youtubeLink;
  const tiktok = photographer.tiktokLink;
  const email = photographer.email;
  const city = photographer.city;
  const address = photographer.address;

  // FAQ
  const faqs = [
    {
      q: 'How early should we book?',
      a: 'We recommend 2-3 months before your event. However, we accept last-minute bookings based on availability.',
    },
    {
      q: 'Do you travel for destination weddings?',
      a: 'Yes! We cover nationwide and offer destination wedding services across Pakistan.',
    },
    {
      q: "What's included in packages?",
      a: 'Coverage, professional editing, online gallery, high-resolution downloads, and more — see our Pricing page.',
    },
    {
      q: 'What are the payment options?',
      a: 'Bank transfer, EasyPaisa, JazzCash, and cash. 30% advance required to confirm booking.',
    },
  ];

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
            <MessageCircle className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              Get in Touch
            </span>
          </div>
          <h1
            className="text-5xl lg:text-7xl font-headline font-bold mb-4 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Let's Talk
          </h1>
          <p
            className="text-lg lg:text-xl max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Let's capture your unforgettable day — for Barat, Walima, Nikah & all your special moments
          </p>
        </div>
      </section>

      {/* CONTACT GRID */}
      <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* LEFT — Contact Form */}
            <div className="lg:col-span-3">
              <div
                className="rounded-3xl p-8 lg:p-10"
                style={{
                  background: 'var(--portfolio-card-bg)',
                  border: `1px solid var(--portfolio-border)`,
                }}
              >
                {submitted ? (
                  <div className="text-center py-12 space-y-6">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                      style={{ background: 'var(--portfolio-primary)15' }}
                    >
                      <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--portfolio-primary)' }} />
                    </div>
                    <h3
                      className="text-3xl font-headline font-bold"
                      style={{ color: 'var(--portfolio-heading-text)' }}
                    >
                      Message Ready! 🎉
                    </h3>
                    <p
                      className="text-sm max-w-sm mx-auto"
                      style={{ color: 'var(--portfolio-muted-text)' }}
                    >
                      WhatsApp open ho gaya hai. Please "Send" dabayein taake aapka message photographer tak pohnche.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          name: '', phone: '', email: '', eventType: '',
                          eventDate: '', venue: '', message: '',
                        });
                      }}
                      className="rounded-xl"
                      style={{
                        borderColor: 'var(--portfolio-primary)',
                        color: 'var(--portfolio-primary)',
                      }}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="text-center mb-6">
                      <h2
                        className="text-2xl font-headline font-bold mb-2"
                        style={{ color: 'var(--portfolio-heading-text)' }}
                      >
                        Send Us a Message
                      </h2>
                      <p
                        className="text-xs uppercase tracking-widest"
                        style={{ color: 'var(--portfolio-muted-text)' }}
                      >
                        We typically respond within 24 hours
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label style={{ color: 'var(--portfolio-heading-text)' }}>
                          Name <span style={{ color: '#ef4444' }}>*</span>
                        </Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your full name"
                          className="h-12 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: 'var(--portfolio-heading-text)' }}>
                          Phone <span style={{ color: '#ef4444' }}>*</span>
                        </Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+92 3xx xxxxxxx"
                          className="h-12 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label style={{ color: 'var(--portfolio-heading-text)' }}>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label style={{ color: 'var(--portfolio-heading-text)' }}>Event Type</Label>
                        <select
                          value={formData.eventType}
                          onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
                          className="w-full h-12 rounded-xl px-4 border"
                          style={{
                            background: 'var(--portfolio-page-bg)',
                            borderColor: 'var(--portfolio-border)',
                            color: 'var(--portfolio-body-text)',
                          }}
                        >
                          <option value="">Select type</option>
                          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: 'var(--portfolio-heading-text)' }}>Event Date</Label>
                        <Input
                          type="date"
                          value={formData.eventDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label style={{ color: 'var(--portfolio-heading-text)' }}>Venue / Location</Label>
                      <Input
                        value={formData.venue}
                        onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                        placeholder="Wedding venue or city"
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label style={{ color: 'var(--portfolio-heading-text)' }}>Message</Label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us about your event, guest count, photography style, etc."
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-14 rounded-xl font-bold text-base gap-2 shadow-xl transition-all hover:scale-[1.02]"
                      style={{
                        background: 'var(--portfolio-primary)',
                        color: 'var(--portfolio-primary-text)',
                      }}
                    >
                      {submitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="w-5 h-5" /> Send Inquiry</>
                      )}
                    </Button>

                    <p
                      className="text-xs text-center italic"
                      style={{ color: 'var(--portfolio-muted-text)' }}
                    >
                      *We typically respond within 24 hours on WhatsApp
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT — Contact Info */}
            <div className="lg:col-span-2 space-y-6">

              {/* WhatsApp Quick Booking */}
              {whatsapp && (
                <div
                  className="rounded-3xl p-6 text-center"
                  style={{
                    background: 'var(--portfolio-card-bg)',
                    border: `1px solid var(--portfolio-primary)`,
                  }}
                >
                  <h3
                    className="font-headline font-bold text-lg mb-2 uppercase tracking-wider"
                    style={{ color: 'var(--portfolio-heading-text)' }}
                  >
                    WhatsApp Quick Booking
                  </h3>
                  <p
                    className="text-xs mb-4"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    Chat with us instantly for fastest response
                  </p>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Mujhe ${studioName} ke saath booking karni hai.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      className="w-full h-14 rounded-full font-bold gap-2 shadow-xl transition-all hover:scale-105"
                      style={{
                        background: '#25D366',
                        color: '#FFFFFF',
                      }}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                  <p
                    className="text-[10px] mt-3 uppercase tracking-widest"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    Available Mon-Sat · 11am - 8pm
                  </p>
                </div>
              )}

              {/* Contact Details */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: 'var(--portfolio-card-bg)',
                  border: `1px solid var(--portfolio-border)`,
                }}
              >
                <h3
                  className="font-headline font-bold text-lg mb-5 uppercase tracking-wider"
                  style={{ color: 'var(--portfolio-heading-text)' }}
                >
                  Connect With Us
                </h3>

                <ul className="space-y-4">
                  {whatsapp && (
                    <ContactItem
                      icon={<Phone />}
                      label="WhatsApp"
                      value={whatsapp}
                      href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                    />
                  )}
                  {email && (
                    <ContactItem
                      icon={<Mail />}
                      label="Email"
                      value={email}
                      href={`mailto:${email}`}
                    />
                  )}
                  {instagram && (
                    <ContactItem
                      icon={<Instagram />}
                      label="Instagram"
                      value={instagram.startsWith('http') ? instagram : `@${instagram.replace('@', '')}`}
                      href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
                    />
                  )}
                  {facebook && (
                    <ContactItem
                      icon={<Facebook />}
                      label="Facebook"
                      value={facebook}
                      href={facebook}
                    />
                  )}
                  {youtube && (
                    <ContactItem
                      icon={<Youtube />}
                      label="YouTube"
                      value={youtube}
                      href={youtube}
                    />
                  )}
                  {tiktok && (
                    <ContactItem
                      icon={<Music2 />}
                      label="TikTok"
                      value={tiktok}
                      href={tiktok}
                    />
                  )}
                  {city && (
                    <ContactItem
                      icon={<MapPin />}
                      label="Location"
                      value={city + ', Pakistan'}
                    />
                  )}
                  {address && (
                    <ContactItem
                      icon={<MapPin />}
                      label="Studio"
                      value={address}
                    />
                  )}
                </ul>
              </div>

              {/* Working Hours */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: 'var(--portfolio-card-bg)',
                  border: `1px solid var(--portfolio-border)`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5" style={{ color: 'var(--portfolio-primary)' }} />
                  <h3
                    className="font-headline font-bold text-lg uppercase tracking-wider"
                    style={{ color: 'var(--portfolio-heading-text)' }}
                  >
                    Working Hours
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--portfolio-body-text)' }}>Mon - Sat</span>
                    <span className="font-bold" style={{ color: 'var(--portfolio-heading-text)' }}>11:00 AM - 8:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--portfolio-body-text)' }}>Sunday</span>
                    <span className="font-bold" style={{ color: 'var(--portfolio-muted-text)' }}>By Appointment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-section-bg)' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl lg:text-4xl font-headline font-bold mb-3"
              style={{ color: 'var(--portfolio-heading-text)' }}
            >
              Quick FAQs
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <ContactFAQItem key={idx} faq={faq} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACT ITEM
// ═══════════════════════════════════════════════════════════════

function ContactItem({
  icon, label, value, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 group">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--portfolio-primary)15' }}
      >
        <div className="w-5 h-5" style={{ color: 'var(--portfolio-primary)' }}>
          {icon}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: 'var(--portfolio-muted-text)' }}
        >
          {label}
        </p>
        <p
          className="text-sm font-bold truncate transition-colors group-hover:opacity-80"
          style={{ color: 'var(--portfolio-heading-text)' }}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      </li>
    );
  }

  return <li>{content}</li>;
}

// ═══════════════════════════════════════════════════════════════
// FAQ ITEM
// ═══════════════════════════════════════════════════════════════

function ContactFAQItem({ faq }: { faq: { q: string; a: string } }) {
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