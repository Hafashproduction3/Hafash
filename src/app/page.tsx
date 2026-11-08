'use client';

import Link from 'next/link';
import { 
  Camera, Shield, Heart, Share2, ArrowRight, Check, Users, Sparkles,
  Gift, HardDrive, Award, Image as ImageIcon, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HAFASH_PLANS } from '@/lib/plans';
import { useUser } from '@/firebase';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((token) => {
        console.log("🔍 ADMIN CLAIM CHECK:", token.claims.admin);
      });
    }
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <header className="px-4 lg:px-12 h-24 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/60 backdrop-blur-2xl z-50 transition-all duration-300">
        <div className="flex items-center gap-3 group">
          <img src="/hafash-logo.png" alt="Hafash Platform" className="h-[40px] lg:h-[55px] w-auto transition-transform group-hover:scale-105" />
          <Link href="/" className="flex items-center">
            <span className="text-2xl lg:text-3xl font-headline font-bold text-primary tracking-tighter italic drop-shadow-md">Hafash.pk</span>
          </Link>
        </div>
        <nav className="hidden md:flex gap-10">
          <Link href="#features" className="text-sm font-medium text-white/70 hover:text-primary transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium text-white/70 hover:text-primary transition-colors">Pricing</Link>
          <Link href="#referral" className="text-sm font-medium text-white/70 hover:text-primary transition-colors">Refer & Earn</Link>
          <Link href="#about" className="text-sm font-medium text-white/70 hover:text-primary transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-3 lg:gap-5">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-bold text-white/80 hover:text-white hover:bg-white/5 h-10 px-5 rounded-full">Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold h-10 px-6 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:scale-105">Join Now</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070&auto=format&fit=crop" 
              alt="Luxury Photography Setup" 
              className="w-full h-full object-cover opacity-40 scale-105 animate-[slow-zoom_20s_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
          </div>
          
          <div className="relative z-10 text-center px-6 max-w-5xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-primary text-[11px] font-bold uppercase tracking-[0.3em] animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Sparkles className="w-3.5 h-3.5" /> Experience The Future of Delivery
            </div>
            
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-headline font-light mb-4 tracking-tight leading-[1.1] text-white drop-shadow-2xl">
              Deliver Memories <br />
              <span className="text-primary italic font-normal">Beautifully</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-light">
              The luxury gallery delivery platform designed exclusively for wedding and event photographers.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_rgba(212,175,55,0.3)] transition-all hover:scale-105">
                  Start Your Studio
                </Button>
              </Link>
              <Link href="/test-drive" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-10 text-sm font-bold rounded-full bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105">
                  Explore Test Mode
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 lg:py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-card/30" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl lg:text-6xl font-headline font-bold">Crafted for <span className="text-primary italic">Excellence</span></h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Every feature built with luxury in mind, from upload to final delivery.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <FeatureCard 
                icon={<Camera className="w-6 h-6" />}
                title="Cinematic Galleries"
                description="Experience blazing fast, mobile-optimized galleries that feel like a high-end digital editorial."
              />
              <FeatureCard 
                icon={<Shield className="w-6 h-6" />}
                title="Smart Protection"
                description="Toggle downloads on or off with integrated dynamic watermarking system."
              />
              <FeatureCard 
                icon={<Heart className="w-6 h-6" />}
                title="Curation Hub"
                description="Let clients favorite their moments and sync them instantly to your professional panel."
              />
              <FeatureCard 
                icon={<Share2 className="w-6 h-6" />}
                title="Instant Delivery"
                description="One-click sharing via WhatsApp or direct links for an effortless client experience."
              />
              <FeatureCard 
                icon={<HardDrive className="w-6 h-6" />}
                title="Hafash Drive"
                description="A powerful cloud storage for your raw files. Manage, organize, and create galleries from your drive."
              />
              <FeatureCard 
                icon={<Video className="w-6 h-6" />}
                title="HD Video Support"
                description="Deliver cinematic videos in up to 4K quality alongside your photos."
              />
              <FeatureCard 
                icon={<Gift className="w-6 h-6" />}
                title="Refer & Earn"
                description="Invite fellow photographers and earn 10GB bonus storage for every active referral."
              />
              <FeatureCard 
                icon={<Award className="w-6 h-6" />}
                title="Custom Branding"
                description="White-label your galleries with your own logo, colors, and custom subdomain."
              />
            </div>
          </div>
        </section>

        {/* Referral Highlight Section */}
        <section id="referral" className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-background to-background" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 blur-3xl rounded-full" />
          
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-[10px] font-bold uppercase tracking-widest">
                  <Gift className="w-3 h-3" /> Referral Program
                </div>
                <h2 className="text-4xl lg:text-5xl font-headline font-bold leading-tight">
                  Invite Friends,<br />
                  <span className="text-violet-400 italic">Earn 10GB Free</span>
                </h2>
                <p className="text-lg text-white/60 leading-relaxed">
                  Share your unique referral link with fellow photographers. Every time a friend subscribes to a paid plan, you get <span className="text-violet-400 font-bold">10GB bonus storage</span> — completely free, for as long as they stay subscribed.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-violet-400" />
                    <span className="text-sm text-white/80">Unlimited referrals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-violet-400" />
                    <span className="text-sm text-white/80">Automatic rewards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-violet-400" />
                    <span className="text-sm text-white/80">No expiration</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/20 to-transparent blur-2xl rounded-3xl" />
                <div className="relative bg-card/80 backdrop-blur-2xl border border-violet-500/30 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/50 font-bold">Your Rewards</p>
                      <p className="text-2xl font-headline font-bold text-white">+30 GB</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Active Referrals</span>
                      <span className="text-violet-400 font-bold">3 Friends</span>
                    </div>
                    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Storage Bonus</span>
                      <span className="text-white/80 font-bold">+30GB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 lg:py-32 px-6 bg-background relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl lg:text-6xl font-headline font-bold">Choose Your <span className="text-primary italic">Tier</span></h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Scalable cloud storage and tiered processing for studios of all sizes.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.values(HAFASH_PLANS)
                .filter((plan) => plan.id !== 'trial')
                .map((plan) => (
                  <PricingCard key={plan.id} plan={plan} />
                ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 lg:py-32 px-6 bg-card/30 relative border-y border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl lg:text-6xl font-headline font-bold mb-12">Our <span className="text-primary italic">Vision</span></h2>
            <div className="space-y-12 text-lg text-muted-foreground leading-relaxed font-light">
              <p className="text-xl lg:text-2xl text-white/80">
                "Hafash is more than just a delivery tool; it is a premium ecosystem crafted exclusively for professional photographers. We believe that the moment of delivery should be as impactful as the event itself."
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left pt-8 border-t border-white/10">
                <div className="space-y-4">
                  <h4 className="text-primary font-bold uppercase tracking-widest text-xs">Who It's For</h4>
                  <p className="text-base">Wedding, event, and portrait photographers who demand excellence and want to provide their clients with a high-end digital experience.</p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-primary font-bold uppercase tracking-widest text-xs">Why Hafash?</h4>
                  <p className="text-base">Because generic cloud storage isn't enough. Your work deserves specialized tools like dynamic watermarking, curated client favoriting, and blazing fast mobile-first galleries.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tagline Section */}
        <section className="py-32 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
          <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
            <h3 className="text-primary font-headline text-3xl sm:text-5xl lg:text-6xl italic mb-8 leading-tight drop-shadow-lg">"Deliver your work in a way that reflects its value."</h3>
            <p className="text-white/50 text-lg uppercase tracking-[0.3em] font-bold">— Hafash.pk Philosophy</p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-[0.3em]">
              <Sparkles className="w-3.5 h-3.5" /> Start Free Today
            </div>
            <h2 className="text-4xl lg:text-6xl font-headline font-bold leading-tight">
              Ready to Deliver <span className="text-primary italic">Beautifully?</span>
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Join hundreds of photographers who are transforming how they deliver memories.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:scale-105 transition-all">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-3xl font-headline font-bold text-primary italic drop-shadow-md">Hafash.pk</span>
            <p className="text-sm text-white/40 mt-2 font-light">© 2026 Hafash.pk. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-white/50">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-start p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-primary/30 hover:bg-white/[0.04] transition-all duration-500 group">
      <div className="mb-6 p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
        {icon}
      </div>
      <h4 className="text-xl font-headline font-bold mb-3 text-white">{title}</h4>
      <p className="text-sm text-white/50 leading-relaxed font-light">{description}</p>
    </div>
  );
}

