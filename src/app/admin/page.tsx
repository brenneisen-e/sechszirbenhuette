'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Image as ImageIcon,
  Users,
  Euro,
  TrendingDown,
  Type,
  Loader2,
  Home,
  Calendar,
  Lock,
  LogOut,
  AlertCircle,
} from 'lucide-react';

// Lazy load heavy components
const GuestDatabase = dynamic(() => import('@/components/admin/GuestDatabase'), {
  loading: () => <LoadingSpinner text="Lade Gästedatenbank..." />,
});

const FinanceOverview = dynamic(() => import('@/components/admin/FinanceOverview'), {
  loading: () => <LoadingSpinner text="Lade Finanzen..." />,
});

const ExpensePanel = dynamic(() => import('@/components/admin/ExpensePanel'), {
  loading: () => <LoadingSpinner text="Lade Ausgaben..." />,
});

// Image Manager Component (using existing media API)
const MediaManager = dynamic(() => import('@/components/admin/MediaManager'), {
  loading: () => <LoadingSpinner text="Lade Bilderverwaltung..." />,
});

// Text Editor Component
const TextEditor = dynamic(() => import('@/components/admin/TextEditor'), {
  loading: () => <LoadingSpinner text="Lade Texteditor..." />,
});

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-logo-green" />
      <span className="ml-3 text-gray-600">{text}</span>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-logo-green/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-logo-green rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Admin-Panel</h2>
          <p className="text-gray-500">Daten werden geladen...</p>
        </div>
      </div>
    </div>
  );
}

type AdminTab = 'guests' | 'calendar' | 'images' | 'finances' | 'expenses' | 'texts';

const TABS: { id: AdminTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'guests', label: 'Gästedatenbank', shortLabel: 'Gäste', icon: Users },
  { id: 'calendar', label: 'Kalender', shortLabel: 'Kalender', icon: Calendar },
  { id: 'images', label: 'Bilderverwaltung', shortLabel: 'Bilder', icon: ImageIcon },
  { id: 'finances', label: 'Finanzen', shortLabel: 'Finanzen', icon: Euro },
  { id: 'expenses', label: 'Ausgaben', shortLabel: 'Ausgaben', icon: TrendingDown },
  { id: 'texts', label: 'Texte', shortLabel: 'Texte', icon: Type },
];

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get active tab from URL, default to 'guests'
  const activeTab = (searchParams.get('tab') || 'guests') as AdminTab;

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);

  const currentTab = TABS.find(t => t.id === activeTab);

  // Tab change handler
  const setActiveTab = (tab: AdminTab) => {
    if (tab === 'finances') {
      setFinanceRefreshKey(prev => prev + 1);
    }
    router.push(`/admin?tab=${tab}`);
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/login');
      const data = await response.json() as { authenticated: boolean };
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        setIsInitialLoading(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });

      const data = await response.json() as { error?: string };

      if (response.ok) {
        setIsAuthenticated(true);
        setLoginPassword('');
        setIsInitialLoading(false);
      } else {
        setLoginError(data.error || 'Login fehlgeschlagen');
      }
    } catch {
      setLoginError('Verbindungsfehler');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' });
    } catch {
      // Ignore errors
    }
    setIsAuthenticated(false);
  };

  // Handle initial data loaded callback
  const handleDataLoaded = () => {
    setIsInitialLoading(false);
  };

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
          <Loader2 className="w-6 h-6 animate-spin text-logo-green" />
          <span className="text-slate-700">Prüfe Authentifizierung...</span>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-logo-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-logo-green" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Admin-Center</h1>
            <p className="text-slate-500 mt-2">Sechszirbenhütte</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                placeholder="Admin-Passwort eingeben"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !loginPassword}
              className="w-full bg-logo-green text-white py-3 px-4 rounded-lg font-medium hover:bg-logo-green/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Anmelden...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show full screen loader while initial data is loading
  if (isInitialLoading && activeTab === 'guests') {
    return (
      <>
        <FullScreenLoader />
        {/* Hidden GuestDatabase to trigger data loading */}
        <div className="hidden">
          <GuestDatabase adminPassword="" onDataLoaded={handleDataLoaded} />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Compact */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/" className="p-2 -ml-2 text-gray-500 hover:text-logo-green">
            <Home className="w-5 h-5" />
          </a>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">{currentTab?.shortLabel}</h1>
          </div>
          <button onClick={handleLogout} className="p-2 -mr-2 text-gray-500 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block py-8">
        <div className="mx-auto px-4 lg:px-8 max-w-[1800px]">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Sechszirbenhütte</h1>
                <p className="text-gray-600">Admin-Panel</p>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-logo-green transition"
                >
                  <Home className="w-5 h-5" />
                  <span>Website</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Abmelden</span>
                </button>
              </div>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-logo-green border-logo-green'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-14 pb-20 md:pt-0 md:pb-8">
        <div className="mx-auto px-2 md:px-4 lg:px-8 max-w-[1800px]">
          {(activeTab === 'guests' || activeTab === 'calendar') && <GuestDatabase adminPassword="" />}

          {activeTab === 'finances' && (
            <FinanceOverview
              key={financeRefreshKey}
              adminPassword=""
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

          {activeTab === 'expenses' && <ExpensePanel adminPassword="" />}

          {activeTab === 'images' && <MediaManager />}

          {activeTab === 'texts' && <TextEditor />}
        </div>
      </div>

      {/* Mobile Bottom Navigation - App Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="grid grid-cols-6 h-16">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive
                    ? 'text-logo-green'
                    : 'text-gray-400 active:text-gray-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium leading-tight">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminPageContent />
    </Suspense>
  );
}
