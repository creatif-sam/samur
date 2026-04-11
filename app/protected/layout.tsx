import { BottomNav } from "@/components/bottom-nav";
import { Topbar } from "@/components/topbar";
import { TranslationProvider } from "@/contexts/TranslationContext";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TranslationProvider>
      <div className="min-h-screen bg-background">
        <Topbar />
        <main className="pb-20">
          {children}
        </main>
        <BottomNav />
      </div>
    </TranslationProvider>
  );
}
