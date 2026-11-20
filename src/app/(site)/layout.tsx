import { LandingFooter, LandingHeader } from "@/features/landing";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-white">
      <LandingHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

