"use client";

import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, MessageCircle, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const contactNumber = "+92 302 9680191"; 
  const whatsappNumber = "923029680191"; 
  const emailAddress = "support@hafash.pk"; // ✅ Custom Email Active

  // ✅ Gmail web compose link (Universal)
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailAddress}&su=Inquiry%20from%20Hafash.pk`;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    toast({ title: "Email Copied!", description: "You can now paste it in your email app." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-32 px-6">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-[0.3em]">
            <MessageCircle className="w-3.5 h-3.5" /> Get In Touch
          </div>
          <h1 className="text-5xl font-headline font-bold text-white mt-6">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Have questions? We're here to help. Reach out to our team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          
          {/* ✅ Email Card - Now opens Gmail directly */}
          <a 
            href={gmailComposeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-card border border-white/5 p-8 rounded-3xl space-y-4 flex flex-col items-center hover:border-primary/30 transition-all group relative cursor-pointer"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-white">Email</h3>
            <p className="text-sm text-muted-foreground break-all px-2">{emailAddress}</p>
            
            {/* Copy Button */}
            <button
              onClick={handleCopyEmail}
              className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-primary/20"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy Email"}
            </button>
          </a>

          {/* WhatsApp Card */}
          <a 
            href={`https://wa.me/${whatsappNumber}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-card border border-white/5 p-8 rounded-3xl space-y-4 flex flex-col items-center hover:border-primary/30 transition-all group"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-white">WhatsApp</h3>
            <p className="text-sm text-muted-foreground">{contactNumber}</p>
          </a>

          {/* Location Card */}
          <div className="bg-card border border-white/5 p-8 rounded-3xl space-y-4 flex flex-col items-center hover:border-primary/30 transition-all">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-white">Location</h3>
            <p className="text-sm text-muted-foreground">Karachi, Pakistan</p>
          </div>
        </div>

        <div className="pt-8">
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
            <Button className="rounded-full h-14 px-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all hover:scale-105">
              <MessageCircle className="w-5 h-5" /> Message us on WhatsApp
            </Button>
          </a>
        </div>

        <div className="pt-12">
          <Link href="/" className="text-sm font-bold text-white/50 hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}