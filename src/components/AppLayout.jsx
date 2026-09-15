import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import DigitalPressBadge from "@/components/DigitalPressBadge";

export default function AppLayout() {
  useEffect(() => {
    document.documentElement.lang = 'pt-BR';
    document.documentElement.setAttribute('translate', 'no');
    document.title = 'GiroCheque';
    if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
      const m = document.createElement('meta');
      m.name = 'google';
      m.content = 'notranslate';
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="notranslate min-h-screen bg-gray-50 max-w-lg mx-auto">
      <div className="pb-24">
        <Outlet />
        <DigitalPressBadge className="mt-6" />
      </div>
      <BottomNav />
    </div>
  );
}