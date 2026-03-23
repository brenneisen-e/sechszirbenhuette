'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Image as ImageIcon,
  Users,
  Euro,
  Wallet,
  Calculator,
  Key,
  Loader2,
  Home,
  Lock,
  LogOut,
  AlertCircle,
  Database,
  CheckCircle,
  FileText,
  Settings,
} from 'lucide-react';
import DemoModeToggle from '@/components/admin/DemoModeToggle';

// Loading component
function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      <span className="ml-3 text-sm text-gray-500">{text}</span>
    </div>
  );
}

// Lazy load heavy components
const GuestDatabase = dynamic(() => import('@/components/admin/GuestDatabase'), {
  loading: () => <LoadingSpinner text="Lade Gästedatenbank..." />,
});

const FinanceOverview = dynamic(() => import('@/components/admin/FinanceOverview'), {
  loading: () => <LoadingSpinner text="Lade Finanzen..." />,
});

const BankTransactions = dynamic(() => import('@/components/admin/BankTransactions'), {
  loading: () => <LoadingSpinner text="Lade Kontoauszug..." />,
});

const UtilityCostsCalculator = dynamic(() => import('@/components/admin/UtilityCostsCalculator'), {
  loading: () => <LoadingSpinner text="Lade Nebenkosten..." />,
});

const ImageManager = dynamic(() => import('@/components/admin').then((mod) => ({ default: mod.ImageManager })), {
  loading: () => <LoadingSpinner text="Lade Bilderverwaltung..." />,
});

const PasswordsPanel = dynamic(() => import('@/components/admin').then((mod) => ({ default: mod.PasswordsPanel })), {
  loading: () => <LoadingSpinner text="Lade Passwörter..." />,
});

const MigrationPanel = dynamic(() => import('@/components/admin/MigrationPanel'), {
  loading: () => <LoadingSpinner text="Lade System..." />,
});

const ImageMigrationPanel = dynamic(() => import('@/components/admin/ImageMigrationPanel'), {
  loading: () => <LoadingSpinner text="Lade Migration..." />,
});

const BriefingGenerator = dynamic(() => import('@/components/admin/BriefingGenerator'), {
  loading: () => <LoadingSpinner text="Lade Briefing..." />,
});

const KurtaxeRatesEditor = dynamic(() => import('@/components/admin/KurtaxeRatesEditor'), {
  loading: () => <LoadingSpinner text="Lade Kurtaxe-Sätze..." />,
});

const PositionCategoriesEditor = dynamic(() => import('@/components/admin/PositionCategoriesEditor'), {
  loading: () => <LoadingSpinner text="Lade Kategorien..." />,
});

const PositionTemplatesEditor = dynamic(() => import('@/components/admin/PositionTemplatesEditor'), {
  loading: () => <LoadingSpinner text="Lade Vorlagen..." />,
});

const BlogEditor = dynamic(() => import('@/components/admin/BlogEditor'), {
  loading: () => <LoadingSpinner text="Lade Blog-Verwaltung..." />,
});

