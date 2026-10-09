"use client";

import { useUser, useFirestore } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, BarChart3, Eye, Heart, Download, Users, 
  TrendingUp, Smartphone, Monitor, Globe, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc } from 'firebase/firestore';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { getUserPlan } from '@/lib/plans';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Link from 'next/link';

const COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B'];

export default function GalleryAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const galleryId = params?.id as string;
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [gallery, setGallery] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      if (!firestore || !user || !galleryId) {
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(firestore, 'users', user.uid));
        const profileData = profileSnap.exists() ? profileSnap.data() : {};
        setProfile(profileData);

        const gallerySnap = await getDoc(doc(firestore, 'galleries', galleryId));
        if (gallerySnap.exists()) {
          setGallery({ id: gallerySnap.id, ...gallerySnap.data() });
        }
      } catch (e) {
        console.error('[ANALYTICS_LOAD]', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [firestore, user, galleryId]);

  if (authLoading || loading) {
    return <HafashLoader text="Loading Analytics..." />;
  }

  if (!user) return null;

  const plan = getUserPlan(profile?.planId, user.email);
  const hasBasicAnalytics = ['business', 'enterprise'].includes(plan.id) || profile?.isOwner;
  const hasAdvancedAnalytics = plan.id === 'enterprise' || profile?.isOwner;

  if (!hasBasicAnalytics) {
    return (
      <div className="text-center py-40 bg-card/20 backdrop-blur-md border border-white/5 rounded-[3rem] max-w-2xl mx-auto">
        <BarChart3 className="w-20 h-20 text-muted-foreground mx-auto mb-8 opacity-20" />
        <h2 className="text-3xl font-headline font-bold text-white mb-4">Analytics Not Available</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Analytics sirf <strong className="text-primary">Business</strong> aur <strong className="text-primary">Enterprise</strong> plans mein available hai.
        </p>
        <Link href="/storage">
          <Button className="rounded-2xl h-14 px-12 bg-primary text-primary-foreground font-bold shadow-2xl">
            Upgrade to Business
          </Button>
        </Link>
      </div>
    );
  }

  const devicesData = gallery?.devices
    ? Object.entries(gallery.devices).map(([name, value]) => ({ name, value }))
    : [];
  const sourcesData = gallery?.sources
    ? Object.entries(gallery.sources).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl lg:text-5xl font-headline font-bold text-white">
            Analytics <span className="text-primary italic">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {gallery?.title || 'Gallery'} — Detailed insights
          </p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold uppercase tracking-widest ml-auto">
          {plan.name}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard icon={<Eye />} label="Total Views" value={gallery?.viewCount || 0} />
        <StatCard icon={<Users />} label="Unique Visitors" value={gallery?.uniqueVisitors || 0} />
        <StatCard icon={<Heart />} label="Favorites" value={gallery?.items?.filter((i: any) => i.isFavorite).length || 0} />
        <StatCard icon={<Download />} label="Downloads" value={gallery?.downloadCount || 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Device Type */}
        <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-border/30 px-8 py-8">
            <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-primary" /> Device Type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {devicesData.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-10">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={devicesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {devicesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Traffic Source */}
        <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-border/30 px-8 py-8">
            <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
              <Globe className="w-6 h-6 text-primary" /> Traffic Source
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {sourcesData.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-10">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourcesData}>
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics — Enterprise */}
      {hasAdvancedAnalytics && (
        <Card className="bg-gradient-to-br from-primary/10 via-card/60 to-background border border-primary/30 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-primary/20 px-8 py-8">
            <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" /> Advanced Analytics
              <Badge className="bg-primary/20 text-primary text-[9px] font-bold uppercase">Enterprise</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <p className="text-sm text-muted-foreground">
              Advanced analytics ke liye geographic data, views by day, aur bahut kuch coming soon!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FeatureCard icon={<Globe />} label="Geographic Data" />
              <FeatureCard icon={<TrendingUp />} label="Views by Day" />
              <FeatureCard icon={<Monitor />} label="Real-time Tracking" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-card/40 border-border/50 rounded-2xl">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            {icon}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
        <p className="text-3xl font-headline font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

function FeatureCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="p-5 rounded-2xl bg-background/60 border border-white/5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
        {icon}
      </div>
      <p className="text-sm font-bold text-white">{label}</p>
    </div>
  );
}