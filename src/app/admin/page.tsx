'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Image as ImageIcon,
  Users,
  Euro,
  Calculator,
  Key,
  Home,
  FileText,
  Star,
  Smartphone,
  Tag,
  Link2,
  Settings,
  SlidersHorizontal,
  Instagram,
  LayoutDashboard,
  Loader2,
  LogOut,
} from 'lucide-react';
import AdminLogin from '@/components/admin/AdminLogin';
import DemoModeToggle from '@/components/admin/DemoModeToggle';
import HutSwitch, { hutViewUrl, readHutView } from '@/components/admin/HutSwitch';
import type { HutView } from '@/lib/dashboard/hutDashboard';

// Lazy load heavy components with ssr:false (admin is client-only)
const AdminLoadingFallback = () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;

const HutDashboard = dynamic(() => import('@/components/admin/HutDashboard'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const GuestDatabase = dynamic(() => import('@/components/admin/GuestDatabase'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const FinanceOverview = dynamic(() => import('@/components/admin/FinanceOverview'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const UtilityCostsCalculator = dynamic(() => import('@/components/admin/UtilityCostsCalculator'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const ImageManager = dynamic(
  () => import('@/components/admin/ImageManager').then((mod) => ({ default: mod.ImageManager })),
  { ssr: false, loading: AdminLoadingFallback },
);
const PasswordsPanel = dynamic(
  () =>
    import('@/components/admin/PasswordsPanel').then((mod) => ({ default: mod.PasswordsPanel })),
  { ssr: false, loading: AdminLoadingFallback },
);
const BlogEditor = dynamic(() => import('@/components/admin/BlogEditor'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const ReviewsManager = dynamic(() => import('@/components/admin/ReviewsManager'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const GuestAppEditor = dynamic(() => import('@/components/admin/GuestAppEditor'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const RentalPricesEditor = dynamic(() => import('@/components/admin/RentalPricesEditor'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const Beds24Panel = dynamic(() => import('@/components/admin/Beds24Panel'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const PriceOverview = dynamic(() => import('@/components/admin/PriceOverview'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const InstagramPanel = dynamic(() => import('@/components/admin/InstagramPanel'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const LogViewer = dynamic(() => import('@/components/admin/LogViewer'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const AdminAccessPanel = dynamic(() => import('@/components/admin/AdminAccessPanel'), {
  ssr: false,
  loading: AdminLoadingFallback,
});

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 border-3 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-3 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Admin Center</h2>
          <p className="text-sm text-gray-500">Daten werden geladen...</p>
        </div>
      </div>
    </div>
  );
}

type AdminTab =
  | 'dashboard'
  | 'guests'
  | 'finances'
  | 'utilities'
  | 'rental-prices'
  | 'images'
  | 'passwords'
  | 'blog'
  | 'reviews'
  | 'guestapp'
  | 'beds24'
  | 'prices'
  | 'instagram'
  | 'system';

const TABS: {
  id: AdminTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Übersicht', shortLabel: 'Übersicht', icon: LayoutDashboard },
  { id: 'guests', label: 'Gäste', shortLabel: 'Gäste', icon: Users },
  { id: 'finances', label: 'Finanzen', shortLabel: 'Finanzen', icon: Euro },
  { id: 'utilities', label: 'Nebenkosten', shortLabel: 'NK', icon: Calculator },
  { id: 'rental-prices', label: 'Mietpreise', shortLabel: 'Preise', icon: Tag },
  { id: 'images', label: 'Bilder', shortLabel: 'Bilder', icon: ImageIcon },
  { id: 'passwords', label: 'Zugang', shortLabel: 'Zugang', icon: Key },
  { id: 'blog', label: 'Blog', shortLabel: 'Blog', icon: FileText },
  { id: 'reviews', label: 'Bewertungen', shortLabel: 'Reviews', icon: Star },
  { id: 'guestapp', label: 'Gäste-App', shortLabel: 'App', icon: Smartphone },
  { id: 'beds24', label: 'Beds24', shortLabel: 'B24', icon: Link2 },
  { id: 'prices', label: 'Preisübersicht', shortLabel: 'Preisüb.', icon: SlidersHorizontal },
  { id: 'instagram', label: 'Instagram', shortLabel: 'Insta', icon: Instagram },
  { id: 'system', label: 'System', shortLabel: 'System', icon: Settings },
];

function tabFromSearch(search: string): AdminTab {
  const tab = new URLSearchParams(search).get('tab');
  // Ohne bzw. mit unbekanntem Tab (z.B. beim Wechsel aus dem Admin Center der
  // Natberger Hütte) startet die Übersicht statt einer leeren Seite
  return TABS.find((t) => t.id === tab)?.id ?? 'dashboard';
}

function getInitialTab(): AdminTab {
  if (typeof window === 'undefined') return 'dashboard';
  return tabFromSearch(window.location.search);
}

// „Beide Hütten“ zeigen nur die Übersicht und die Preisübersicht
const BOTH_HUTS_TABS: AdminTab[] = ['dashboard', 'prices'];

function AdminPageContent({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialTab);
  // Hütten-Umschalter im Kopf: nur diese Hütte oder beide
  const [hutView, setHutView] = useState<HutView>(readHutView);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Auto-migrate database on admin load (adds missing columns/tables)
  useEffect(() => {
    fetch('/api/admin/auto-migrate', { method: 'POST' }).catch(() => {});
  }, []);

  // Load demo mode state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sechszirben_demo_mode');
      if (saved === 'true') setIsDemoMode(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Sync browser back/forward with tab state
  useEffect(() => {
    const onPopState = () => {
      setActiveTabState(tabFromSearch(window.location.search));
      setHutView(readHutView());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Handy: aktiven Tab in der unteren, seitlich scrollbaren Leiste sichtbar machen
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-mobile-tab="${activeTab}"]`);
      const bar = el?.parentElement;
      if (!el || !bar) return;
      bar.scrollLeft = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, isInitialLoading]);

  const toggleDemoMode = () => {
    const newValue = !isDemoMode;
    setIsDemoMode(newValue);
    try {
      localStorage.setItem('sechszirben_demo_mode', String(newValue));
    } catch {
      /* ignore */
    }
  };

  // Switch tabs using local state + pushState — bypasses Next.js router entirely
  // to avoid Suspense/fiber reconciliation conflicts that cause DOM errors
  const setActiveTab = useCallback((tab: AdminTab) => {
    if (tab === 'finances') {
      setFinanceRefreshKey((prev) => prev + 1);
    }
    setActiveTabState(tab);
    window.history.pushState(null, '', hutViewUrl(readHutView(), tab));
  }, []);

  // Im Kopf steht, was zu sehen ist: Tabs ohne Zwei-Hütten-Ansicht zeigen
  // nur diese Hütte — „Beide“ bleibt für die Übersicht gemerkt
  const headerView: HutView = BOTH_HUTS_TABS.includes(activeTab) ? hutView : 'own';

  const changeHutView = (view: HutView) => {
    setHutView(view);
    const tab = view === 'both' && !BOTH_HUTS_TABS.includes(activeTab) ? 'dashboard' : activeTab;
    if (tab !== activeTab) {
      if (tab === 'finances') setFinanceRefreshKey((prev) => prev + 1);
      setActiveTabState(tab);
    }
    window.history.replaceState(null, '', hutViewUrl(view, tab));
  };

  const handleDataLoaded = () => {
    setIsInitialLoading(false);
  };

  // Full screen loader
  if (isInitialLoading) {
    return (
      <>
        <FullScreenLoader />
        <div className="hidden">
          <GuestDatabase onDataLoaded={handleDataLoaded} />
        </div>
      </>
    );
  }

  return (
    <div
      className="min-h-screen bg-white admin-panel"
      style={{ fontFamily: "'Aptos', 'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-center py-1.5 text-xs font-medium z-50 relative">
          Demo-Modus aktiv — Gästedaten verfremdet, Finanzdaten gerundet
        </div>
      )}

      {/* Mobile Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40"
        style={isDemoMode ? { top: '32px' } : {}}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <a href="/" className="p-1 text-gray-400 hover:text-gray-600">
              <Home className="w-5 h-5" />
            </a>
          </div>
          <h1 className="min-w-0 truncate px-2 text-sm font-medium text-gray-900">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <HutSwitch tab={activeTab} view={headerView} onViewChange={changeHutView} compact />
            <DemoModeToggle isDemoMode={isDemoMode} onToggle={toggleDemoMode} compact />
            <button
              onClick={onLogout}
              title="Abmelden"
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block border-b border-gray-200">
        <div className="mx-auto px-6 lg:px-8 max-w-[1800px]">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <a href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Home className="w-5 h-5" />
              </a>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                Sechszirbenhütte
              </h1>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-3">
              <HutSwitch tab={activeTab} view={headerView} onViewChange={changeHutView} />
              <DemoModeToggle isDemoMode={isDemoMode} onToggle={toggleDemoMode} />
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
              <a
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-logo-green transition rounded-lg hover:bg-gray-100"
              >
                <Home className="w-4 h-4" />
                <span>Zur Homepage</span>
              </a>
            </div>
          </div>

          {/* Desktop Tab Navigation — bricht um, damit alle Tabs sichtbar sind */}
          <div className="flex flex-wrap gap-x-1 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'text-gray-900 border-green-600 font-medium'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gray-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-14 pb-20 md:pt-0 md:pb-8">
        <div className="mx-auto px-2 md:px-6 lg:px-8 max-w-[1800px] md:py-6" key={activeTab}>
          {activeTab === 'dashboard' && <HutDashboard view={hutView} />}

          {activeTab === 'guests' && <GuestDatabase demoMode={isDemoMode} />}

          {activeTab === 'finances' && (
            <FinanceOverview
              key={financeRefreshKey}
              demoMode={isDemoMode}
              onNavigateToGuest={(guestId) => {
                setActiveTab('guests');
                setTimeout(() => {
                  const guestElement = document.getElementById(`guest-${guestId}`);
                  if (guestElement) {
                    guestElement.scrollIntoView({ behavior: 'smooth' });
                    guestElement.click();
                  }
                }, 100);
              }}
            />
          )}

          {activeTab === 'utilities' && <UtilityCostsCalculator demoMode={isDemoMode} />}

          {activeTab === 'rental-prices' && <RentalPricesEditor demoMode={isDemoMode} />}

          {activeTab === 'passwords' && <PasswordsPanel />}

          {activeTab === 'images' && <ImageManager />}

          {activeTab === 'blog' && <BlogEditor />}

          {activeTab === 'reviews' && <ReviewsManager />}

          {activeTab === 'guestapp' && <GuestAppEditor />}

          {activeTab === 'beds24' && <Beds24Panel />}

          {activeTab === 'prices' && <PriceOverview />}

          {activeTab === 'instagram' && <InstagramPanel />}

          {activeTab === 'system' && (
            <div className="space-y-12">
              <LogViewer />
              <div className="border-t border-gray-200 pt-8">
                <AdminAccessPanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        {/* Scrollbare Leiste statt gequetschter Spalten — min. 64px Touchziel pro Tab */}
        <div className="flex h-14 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-mobile-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 shrink-0 w-16 transition-colors ${
                  isActive ? 'text-green-600' : 'text-gray-400 active:text-gray-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[9px] font-medium leading-tight">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AdminPage() {
  // Eigener Login (Passwort) — ohne gültige Session nur die Anmeldemaske.
  // Die eigentliche Prüfung macht der Server (src/middleware.ts).
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authenticated'>(
    'checking',
  );

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((r) => r.json() as Promise<{ authenticated?: boolean }>)
      .then((data) => setAuthState(data.authenticated ? 'authenticated' : 'anonymous'))
      .catch(() => setAuthState('anonymous'));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      /* Cookie ist serverseitig ohnehin nur mit Session gültig */
    }
    setAuthState('anonymous');
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (authState === 'anonymous') {
    return <AdminLogin onAuthenticated={() => setAuthState('authenticated')} />;
  }

  return <AdminPageContent onLogout={handleLogout} />;
}
