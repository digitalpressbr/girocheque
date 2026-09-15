import { Link, useLocation } from "react-router-dom";
import { Home, Calculator, Calendar, FileText, BarChart3 } from "lucide-react";

const tabs = [
  { path: "/", label: "Início", icon: Home },
  { path: "/desconto", label: "Desconto", icon: Calculator },
  { path: "/vencimentos", label: "Vencimentos", icon: Calendar },
  { path: "/cheques", label: "Cheques", icon: FileText },
  { path: "/relatorio", label: "Relatório", icon: BarChart3 },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav data-bottom-nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors ${
                active
                  ? "text-emerald-700"
                  : "text-gray-400"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-bottom" />
    </nav>
  );
}