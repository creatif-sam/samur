import { Bell, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Topbar() {
  return (
    <header
      className="
        sticky top-0 z-40
        w-full
        px-4 py-3
        flex items-center justify-between
      "
      style={{
        background: 'linear-gradient(90deg, #7c3aed 0%, #000 100%)',
      }}
    >
      <h1 className="text-lg font-semibold tracking-tight text-white">
        Together
      </h1>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Help"
          className="text-white hover:bg-white/10"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