const CloudflareSettings = dynamic(() => import('@/components/admin/CloudflareSettings'), {
  loading: () => <LoadingSpinner text="Lade Einstellungen..." />,
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

type AdminTab = 'guests' | 'finances' | 'bank' | 'utilities' | 'briefing' | 'images' | 'passwords' | 'blog' | 'system';

const TABS: { id: AdminTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'guests', label: 'Gäste', shortLabel: 'Gäste', icon: Users },
  { id: 'finances', label: 'Finanzen', shortLabel: 'Finanzen', icon: Euro },
  { id: 'bank', label: 'Kontoauszug', shortLabel: 'Konto', icon: Wallet },
  { id: 'utilities', label: 'Nebenkosten', shortLabel: 'NK', icon: Calculator },
  { id: 'briefing', label: 'Briefing', shortLabel: 'Brief.', icon: FileText },
  { id: 'images', label: 'Bilder', shortLabel: 'Bilder', icon: ImageIcon },
  { id: 'passwords', label: 'Zugang', shortLabel: 'Zugang', icon: Key },
  { id: 'blog', label: 'Blog', shortLabel: 'Blog', icon: FileText },
  { id: 'system', label: 'System', shortLabel: 'System', icon: Settings },
];

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get('tab') || 'guests') as AdminTab;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load demo mode state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sechszirben_demo_mode');
      if (saved === 'true') setIsDemoMode(true);
    } catch { /* ignore */ }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/login', { cache: 'no-store' });
      const data = await response.json() as { authenticated: boolean };
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        // Restore password from sessionStorage after page refresh
        const savedPw = sessionStorage.getItem('_admin_pw');
        if (savedPw) setAdminPassword(savedPw);
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
        setAdminPassword(loginPassword);
        sessionStorage.setItem('_admin_pw', loginPassword);
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
    } catch { /* ignore */ }
    setIsAuthenticated(false);
    setAdminPassword('');
    sessionStorage.removeItem('_admin_pw');
  };

  const toggleDemoMode = () => {
    const newValue = !isDemoMode;
    setIsDemoMode(newValue);
    try {
      localStorage.setItem('sechszirben_demo_mode', String(newValue));
    } catch { /* ignore */ }
  };

  const setActiveTab = (tab: AdminTab) => {
    if (tab === 'finances') {
      setFinanceRefreshKey(prev => prev + 1);
    }
    router.push(`/admin?tab=${tab}`);
  };

  const handleDataLoaded = () => {
    setIsInitialLoading(false);
  };

  // Loading auth check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Center</h1>
            <p className="text-sm text-gray-500 mt-1">Sechszirbenhütte</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="Admin-Passwort"
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {loginError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn || !loginPassword}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Prüfe...' : 'Anmelden'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Full screen loader
  if (isInitialLoading) {
    return (
      <>
        <FullScreenLoader />
        <div className="hidden">
          <GuestDatabase adminPassword={adminPassword} onDataLoaded={handleDataLoaded} />
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
            <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </button>
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
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 transition rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
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
        <div className="mx-auto px-2 md:px-6 lg:px-8 max-w-[1800px] md:py-6">
          {activeTab === 'guests' && <GuestDatabase adminPassword={adminPassword} demoMode={isDemoMode} />}

          {activeTab === 'finances' && (
            <FinanceOverview
              key={financeRefreshKey}
              adminPassword={adminPassword}
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

          {activeTab === 'bank' && <BankTransactions adminPassword={adminPassword} demoMode={isDemoMode} />}

          {activeTab === 'utilities' && <UtilityCostsCalculator adminPassword={adminPassword} demoMode={isDemoMode} />}

          {activeTab === 'passwords' && <PasswordsPanel />}

          {activeTab === 'briefing' && <BriefingGenerator adminPassword={adminPassword} />}

          {activeTab === 'images' && <ImageManager adminPassword={adminPassword} />}

          {activeTab === 'blog' && <BlogEditor />}

          {activeTab === 'system' && (
            <div className="space-y-12">
              <CloudflareSettings adminPassword={adminPassword} />
              <div className="border-t border-gray-200 pt-8">
                <ImageMigrationPanel adminPassword={adminPassword} />
              </div>
              <div className="border-t border-gray-200 pt-8">
                <MigrationPanel adminPassword={adminPassword} />
              </div>
              <div className="border-t border-gray-200 pt-8">
                <KurtaxeRatesEditor adminPassword={adminPassword} />
              </div>
              <div className="border-t border-gray-200 pt-8">
                <PositionCategoriesEditor adminPassword={adminPassword} />
              </div>
              <div className="border-t border-gray-200 pt-8">
                <PositionTemplatesEditor adminPassword={adminPassword} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="grid grid-cols-11 h-14">
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
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminPageContent />
    </Suspense>
  );
}
