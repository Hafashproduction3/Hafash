
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { MobileNav } from '@/components/layout/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <DashboardSidebar />
      <MobileNav />
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
