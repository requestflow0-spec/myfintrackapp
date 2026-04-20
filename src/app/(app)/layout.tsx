import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/header";
import { MainNav } from "@/components/main-nav";
import { ProfileProvider } from "@/context/ProfileContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ProfileProvider>
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
          <div className="hidden bg-muted/50 text-card-foreground md:block sticky top-0 h-screen overflow-y-auto">
            <div className="flex h-full flex-col gap-2">
              <div className="flex h-14 items-center px-4 lg:h-[60px] lg:px-6 sticky top-0 bg-transparent z-10">
                <a href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m12 12 4 10 1.5-1.5L14 14l-1.5-1.5Z"/><path d="m16 16 3-3"/><path d="M7 7h.01"/><path d="M7 11h.01"/><path d="M7 15h.01"/></svg>
                  <span className="">FinTrack Pro</span>
                </a>
              </div>
              <div className="flex-1 overflow-auto">
                <MainNav />
              </div>
            </div>
          </div>
          <div className="flex flex-col min-h-0">
            <Header />
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
              {children}
            </main>
          </div>
        </div>
      </ProfileProvider>
    </AuthGuard>
  );
}
