
import Link from 'next/link';
import { Camera, Shield, Heart, Share2, ArrowRight, Check, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HAFASH_PLANS } from '@/lib/plans';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="px-6 lg:px-12 h-24 flex items-center justify-between border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-1">
          <img src="/hafash-logo.png" alt="Hafash Platform" className="h-[57px] lg:h-[70px] w-auto" />
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-headline font-bold text-primary tracking-tighter italic">Hafash.pk</span>
          </Link>
        </div>
        <nav className="hidden md:flex gap-8">
          <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
          <Link href="#about" className="text-sm font-medium hover:text-primary transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium">Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold">Join Now</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://picsum.photos/seed/hafash-hero/1920/1080" 
              alt="Luxury Wedding" 
              className="w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"
              data-ai-hint="luxury wedding"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
          
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-8xl font-headline font-bold mb-6 tracking-tight leading-tight">
              Deliver Memories <span className="text-primary italic">Beautifully</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground mb-10 font-body max-w-2xl mx-auto">
              The luxury gallery delivery platform designed exclusively for wedding and event photographers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-10 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold">
                  Start Your Studio
                </Button>
              </Link>
              <Link href="/gallery/demo">
                <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-primary text-primary hover:bg-primary/10 rounded-full font-bold">
                  View Demo Gallery
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-6 bg-card">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-headline mb-4">Crafted for Excellence</h2>
              <p className="text-muted-foreground text-lg">Every feature built with luxury in mind.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <FeatureCard 
                icon={<Camera className="w-8 h-8 text-primary" />}
                title="Cinematic Galleries"
                description="Experience blazing fast, mobile-optimized galleries that feel like a high-end digital editorial."
              />
              <FeatureCard 
                icon={<Shield className="w-8 h-8 text-primary" />}
                title="Smart Protection"
                description="Toggle downloads on or off with integrated dynamic watermarking system."
              />
              <FeatureCard 
                icon={<Heart className="w-8 h-8 text-primary" />}
                title="Curation Hub"
                description="Let clients favorite their moments and sync them instantly to your professional panel."
              />
              <FeatureCard 
                icon={<Share2 className="w-8 h-8 text-primary" />}
                title="Instant Delivery"
                description="One-click sharing via WhatsApp or direct links for an effortless client experience."
              />
              <FeatureCard 
                icon={<Users className="w-8 h-8 text-primary" />}
                title="Role-Based Access"
                description="Tailored experiences for both photographers managing assets and clients enjoying them."
              />
              <FeatureCard 
                icon={<Sparkles className="w-8 h-8 text-primary" />}
                title="Storage Plans"
                description="Flexible storage options from 50GB to 500GB to grow with your photography business."
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-headline mb-4">Choose Your Tier</h2>
              <p className="text-muted-foreground text-lg">Scalable storage and processing for studios of all sizes.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.values(HAFASH_PLANS).map((plan) => (
                <PricingCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 px-6 bg-card">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-headline mb-8">Our Vision</h2>
            <div className="space-y-8 text-lg text-muted-foreground leading-relaxed">
              <p>
                Hafash is more than just a delivery tool; it is a premium ecosystem crafted exclusively for professional photographers. We believe that the moment of delivery should be as impactful as the event itself.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-12">
                <div className="space-y-4">
                  <h4 className="text-primary font-bold uppercase tracking-widest text-sm">Who It's For</h4>
                  <p className="text-sm">Wedding, event, and portrait photographers who demand excellence and want to provide their clients with a high-end digital experience.</p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-primary font-bold uppercase tracking-widest text-sm">Why Hafash?</h4>
                  <p className="text-sm">Because generic cloud storage isn't enough. Your work deserves specialized tools like dynamic watermarking, curated client favoriting, and blazing fast mobile-first galleries.</p>
                </div>
              </div>
              <p className="mt-12 pt-12 border-t border-border/30 italic">
                "To become the gold standard for high-end photography delivery, empowering artists to reflect the true value of their craft."
              </p>
            </div>
          </div>
        </section>

        {/* Tagline Section */}
        <section className="py-32 bg-background border-t border-border/30">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h3 className="text-primary font-headline text-3xl md:text-5xl italic mb-8">"Deliver your work in a way that reflects its value."</h3>
            <p className="text-muted-foreground text-xl italic">— Hafash.pk Philosophy</p>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-border/50 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-2xl font-headline font-bold text-primary italic">Hafash.pk</span>
            <p className="text-sm text-muted-foreground mt-2">© 2024 Hafash.pk. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-border/30 bg-background/50 hover:border-primary/50 transition-all duration-300 group">
      <div className="mb-6 p-4 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <h4 className="text-xl font-headline font-bold mb-4">{title}</h4>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({ plan }: { plan: any }) {
  return (
    <div className="flex flex-col p-8 rounded-3xl border border-border/30 bg-card/50 hover:border-primary/50 transition-all duration-500 relative group overflow-hidden">
      {plan.id === 'pro' && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest">
          Recommended
        </div>
      )}
      <div className="mb-8">
        <h4 className="text-xl font-headline font-bold mb-1">{plan.name}</h4>
        <div className="flex items-baseline gap-1 mt-4">
          <span className="text-4xl font-headline font-bold text-primary">{plan.price}</span>
          <span className="text-muted-foreground text-sm">/mo</span>
        </div>
        <p className="mt-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">{plan.storageGb}GB Storage Capacity</p>
      </div>
      <ul className="flex-1 space-y-4 mb-8">
        {plan.features.map((feature: string) => (
          <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/signup">
        <Button className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12">
          Start Your Studio
        </Button>
      </Link>
    </div>
  );
}
