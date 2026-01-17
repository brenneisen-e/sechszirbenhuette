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
  Database,
  CheckCircle,
} from 'lucide-react';

// Lazy load heavy components with error handling
const GuestDatabase = dynamic(
  () => import('@/components/admin/GuestDatabase').catch(err => {
    console.error('Failed to load GuestDatabase:', err);
    return { default: () => <div className="p-4 text-red-600">Fehler beim Laden der Gästedatenbank</div> };
  }),
  { loading: () => <LoadingSpinner text="Lade Gästedatenbank..." />, ssr: false }
);

const FinanceOverview = dynamic(
  () => import('@/components/admin/FinanceOverview').catch(err => {
    console.error('Failed to load FinanceOverview:', err);
    return { default: () => <div className="p-4 text-red-600">Fehler beim Laden der Finanzen</div> };
  }),
  { loading: () => <LoadingSpinner text="Lade Finanzen..." />, ssr: false }
);

const ExpensePanel = dynamic(
  () => import('@/components/admin/ExpensePanel').catch(err => {
    console.error('Failed to load ExpensePanel:', err);
    return { default: () => <div className="p-4 text-red-600">Fehler beim Laden der Ausgaben</div> };
  }),
  { loading: () => <LoadingSpinner text="Lade Ausgaben..." />, ssr: false }
);

// Image Manager Component (using existing media API)
const MediaManager = dynamic(
  () => import('@/components/admin/MediaManager').catch(err => {
    console.error('Failed to load MediaManager:', err);
    return { default: () => <div className="p-4 text-red-600">Fehler beim Laden der Bilderverwaltung</div> };
  }),
  { loading: () => <LoadingSpinner text="Lade Bilderverwaltung..." />, ssr: false }
);

// Text Editor Component
const TextEditor = dynamic(
  () => import('@/components/admin/TextEditor').catch(err => {
    console.error('Failed to load TextEditor:', err);
    return { default: () => <div className="p-4 text-red-600">Fehler beim Laden des Texteditors</div> };
  }),
  { loading: () => <LoadingSpinner text="Lade Texteditor..." />, ssr: false }
);

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
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentTab = TABS.find(t => t.id === activeTab);

  // Run database migration
  const runMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const response = await fetch('/api/admin/migrate', { method: 'POST' });
      const data = await response.json() as { success?: boolean; message?: string; error?: string };
      if (response.ok) {
        setMigrationResult({ success: true, message: data.message || 'Migration erfolgreich!' });
      } else {
        setMigrationResult({ success: false, message: data.error || 'Migration fehlgeschlagen' });
      }
    } catch {
      setMigrationResult({ success: false, message: 'Verbindungsfehler' });
    } finally {
      setIsMigrating(false);
      // Clear result after 5 seconds
      setTimeout(() => setMigrationResult(null), 5000);
    }
  };

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
          <div className="flex items-center gap-1">
            <a href="/" className="p-2 -ml-2 text-gray-500 hover:text-logo-green">
              <Home className="w-5 h-5" />
            </a>
            <button
              onClick={runMigration}
              disabled={isMigrating}
              className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
              title="Migration"
            >
              {isMigrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">{currentTab?.shortLabel}</h1>
            {migrationResult && (
              <span className={`text-xs ${migrationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {migrationResult.success ? 'Migration OK' : 'Fehler'}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="p-2 -mr-2 text-gray-500 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Header - Logo only */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-40">
        <div className="mx-auto px-4 lg:px-8 max-w-[1800px]">
          <div className="flex items-center justify-between py-3">
            {/* Left side - empty for balance */}
            <div className="w-32"></div>

            {/* Center - Logo */}
            <a href="/" className="transition-transform hover:scale-105">
              <img
                src="/images/logo.svg"
                alt="Sechszirbenhütte"
                className="h-14 w-auto"
              />
            </a>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 justify-end">
              {migrationResult && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg ${
                  migrationResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {migrationResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{migrationResult.message}</span>
                </div>
              )}
              <button
                onClick={runMigration}
                disabled={isMigrating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition rounded-lg hover:bg-gray-100 disabled:opacity-50"
                title="Datenbank-Migration ausführen"
              >
                {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>Migration</span>
              </button>
              <a
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-logo-green transition rounded-lg hover:bg-gray-100"
              >
                <Home className="w-4 h-4" />
                <span>Website</span>
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 transition rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <div className="flex gap-1 border-t border-gray-100 overflow-x-auto py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors rounded-lg whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-logo-green bg-logo-green/10'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
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

      {/* Content Area */}
      <div className="pt-14 pb-20 md:pt-28 md:pb-8">
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
