"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Trash2,
  MoreVertical,
  Camera,
  Calendar as CalendarIcon,
  User as UserIcon,
  Heart,
  ArrowRight,
  AlertCircle,
  Settings,
  Image as ImageIcon,
  CreditCard,
  HardDrive,
  AlertTriangle,
  Sparkles,
  Inbox,
  MessageSquare,
  Send,
  TrendingUp,
  Users,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { deleteGalleryFiles } from '@/app/actions/storage';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { getUserPlan, calculateUsageGb } from '@/lib/plans';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [galleryToDelete, setGalleryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Galleries ───
  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  // ─── Profile ───
  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(profileRef);

  // ─── Network: Incoming requests ───
  const incomingQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'networkRequests'),
      where('professionalId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.uid]);
  const { data: incomingRequests } = useCollection(incomingQuery);
  const pendingCount = incomingRequests?.length || 0;

  // ─── Network: Outgoing accepted ───
  const outgoingQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'networkRequests'),
      where('hirerId', '==', user.uid),
      where('status', 'in', ['accepted', 'completed'])
    );
  }, [firestore, user?.uid]);
  const { data: outgoingAccepted } = useCollection(outgoingQuery);

  // ─── Network: Incoming accepted ───
  const incomingAcceptedQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'networkRequests'),
      where('professionalId', '==', user.uid),
      where('status', 'in', ['accepted', 'completed'])
    );
  }, [firestore, user?.uid]);
  const { data: incomingAccepted } = useCollection(incomingAcceptedQuery);

  const totalAccepted = (outgoingAccepted?.length || 0) + (incomingAccepted?.length || 0);

  // ─── Network profile ───
  const networkProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'networkProfiles', user.uid);
  }, [firestore, user?.uid]);
  const { data: myNetworkProfile } = useDoc(networkProfileRef);
  const hasNetworkProfile = !!myNetworkProfile;

  // ─── Unread messages ───
  const allAcceptedRequests = useMemo(() => {
    const map = new Map<string, any>();
    [...(outgoingAccepted || []), ...(incomingAccepted || [])].forEach((r: any) => {
      if (r?.id) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [outgoingAccepted, incomingAccepted]);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!firestore || !user || allAcceptedRequests.length === 0) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function countUnread() {
      const { getDoc } = await import('firebase/firestore');
      let count = 0;

      await Promise.all(
        allAcceptedRequests.map(async (req: any) => {
          try {
            const snap = await getDoc(doc(firestore!, 'networkChats', req.id));
            if (!snap.exists()) return;
            const data = snap.data();
            const lastMessageBy = data.lastMessageBy;
            const lastMessageAt = data.lastMessageAt?.seconds || 0;
            if (!lastMessageBy || lastMessageBy === user!.uid) return;

            const isHirer = req.hirerId === user!.uid;
            const readAt = isHirer ? data.readByHirarAt?.seconds : data.readByProfessionalAt?.seconds;

            if (!readAt) {
              count++;
            } else if (lastMessageAt > readAt) {
              count++;
            }
          } catch (e) {
            // silent
          }
        })
      );

      if (!cancelled) setUnreadCount(count);
    }

    countUnread();

    return () => { cancelled = true; };
  }, [firestore, user, allAcceptedRequests]);

  // ─── Plan ───
  const currentPlan = useMemo(() => getUserPlan(profile?.planId), [profile?.planId]);
  const planExpiryDate = useMemo(() => {
    const raw = profile?.planExpiryDate;
    if (!raw) return null;
    return typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw);
  }, [profile?.planExpiryDate]);
  const hasActivePlan = useMemo(() => {
    if (!profile?.planId || currentPlan.id === 'none') return false;
    if (!planExpiryDate) return false;
    return planExpiryDate.getTime() > Date.now();
  }, [profile?.planId, currentPlan.id, planExpiryDate]);

  const currentUsageGb = useMemo(() => calculateUsageGb(galleries || []), [galleries]);
  const storageLimitGb = currentPlan.storageGb || 0;
  const usagePercent = storageLimitGb > 0 ? Math.min((currentUsageGb / storageLimitGb) * 100, 100) : 0;
  const isNearLimit = usagePercent >= 90 && usagePercent < 100;
  const isOverLimit = usagePercent >= 100;

  // ─── Stats ───
  const stats = useMemo(() => {
    const active = galleries || [];
    return {
      totalDeliveries: active.length,
      totalPhotos: active.reduce((acc, g) => acc + (g.items?.length || 0), 0),
      totalFavorites: active.reduce((acc, g) => acc + (g.items?.filter((i: any) => i.isFavorite).length || 0), 0)
    };
  }, [galleries]);

  const filteredGalleries = useMemo(() => {
    if (!galleries) return [];
    const queryLower = searchQuery.toLowerCase();
    return galleries
      .filter(g =>
        g.title?.toLowerCase().includes(queryLower) ||
        g.clientName?.toLowerCase().includes(queryLower)
      )
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [galleries, searchQuery]);

  useEffect(() => {
    if (!galleryToDelete) {
      const timer = setTimeout(() => {
        if (typeof document !== 'undefined') {
          document.body.style.pointerEvents = '';
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [galleryToDelete]);

  const confirmDelete = useCallback(() => {
    if (!firestore || !user || !galleryToDelete || isDeleting) return;

    const idToDelete = galleryToDelete;
    const galleryDoc = (galleries || []).find(g => g.id === idToDelete);

    setIsDeleting(true);
    setGalleryToDelete(null);

    const storageKeys = Array.isArray(galleryDoc?.items)
      ? galleryDoc.items
          .map((item: any) => item?.storageKey)
          .filter((key: any): key is string => typeof key === 'string' && key.length > 0)
      : [];

    const deletionPromise = deleteDoc(doc(firestore, "galleries", idToDelete));

    deletionPromise
      .then(() => {
        toast({
          title: "Gallery Record Removed",
          description: "The luxury event has been removed from your studio registry.",
        });
      })
      .catch((err: any) => {
        console.error("[DASHBOARD_DELETE] Firestore deletion failed:", err);
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: "A database error occurred while removing the record.",
        });
      })
      .finally(() => {
        setIsDeleting(false);
      });

    if (storageKeys.length > 0) {
      void deleteGalleryFiles(storageKeys).catch(e =>
        console.error('[DASHBOARD_DELETE] R2 cleanup error:', e)
      );
    }
  }, [firestore, user, galleryToDelete, galleries, toast, isDeleting]);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">

      {/* ═══ HEADER ═══ */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/8 via-transparent to-transparent blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-1000 -z-10" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/30 rounded-full" />
              <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-primary/90">
                Studio Workspace
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight text-white">
              Studio <span className="text-primary italic">Dashboard</span>
            </h1>
            <p className="text-muted-foreground text-[13px] font-medium">
              Manage your luxury visual deliveries with precision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/events/create">
              <Button className="rounded-2xl h-12 px-6 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 font-bold gap-2.5 shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 active:scale-95 group">
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                <span className="text-[13px]">Create Event</span>
              </Button>
            </Link>

            <Link href="/network/hub">
              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 font-bold gap-2.5 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group"
              >
                <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[13px]">Hafash Network</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </Button>
            </Link>

            <Link href="/locations">
              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 font-bold gap-2.5 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group"
              >
                <MapPin className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[13px]">Shoot Locations</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ NETWORK WIDGET ═══ */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card/60 to-background p-5 lg:p-6 shadow-lg">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-white flex items-center gap-2">
                  Hafash Network
                  {(pendingCount > 0 || unreadCount > 0) && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md animate-pulse">
                      {pendingCount + unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasNetworkProfile
                    ? "Aapka Network profile active hai"
                    : "Abhi tak Network profile nahi banayi"}
                </p>
              </div>
            </div>

            <Link href="/network/hub">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5 border-primary/30 hover:bg-primary/5 hover:border-primary/50"
              >
                Open Hub
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NetworkStatCard
              icon={<Inbox className="w-4 h-4" />}
              label="Incoming"
              value={pendingCount}
              href="/network/incoming"
              highlight={pendingCount > 0}
              color="amber"
            />
            <NetworkStatCard
              icon={<MessageSquare className="w-4 h-4" />}
              label="Messages"
              value={unreadCount}
              href="/network/messages"
              highlight={unreadCount > 0}
              color="pink"
            />
            <NetworkStatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Active"
              value={totalAccepted}
              href="/network/requests"
              color="green"
            />
            <NetworkStatCard
              icon={hasNetworkProfile ? <Sparkles className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              label={hasNetworkProfile ? "Profile" : "Setup"}
              value={hasNetworkProfile ? "✓" : "!"}
              href={hasNetworkProfile ? `/network/professional/${user?.uid}` : "/network/join"}
              color={hasNetworkProfile ? "primary" : "amber"}
            />
          </div>
        </div>
      </div>

      {/* ═══ NO PLAN ═══ */}
      {!profileLoading && !hasActivePlan && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/8 via-card/60 to-card/40 backdrop-blur-xl p-4 md:p-5 shadow-lg">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-[15px] text-white flex items-center gap-2">
                  No Active Plan
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                    Setup
                  </span>
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Activate a plan to start delivering galleries to clients.
                </p>
              </div>
            </div>

            <Link href="/storage" className="w-full md:w-auto shrink-0">
              <Button className="w-full md:w-auto h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-[12px] gap-1.5 group shadow-lg shadow-primary/20">
                Activate Plan
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ═══ STORAGE ═══ */}
      {!profileLoading && hasActivePlan && (
        <div className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-xl p-5 shadow-lg transition-all duration-500",
          isOverLimit ? "border-destructive/40 bg-destructive/5" :
          isNearLimit ? "border-orange-500/30 bg-orange-500/5" :
          "border-primary/20 bg-card/30"
        )}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1 w-full">
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                isOverLimit ? "bg-destructive/15" :
                isNearLimit ? "bg-orange-500/15" :
                "bg-primary/15"
              )}>
                <HardDrive className={cn(
                  "w-5 h-5",
                  isOverLimit ? "text-destructive" :
                  isNearLimit ? "text-orange-500" :
                  "text-primary"
                )} />
              </div>

              <div className="flex-1 w-full">
                <div className="flex items-baseline justify-between mb-2 gap-4">
                  <div>
                    <h3 className="font-headline font-bold text-[15px] text-white">
                      {currentPlan.name} Storage
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isOverLimit ? "Storage full — upgrade to continue" :
                       isNearLimit ? "Running low on storage space" :
                       "Your studio's cloud storage usage"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-xl font-headline font-bold tracking-tight",
                      isOverLimit ? "text-destructive" :
                      isNearLimit ? "text-orange-500" :
                      "text-primary"
                    )}>
                      {Math.round(usagePercent)}%
                    </p>
                  </div>
                </div>

                <div className="relative w-full h-2 bg-background/60 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out",
                      isOverLimit ? "bg-gradient-to-r from-destructive to-red-400" :
                      isNearLimit ? "bg-gradient-to-r from-orange-500 to-amber-400" :
                      "bg-gradient-to-r from-primary/70 to-primary"
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mt-2 gap-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className={cn(
                      isOverLimit ? "text-destructive" :
                      isNearLimit ? "text-orange-500" :
                      "text-primary"
                    )}>
                      {currentUsageGb.toFixed(2)} GB
                    </span>
                    <span className="text-muted-foreground/60"> / {storageLimitGb} GB</span>
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {Math.max(storageLimitGb - currentUsageGb, 0).toFixed(2)} GB left
                  </p>
                </div>
              </div>
            </div>

            {(isNearLimit || isOverLimit) && (
              <Link href="/storage" className="w-full md:w-auto shrink-0">
                <Button className={cn(
                  "w-full md:w-auto h-10 px-5 rounded-xl font-bold text-[12px] gap-1.5",
                  isOverLimit
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard label="Total Deliveries" value={stats.totalDeliveries} icon={<Camera className="w-5 h-5" />} loading={dataLoading} />
        <StatCard label="Cloud Assets" value={stats.totalPhotos} icon={<LayoutGrid className="w-5 h-5" />} loading={dataLoading} />
        <StatCard label="Client Favorites" value={stats.totalFavorites} icon={<Heart className="w-5 h-5" />} loading={dataLoading} color="text-red-400" />
      </div>

      {/* ═══ SEARCH + CONTROLS ═══ */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card/20 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-2xl">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search galleries or clients..."
            className="pl-11 h-12 bg-background/40 border-white/5 rounded-xl focus:ring-primary/20 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="flex bg-background/40 p-1 rounded-xl border border-white/5 shadow-inner">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' && "bg-primary text-primary-foreground shadow-lg")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' && "bg-primary text-primary-foreground shadow-lg")}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ GALLERIES ═══ */}
      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-96 rounded-[2.5rem] bg-card/20" />
          ))}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-card/5 backdrop-blur-sm">
          <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/5">
            <Camera className="w-9 h-9 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-headline font-bold text-white mb-2">No galleries found</h3>
          <p className="text-muted-foreground italic max-w-xs mx-auto text-sm">
            Start your studio journey by creating your first luxury event.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGalleries.map(gallery => (
            <Card
              key={gallery.id}
              className="group relative overflow-hidden rounded-[2.5rem] border-white/5 bg-card/30 hover:border-primary/40 transition-all duration-700 shadow-2xl hover:translate-y-[-8px] hover:shadow-primary/5"
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                {gallery.coverImage ? (
                  <img src={gallery.coverImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={gallery.title} />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-white/5" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />

                <div className="absolute top-5 right-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-xl text-white border border-white/10 hover:bg-white/20 transition-all shadow-2xl">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-card/95 backdrop-blur-2xl border-white/10 p-2 shadow-2xl">
                      <DropdownMenuItem className="rounded-xl px-4 py-3 focus:bg-primary/20" onClick={() => router.push(`/events/${gallery.id}/manage`)}>
                        <Settings className="w-4 h-4 mr-3" /> Manage Gallery
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl px-4 py-3 focus:bg-primary/20" onClick={() => router.push(`/events/${gallery.id}/upload`)}>
                        <ImageIcon className="w-4 h-4 mr-3" /> Add Assets
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl px-4 py-3 focus:bg-primary/20" onClick={() => window.open(`/gallery/${gallery.slug || gallery.id}`, '_blank')}>
                        <LayoutGrid className="w-4 h-4 mr-3" /> Open Public View
                      </DropdownMenuItem>
                      <div className="h-px bg-white/5 my-2" />
                      <DropdownMenuItem className="rounded-xl px-4 py-3 text-destructive focus:bg-destructive/10 font-bold" onClick={() => setGalleryToDelete(gallery.id)}>
                        <Trash2 className="w-4 h-4 mr-3" /> Delete Record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="absolute bottom-6 left-8 right-8">
                  <Badge className="bg-primary/20 text-primary border border-primary/30 mb-4 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md rounded-lg">
                    {gallery.category}
                  </Badge>
                  <h3 className="text-3xl font-headline font-bold text-white tracking-tight line-clamp-1 drop-shadow-2xl">
                    {gallery.title}
                  </h3>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-primary" /> {gallery.clientName}
                  </span>
                  <span className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-primary" /> {gallery.date}
                  </span>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">Status</span>
                    <span className="text-xs font-medium text-white/80">{gallery.items?.length || 0} Assets Delivered</span>
                  </div>
                  <Link href={`/events/${gallery.id}/manage`}>
                    <Button variant="ghost" size="sm" className="h-10 rounded-xl px-5 gap-2 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary transition-all active:scale-95">
                      Manage <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGalleries.map(gallery => (
            <div key={gallery.id} className="flex items-center gap-6 p-5 bg-card/30 backdrop-blur-md border border-white/5 rounded-3xl group hover:border-primary/40 transition-all duration-500 shadow-xl hover:translate-x-2">
              <div className="h-16 w-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                {gallery.coverImage ? (
                  <img src={gallery.coverImage} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white/5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-2">
                  <h4 className="font-headline font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {gallery.title}
                  </h4>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold px-3 py-1 border-primary/20 text-primary bg-primary/5">
                    {gallery.category}
                  </Badge>
                </div>

                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-6">
                  <span className="flex items-center gap-2"><UserIcon className="w-3.5 h-3.5 text-primary" /> {gallery.clientName}</span>
                  <span className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5 text-primary" /> {gallery.date}</span>
                  <span className="flex items-center gap-2 text-white/40"><LayoutGrid className="w-3.5 h-3.5" /> {gallery.items?.length || 0} Assets</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/events/${gallery.id}/manage`}>
                  <Button variant="outline" size="sm" className="h-10 px-5 rounded-xl border-white/10 font-bold hover:bg-primary hover:text-primary-foreground shadow-lg transition-all active:scale-95">
                    Manage
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl transition-all" onClick={() => setGalleryToDelete(gallery.id)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ DELETE DIALOG ═══ */}
      <AlertDialog open={!!galleryToDelete} onOpenChange={(open) => !open && setGalleryToDelete(null)}>
        <AlertDialogContent className="bg-card/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] max-w-md ring-1 ring-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive to-transparent opacity-50" />
          <AlertDialogHeader>
            <div className="bg-destructive/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-destructive/5 shadow-inner">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <AlertDialogTitle className="text-3xl font-headline font-bold text-center text-white">Permanent Purge</AlertDialogTitle>
            <AlertDialogDescription className="text-center italic mt-4 text-muted-foreground text-base">
              Are you sure you want to remove this gallery? This will permanently delete all metadata from the studio registry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-5 mt-10">
            <AlertDialogCancel className="rounded-2xl h-14 flex-1 font-bold text-[11px] uppercase tracking-[0.2em] border-white/10 hover:bg-white/5 transition-all">Abort</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl h-14 flex-1 bg-destructive text-white hover:bg-destructive/90 font-bold text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95" onClick={confirmDelete}>
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Network Stat Card
// ─────────────────────────────────────────────────────────────

function NetworkStatCard({
  icon,
  label,
  value,
  href,
  highlight,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  highlight?: boolean;
  color: 'amber' | 'pink' | 'green' | 'primary';
}) {
  const colorClasses = {
    amber: {
      border: highlight ? 'border-amber-500/40' : 'border-amber-500/20',
      bg: highlight ? 'bg-amber-500/10' : 'bg-amber-500/5',
      icon: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      value: highlight ? 'text-amber-400' : 'text-white',
    },
    pink: {
      border: highlight ? 'border-pink-500/40' : 'border-pink-500/20',
      bg: highlight ? 'bg-pink-500/10' : 'bg-pink-500/5',
      icon: 'text-pink-400',
      iconBg: 'bg-pink-500/15',
      value: highlight ? 'text-pink-400' : 'text-white',
    },
    green: {
      border: 'border-green-500/20',
      bg: 'bg-green-500/5',
      icon: 'text-green-400',
      iconBg: 'bg-green-500/15',
      value: 'text-white',
    },
    primary: {
      border: 'border-primary/20',
      bg: 'bg-primary/5',
      icon: 'text-primary',
      iconBg: 'bg-primary/15',
      value: 'text-white',
    },
  }[color];

  return (
    <Link href={href}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 cursor-pointer group",
          "hover:scale-[1.02] hover:-translate-y-0.5",
          colorClasses.border,
          colorClasses.bg
        )}
      >
        {highlight && (
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-current/10 blur-2xl animate-pulse" />
        )}

        <div className="relative flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            colorClasses.iconBg
          )}>
            <div className={colorClasses.icon}>{icon}</div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </p>
            <p className={cn(
              "text-xl font-headline font-bold leading-tight mt-0.5",
              colorClasses.value
            )}>
              {value}
            </p>
          </div>

          {highlight && typeof value === 'number' && value > 0 && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-current animate-pulse" />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card (Gallery stats)
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  loading,
  color = "text-primary"
}: {
  label: string,
  value: number,
  icon: React.ReactNode,
  loading: boolean,
  color?: string
}) {
  return (
    <Card className="group relative overflow-hidden bg-card/20 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl transition-all duration-500 hover:translate-y-[-6px] hover:border-primary/30 hover:shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <CardContent className="p-7 flex items-center justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/60 group-hover:text-primary transition-colors">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-10 w-16 bg-white/5" />
          ) : (
            <h3 className={cn("text-4xl font-headline font-bold tracking-tighter drop-shadow-2xl", color)}>
              {value}
            </h3>
          )}
        </div>
        <div className="h-14 w-14 rounded-2xl bg-background/60 flex items-center justify-center text-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-white/5 group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}