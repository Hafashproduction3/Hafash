"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import {
  Home, Calendar, TrendingUp, Eye, Star, Plus, ArrowRight,
  Sparkles, DollarSign, Users, Clock, CheckCircle2,
  AlertCircle, MessageSquare, Wallet, Camera,
  User  // ← YEH ADD HUA
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function LocationDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(userRef);

  // Get owner's locations
  const locationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "shootLocations"),
      where("ownerId", "==", user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: locations, loading: locationsLoading } = useCollection(locationsQuery);

  // Get bookings for owner's locations
  const bookingsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "locationBookings"),
      where("ownerId", "==", user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: bookings } = useCollection(bookingsQuery);

  // Stats
  const stats = useMemo(() => {
    const locs = locations || [];
    const bks = bookings || [];

    const totalLocations = locs.length;
    const activeLocations = locs.filter((l: any) => l.isActive === true).length;
    const totalBookings = bks.length;
    const pendingBookings = bks.filter((b: any) => b.status === "pending").length;
    const totalViews = locs.reduce((sum: number, l: any) => sum + (l.viewCount || 0), 0);
    const totalRevenue = bks
      .filter((b: any) => b.status === "completed" || b.status === "confirmed")
      .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
    const avgRating = locs.length > 0
      ? locs.reduce((sum: number, l: any) => sum + (l.rating?.average || 0), 0) / locs.length
      : 0;

    return {
      totalLocations,
      activeLocations,
      totalBookings,
      pendingBookings,
      totalViews,
      totalRevenue,
      avgRating,
    };
  }, [locations, bookings]);

  // Recent bookings (top 5)
  const recentBookings = useMemo(() => {
    if (!bookings) return [];
    return [...bookings]
      .sort((a: any, b: any) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      })
      .slice(0, 5);
  }, [bookings]);

  const ownerName = profile?.fullName || "Owner";

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">

      {/* ═══ HEADER ═══ */}
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-background p-8 lg:p-10">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                Location Owner
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              Salam, <span className="text-primary italic">{ownerName}</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Apni location ka poora control — bookings, revenue, aur stats — sab ek jagah.
            </p>
          </div>

          <Link href="/locations/join">
            <Button className="rounded-2xl h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-2xl shadow-primary/20">
              <Plus className="w-5 h-5" />
              Add New Location
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ STATS GRID ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Home className="w-5 h-5" />}
          label="Total Locations"
          value={stats.totalLocations.toString()}
          subtext={`${stats.activeLocations} active`}
          color="primary"
          loading={locationsLoading}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Bookings"
          value={stats.totalBookings.toString()}
          subtext={`${stats.pendingBookings} pending`}
          color="amber"
          loading={locationsLoading}
        />
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Total Views"
          value={stats.totalViews.toLocaleString()}
          subtext="All time"
          color="blue"
          loading={locationsLoading}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Revenue"
          value={`Rs. ${stats.totalRevenue.toLocaleString()}`}
          subtext="Confirmed only"
          color="green"
          loading={locationsLoading}
        />
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <Card className="bg-card/40 border-border/40 rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <h2 className="text-lg font-headline font-bold mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction
              icon={<Plus />}
              label="Add Location"
              href="/locations/join"
            />
            <QuickAction
              icon={<Home />}
              label="My Locations"
              href="/location-dashboard/locations"
            />
            <QuickAction
              icon={<Calendar />}
              label="View Bookings"
              href="/location-dashboard/bookings"
            />
            <QuickAction
              icon={<User />}
              label="Edit Profile"
              href="/location-dashboard/profile"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══ RECENT BOOKINGS ═══ */}
      <Card className="bg-card/40 border-border/40 rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-lg font-headline font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Recent Bookings
            </h2>
            {stats.totalBookings > 0 && (
              <Link href="/location-dashboard/bookings">
                <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-primary hover:bg-primary/5">
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="font-headline font-bold text-lg mb-2">Abhi koi booking nahi</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Jab koi photographer aapki location book karega, woh yahan dikhega.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking: any) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ MY LOCATIONS PREVIEW ═══ */}
      {stats.totalLocations > 0 && (
        <Card className="bg-card/40 border-border/40 rounded-[2rem] overflow-hidden">
          <CardContent className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="text-lg font-headline font-bold flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                My Locations
              </h2>
              <Link href="/location-dashboard/locations">
                <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-primary hover:bg-primary/5">
                  Manage All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(locations || []).slice(0, 4).map((loc: any) => (
                <LocationMiniCard key={loc.id} location={loc} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════

function StatCard({
  icon, label, value, subtext, color, loading
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: 'primary' | 'amber' | 'blue' | 'green';
  loading?: boolean;
}) {
  const colorClasses = {
    primary: {
      border: 'border-primary/20',
      bg: 'bg-primary/5',
      icon: 'text-primary',
      iconBg: 'bg-primary/15',
    },
    amber: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      icon: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
    },
    blue: {
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-500/15',
    },
    green: {
      border: 'border-green-500/20',
      bg: 'bg-green-500/5',
      icon: 'text-green-400',
      iconBg: 'bg-green-500/15',
    },
  }[color];

  return (
    <Card className={cn("rounded-2xl border", colorClasses.border, colorClasses.bg)}>
      <CardContent className="p-5">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", colorClasses.iconBg)}>
          <div className={colorClasses.icon}>{icon}</div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-20 mt-1 bg-muted/30" />
        ) : (
          <p className="text-2xl font-headline font-bold mt-1">{value}</p>
        )}
        {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUICK ACTION
// ═══════════════════════════════════════════════════════════════

function QuickAction({
  icon, label, href
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="w-full h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <div className="w-4 h-4">{icon}</div>
        </div>
        <span className="text-[11px] font-bold">{label}</span>
      </Button>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING ROW — FIXED ✅
// ═══════════════════════════════════════════════════════════════

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

function BookingRow({ booking }: { booking: any }) {
  const statusColors: Record<BookingStatus, string> = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  const status: BookingStatus = (booking.status as BookingStatus) || 'pending';
  const statusColor = statusColors[status];

  return (
    <div className="p-4 rounded-xl bg-background/40 border border-border/30 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{booking.clientName || 'Client'}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {booking.locationName} · {booking.date}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={cn("text-[10px] font-bold uppercase tracking-widest", statusColor)}>
          {booking.status || 'pending'}
        </Badge>
        {booking.totalAmount > 0 && (
          <p className="font-bold text-sm text-primary whitespace-nowrap">
            Rs. {booking.totalAmount.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOCATION MINI CARD
// ═══════════════════════════════════════════════════════════════

function LocationMiniCard({ location }: { location: any }) {
  const cover = location.photos?.[0]?.url;

  return (
    <Link href={`/locations/${location.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/30 hover:border-primary/40 transition-all group">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
          {cover ? (
            <img src={cover} alt={location.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary/30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{location.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{location.city}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn(
              "text-[9px] font-bold uppercase tracking-widest",
              location.isActive ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
            )}>
              {location.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {location.viewCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                {location.viewCount}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </Link>
  );
}