function PricingCard({ plan }: { plan: any }) {
  const isPopular = plan.id === 'professional';
  
  return (
    <div className={`flex flex-col p-8 lg:p-10 rounded-[2rem] border transition-all duration-500 relative group overflow-hidden ${
      isPopular 
        ? 'bg-gradient-to-b from-primary/10 to-transparent border-primary/40 shadow-[0_0_50px_rgba(212,175,55,0.1)] lg:scale-105' 
        : 'bg-white/[0.02] border-white/5 hover:border-primary/30'
    }`}>
      {isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-5 py-1.5 rounded-bl-xl uppercase tracking-widest">
          Most Popular
        </div>
      )}
      <div className="mb-8">
        <h4 className="text-2xl font-headline font-bold mb-2 text-white">{plan.name}</h4>
        <div className="flex items-baseline gap-1 mt-4">
          <span className="text-4xl lg:text-5xl font-headline font-bold text-primary">{plan.price}</span>
          <span className="text-white/40 text-sm">/mo</span>
        </div>
        <p className="mt-4 text-xs font-bold text-white/40 uppercase tracking-wider">{plan.storageGb}GB Storage Capacity</p>
      </div>
      <ul className="flex-1 space-y-4 mb-10">
        {plan.features.map((feature: string) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-white/70 font-light">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-tight">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/signup">
        <Button className={`w-full rounded-xl font-bold h-12 transition-all duration-300 ${
          isPopular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
        }`}>
          Start Your Studio
        </Button>
      </Link>
    </div>
  );
}