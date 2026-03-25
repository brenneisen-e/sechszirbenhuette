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
} from 'lucide-react';
import DemoModeToggle from '@/components/admin/DemoModeToggle';

// Lazy load heavy components with ssr:false (admin is client-only)
const GuestDatabase = dynamic(() => import('@/components/admin/GuestDatabase'), { ssr: false });
const FinanceOverview = dynamic(() => import('@/components/admin/FinanceOverview'), { ssr: false });
const UtilityCostsCalculator = dynamic(() => import('@/components/admin/UtilityCostsCalculator'), { ssr: false });
const ImageManager = dynamic(() => import('@/components/admin').then((mod) => ({ default: mod.ImageManager })), { ssr: false });
const PasswordsPanel = dynamic(() => import('@/components/admin').then((mod) => ({ default: mod.PasswordsPanel })), { ssr: false });
const BlogEditor = dynamic(() => import('@/components/admin/BlogEditor'), { ssr: false });
const ReviewsManager = dynamic(() => import('@/components/admin/ReviewsManager'), { ssr: false });
const GuestAppEditor = dynamic(() => import('@/components/admin/GuestAppEditor'), { ssr: false });


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

type AdminTab = 'guests' | 'finances' | 'utilities' | 'images' | 'passwords' | 'blog' | 'reviews' | 'guestapp';

const TABS: { id: AdminTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'guests', label: 'Gäste', shortLabel: 'Gäste', icon: Users },
  { id: 'finances', label: 'Finanzen', shortLabel: 'Finanzen', icon: Euro },
  { id: 'utilities', label: 'Nebenkosten', shortLabel: 'NK', icon: Calculator },
  { id: 'images', label: 'Bilder', shortLabel: 'Bilder', icon: ImageIcon },
  { id: 'passwords', label: 'Zugang', shortLabel: 'Zugang', icon: Key },
  { id: 'blog', label: 'Blog', shortLabel: 'Blog', icon: FileText },
  { id: 'reviews', label: 'Bewertungen', shortLabel: 'Reviews', icon: Star },
  { id: 'guestapp', label: 'Gäste-App', shortLabel: 'App', icon: Smartphone },
];

function getInitialTab(): AdminTab {
  if (typeof window === 'undefined') return 'guests';
  const params = new URLSearchParams(window.location.search);
  return (params.get('tab') as AdminTab) || 'guests';
}

function AdminPageContent() {
  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialTab);
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
    } catch { /* ignore */ }
  }, []);

  // Sync browser back/forward with tab state
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTabState((params.get('tab') as AdminTab) || 'guests');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const toggleDemoMode = () => {
    const newValue = !isDemoMode;
    setIsDemoMode(newValue);
    try {
      localStorage.setItem('sechszirben_demo_mode', String(newValue));
    } catch { /* ignore */ }
  };

  // Switch tabs using local state + pushState — bypasses Next.js router entirely
  // to avoid Suspense/fiber reconciliation conflicts that cause DOM errors
  const setActiveTab = useCallback((tab: AdminTab) => {
    if (tab === 'finances') {
      setFinanceRefreshKey(prev => prev + 1);
    }
    setActiveTabState(tab);
    window.history.pushState(null, '', `/admin?tab=${tab}`);
  }, []);

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
    <div className="min-h-screen bg-white admin-panel" style={{ fontFamily: "'Aptos', 'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-center py-1.5 text-xs font-medium z-50 relative">
          Demo-Modus aktiv — Gästedaten verfremdet, Finanzdaten gerundet
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40" style={isDemoMode ? { top: '32px' } : {}}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <a href="/" className="p-1 text-gray-400 hover:text-gray-600">
              <Home className="w-5 h-5" />
            </a>
          </div>
          <h1 className="text-sm font-medium text-gray-900">
            {TABS.find(t => t.id === activeTab)?.label}
          </h1>
          <DemoModeToggle isDemoMode={isDemoMode} onToggle={toggleDemoMode} />
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
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Sechszirbenhütte</h1>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Admin</span>
            </div>
            <div className="flex items-center gap-3">
              <DemoModeToggle isDemoMode={isDemoMode} onToggle={toggleDemoMode} />
              <a
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-logo-green transition rounded-lg hover:bg-gray-100"
              >
                <Home className="w-4 h-4" />
                <span>Zur Homepage</span>
              </a>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto -mb-px">
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

          {activeTab === 'passwords' && <PasswordsPanel />}

          {activeTab === 'images' && <ImageManager />}

          {activeTab === 'blog' && <BlogEditor />}

            {activeTab === 'reviews' && <ReviewsManager />}

            {activeTab === 'guestapp' && <GuestAppEditor />}
          </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="grid grid-cols-7 h-14">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive
                    ? 'text-green-600'
                    : 'text-gray-400 active:text-gray-600'
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
  return <AdminPageContent />;
}
