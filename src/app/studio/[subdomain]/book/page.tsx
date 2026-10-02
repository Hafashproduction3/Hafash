"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Calendar, User, Phone, Mail, MapPin, MessageSquare,
  CheckCircle2, Loader2, Sparkles, AlertCircle, Send,
  Crown, DollarSign, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createBooking } from "@/app/actions/portfolio";
import { getTheme } from "@/lib/portfolio-themes";
import { EVENT_TYPES, PAKISTAN_CITIES } from "@/lib/portfolio-types";
import { cn } from "@/lib/utils";

export default function BookPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();
  const { toast } = useToast();

  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
        console.error("[BOOK_LOAD]", err);
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

  // ═══════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════

  const validateName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return 'Naam zaroori hai';
    if (trimmed.length < 3) return 'Kam az kam 3 characters';
    if (!/^[a-zA-Z\s\u0600-\u06FF]+$/.test(trimmed)) {
      return 'Sirf letters aur spaces';
    }
    return '';
  };

  const validatePhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return 'Phone zaroori hai';
    if (cleaned.length !== 11) return '11 digits chahiye (03XXXXXXXXX)';
    if (!/^03\d{9}$/.test(cleaned)) return 'Sahi format (03001234567)';
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) return '';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return 'Sahi email likhein';
    return '';
  };

  const validateEventDate = (date: string): string => {
    if (!date) return 'Event date zaroori hai';
    const selected = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) return 'Aaj ya future mein honi chahiye';
    return '';
  };

  const validateEventType = (type: string): string => {
    if (!type) return 'Event type zaroori hai';
    return '';
  };

  const isFormValid = useMemo(() => {
    return (
      validateName(form.clientName) === '' &&
      validatePhone(form.clientPhone) === '' &&
      validateEmail(form.clientEmail) === '' &&
      validateEventDate(form.eventDate) === '' &&
      validateEventType(form.eventType) === ''
    );
  }, [form]);

  const handleFieldChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));

    if (touched[field]) {
      let error = '';
      if (field === 'clientName') error = validateName(value);
      if (field === 'clientPhone') error = validatePhone(value);
      if (field === 'clientEmail') error = validateEmail(value);
      if (field === 'eventDate') error = validateEventDate(value);
      if (field === 'eventType') error = validateEventType(value);

      setErrors(prev => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    let error = '';
    const value = (form as any)[field];
    if (field === 'clientName') error = validateName(value);
    if (field === 'clientPhone') error = validatePhone(value);
    if (field === 'clientEmail') error = validateEmail(value);
    if (field === 'eventDate') error = validateEventDate(value);
    if (field === 'eventType') error = validateEventType(value);

    setErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photographer || isSubmitting) return;

    if (!isFormValid) {
      toast({
        variant: 'destructive',
        title: 'Form mein errors hain',
        description: 'Please sahi information fill karein',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBooking({
        photographerId: photographer.userId,
        photographerSubdomain: subdomain,
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientPhone: form.clientPhone.replace(/\D/g, ''),
        eventDate: form.eventDate,
        eventType: form.eventType,
        city: form.city,
        budget: form.budget,
        message: form.message,
        packageSelected: form.packageSelected,
      });

      if (!result.success) throw new Error(result.error);

      setSubmitted(true);
      toast({
        title: '✅ Booking request sent!',
        description: 'Photographer aapko jald contact karega',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Booking failed',
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
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
  const packages = photographer.packages || [];
  const whatsapp = photographer.whatsappNumber;
  const todayDate = new Date().toISOString().split('T')[0];

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
            <Calendar className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              Book Your Date
            </span>
          </div>
          <h1
            className="text-5xl lg:text-7xl font-headline font-bold mb-4 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            Let's Work Together
          </h1>
          <p
            className="text-lg lg:text-xl max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            Apna event book karne ke liye form fill karein
          </p>
        </div>
      </section>

      {/* BOOKING FORM */}
      <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-8">

          {submitted ? (
            <div
              className="rounded-3xl p-12 text-center space-y-6"
              style={{
                background: 'var(--portfolio-card-bg)',
                border: `1px solid var(--portfolio-primary)`,
              }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--portfolio-primary)15' }}
              >
                <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--portfolio-primary)' }} />
              </div>
              <h2
                className="text-4xl font-headline font-bold"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Booking Request Sent! 🎉
              </h2>
              <p
                className="text-base max-w-md mx-auto"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Photographer aapse jald contact karega. Shukriya!
              </p>

              {whatsapp && (
                <div className="pt-4">
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam! Maine ${studioName} ko booking request bheji hai.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      className="rounded-full px-8 h-12 font-bold gap-2"
                      style={{
                        background: '#25D366',
                        color: '#FFFFFF',
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Follow Up on WhatsApp
                    </Button>
                  </a>
                </div>
              )}

              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      clientName: '', clientEmail: '', clientPhone: '',
                      eventDate: '', eventType: '', city: '', budget: '',
                      message: '', packageSelected: '',
                    });
                    setErrors({});
                    setTouched({});
                  }}
                  className="rounded-xl"
                  style={{
                    borderColor: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary)',
                  }}
                >
                  Send Another Request
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-3xl p-8 lg:p-12"
              style={{
                background: 'var(--portfolio-card-bg)',
                border: `1px solid var(--portfolio-border)`,
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Name + Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>
                      Your Name <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                      <Input
                        value={form.clientName}
                        onChange={(e) => handleFieldChange('clientName', e.target.value)}
                        onBlur={() => handleFieldBlur('clientName')}
                        placeholder="Full name"
                        className={cn(
                          "pl-10 h-12 rounded-xl",
                          touched.clientName && errors.clientName && "border-red-500"
                        )}
                      />
                    </div>
                    {touched.clientName && errors.clientName && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>
                      Phone <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                      <Input
                        value={form.clientPhone}
                        onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
                        onBlur={() => handleFieldBlur('clientPhone')}
                        placeholder="03001234567"
                        className={cn(
                          "pl-10 h-12 rounded-xl",
                          touched.clientPhone && errors.clientPhone && "border-red-500"
                        )}
                      />
                    </div>
                    {touched.clientPhone && errors.clientPhone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label style={{ color: 'var(--portfolio-heading-text)' }}>Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                    <Input
                      type="email"
                      value={form.clientEmail}
                      onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                      onBlur={() => handleFieldBlur('clientEmail')}
                      placeholder="your@email.com"
                      className={cn(
                        "pl-10 h-12 rounded-xl",
                        touched.clientEmail && errors.clientEmail && "border-red-500"
                      )}
                    />
                  </div>
                  {touched.clientEmail && errors.clientEmail && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.clientEmail}
                    </p>
                  )}
                </div>

                {/* Date + Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>
                      Event Date <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-4 h-4 opacity-50 pointer-events-none z-10" />
                      <Input
                        type="date"
                        value={form.eventDate}
                        min={todayDate}
                        onChange={(e) => handleFieldChange('eventDate', e.target.value)}
                        onBlur={() => handleFieldBlur('eventDate')}
                        onClick={(e) => {
                          try { (e.target as HTMLInputElement).showPicker?.(); } catch {}
                        }}
                        className={cn(
                          "pl-10 h-12 rounded-xl cursor-pointer",
                          touched.eventDate && errors.eventDate && "border-red-500"
                        )}
                      />
                    </div>
                    {touched.eventDate && errors.eventDate && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.eventDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>
                      Event Type <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <select
                      value={form.eventType}
                      onChange={(e) => handleFieldChange('eventType', e.target.value)}
                      onBlur={() => handleFieldBlur('eventType')}
                      className={cn(
                        "w-full h-12 rounded-xl px-4 border",
                        touched.eventType && errors.eventType && "border-red-500"
                      )}
                      style={{
                        background: 'var(--portfolio-page-bg)',
                        borderColor: touched.eventType && errors.eventType ? '#ef4444' : 'var(--portfolio-border)',
                        color: 'var(--portfolio-body-text)',
                      }}
                    >
                      <option value="">Select type</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {touched.eventType && errors.eventType && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.eventType}
                      </p>
                    )}
                  </div>
                </div>

                {/* City + Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>City</Label>
                    <select
                      value={form.city}
                      onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full h-12 rounded-xl px-4 border"
                      style={{
                        background: 'var(--portfolio-page-bg)',
                        borderColor: 'var(--portfolio-border)',
                        color: 'var(--portfolio-body-text)',
                      }}
                    >
                      <option value="">Select city</option>
                      {PAKISTAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>Budget (Optional)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 w-4 h-4 opacity-50" />
                      <Input
                        value={form.budget}
                        onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
                        placeholder="e.g., 50,000 - 80,000"
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Package Selection */}
                {packages.length > 0 && (
                  <div className="space-y-2">
                    <Label style={{ color: 'var(--portfolio-heading-text)' }}>Select Package (Optional)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {packages.map((pkg: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            packageSelected: prev.packageSelected === pkg.name ? '' : pkg.name,
                          }))}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all",
                            form.packageSelected === pkg.name
                              ? "scale-105"
                              : "hover:scale-[1.02]"
                          )}
                          style={{
                            background: form.packageSelected === pkg.name
                              ? 'var(--portfolio-primary)15'
                              : 'var(--portfolio-page-bg)',
                            borderColor: form.packageSelected === pkg.name
                              ? 'var(--portfolio-primary)'
                              : 'var(--portfolio-border)',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {form.packageSelected === pkg.name ? (
                              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
                            ) : (
                              <Crown className="w-4 h-4 opacity-50" />
                            )}
                            <p
                              className="font-bold text-sm"
                              style={{ color: 'var(--portfolio-heading-text)' }}
                            >
                              {pkg.name}
                            </p>
                          </div>
                          <p
                            className="text-lg font-headline font-bold"
                            style={{ color: 'var(--portfolio-primary)' }}
                          >
                            PKR {pkg.price?.toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="space-y-2">
                  <Label style={{ color: 'var(--portfolio-heading-text)' }}>Message (Optional)</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Apne event ke baare mein kuch batayein..."
                    className="rounded-xl min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-right" style={{ color: 'var(--portfolio-muted-text)' }}>
                    {form.message.length}/500
                  </p>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className={cn(
                    "w-full h-14 rounded-xl font-bold text-base gap-2 shadow-xl transition-all",
                    isFormValid && "hover:scale-[1.02]",
                    !isFormValid && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    background: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary-text)',
                  }}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-5 h-5" /> Send Booking Request</>
                  )}
                </Button>

                {!isFormValid && (
                  <p
                    className="text-xs text-center italic"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    Please sahi information fill karein — submit button enable hoga
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Trust Badges */}
          {!submitted && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
              <TrustBadge icon={<CheckCircle2 />} text="100% Secure" />
              <TrustBadge icon={<Clock />} text="Fast Response" />
              <TrustBadge icon={<Sparkles />} text="Professional Service" />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRUST BADGE
// ═══════════════════════════════════════════════════════════════

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex items-center gap-2 p-4 rounded-2xl"
      style={{
        background: 'var(--portfolio-card-bg)',
        border: `1px solid var(--portfolio-border)`,
      }}
    >
      <div className="w-5 h-5" style={{ color: 'var(--portfolio-primary)' }}>
        {icon}
      </div>
      <span
        className="text-xs font-bold"
        style={{ color: 'var(--portfolio-body-text)' }}
      >
        {text}
      </span>
    </div>
  );
}