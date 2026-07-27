import { useState, useEffect, Component, type ReactNode } from 'react'
import { I18nProvider, useI18n } from './services/i18n'
import Layout from './components/Layout'
import { API_URL } from './config'
import Dashboard    from './pages/Dashboard'
import Inbox        from './pages/Inbox'
import CRM          from './pages/CRM'
import Booking      from './pages/Booking'
import Registration from './pages/Registration'
import Analytics    from './pages/Analytics'
import RealAnalytics from './pages/RealAnalytics'
import KnowledgeBase from './pages/KnowledgeBase'
import Settings     from './pages/Settings'
import UsersManagement from './pages/UsersManagement'
import Login        from './pages/Login'
import AutoReplies  from './pages/AutoReplies'
import SocialAnalytics from './pages/SocialAnalytics'
import PublicBooking from './pages/PublicBooking'

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode; key?: string }, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err?.message || String(err) };
  }
  componentDidCatch(err: any, info: any) {
    console.error('[ErrorBoundary]', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#001C5E', fontWeight: 800, marginBottom: '0.5rem' }}>حدث خطأ في هذه الصفحة</h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Page Error</p>
          <pre style={{ background: '#f8fafc', padding: '1rem', borderRadius: 12, fontSize: '0.75rem', color: '#ef4444', textAlign: 'left', overflowX: 'auto', maxWidth: 600, margin: '0 auto 1.5rem' }}>{this.state.error}</pre>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{ padding: '10px 24px', background: '#001C5E', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            إعادة المحاولة / Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('gmis_token');
    const userStr = localStorage.getItem('gmis_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      setIsAuthenticated(true);
      if (user.needs_password_change) {
        setMustChangePassword(true);
      }
    }
    setIsInitializing(false);
  }, []);

  const handleLogin = () => {
    const userStr = localStorage.getItem('gmis_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.needs_password_change) {
        setMustChangePassword(true);
      }
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('gmis_token');
    localStorage.removeItem('gmis_user');
  };

  if (isInitializing) return null;

  const isApplyPage = window.location.pathname === '/apply' || window.location.search.includes('apply=true');
  const isBookPage = window.location.pathname === '/book' || window.location.search.includes('book=true');

  if (isApplyPage) {
    return (
      <ErrorBoundary>
        <I18nProvider>
          <div style={{ padding: '2rem 1rem', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: 16, fontWeight: 900, fontSize: '1.2rem', boxShadow: 'var(--shadow-md)' }}>
                🏫 GMIS Admission Portal | بوابة القبول لمدارس جي إم آي إس
              </div>
            </div>
            <Registration />
          </div>
        </I18nProvider>
      </ErrorBoundary>
    );
  }

  if (isBookPage) {
    return (
      <ErrorBoundary>
        <I18nProvider>
          <div style={{ padding: '2rem 1rem', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: 16, fontWeight: 900, fontSize: '1.2rem', boxShadow: 'var(--shadow-md)' }}>
                🏫 GMIS School Visit Booking | حجز زيارة مدارس جي إم آي إس
              </div>
            </div>
            <PublicBooking />
          </div>
        </I18nProvider>
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <I18nProvider>
          <Login onLogin={handleLogin} />
        </I18nProvider>
      </ErrorBoundary>
    );
  }

  const handleNavigate = (tab: string, leadId?: string) => {
    setActiveTab(tab);
    if (leadId) {
      // Store the target lead ID so CRM can highlight/scroll to it
      sessionStorage.setItem('crm_target_lead', leadId);
    } else {
      sessionStorage.removeItem('crm_target_lead');
    }
  };

  const renderContent = () => {
    let page;
    switch (activeTab) {
      case 'dashboard':    page = <Dashboard onNavigate={handleNavigate} />; break;
      case 'inbox':        page = <Inbox onNavigate={handleNavigate} />; break;
      case 'crm':          page = <CRM onNavigate={handleNavigate} />; break;
      case 'booking':      page = <Booking />; break;
      case 'registration': page = <Registration />; break;
      case 'broadcast':    page = <Analytics onNavigate={handleNavigate} />; break;
      case 'analytics':    page = <RealAnalytics />; break;
      case 'social_analytics': page = <SocialAnalytics />; break;
      case 'users':        page = <UsersManagement />; break;
      case 'kb':           page = <KnowledgeBase />; break;
      case 'autoreply':    page = <AutoReplies />; break;
      case 'settings':     page = <Settings />; break;
      default:             page = <Dashboard onNavigate={handleNavigate} />;
    }
    return <ErrorBoundary key={activeTab}>{page}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        {mustChangePassword && <ChangePasswordOverlay onComplete={() => setMustChangePassword(false)} />}
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
          {renderContent()}
        </Layout>
      </I18nProvider>
    </ErrorBoundary>
  )
}

const ChangePasswordOverlay = ({ onComplete }: { onComplete: () => void }) => {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isRTL } = useI18n();

  const handleSave = async () => {
    if (pw.length < 6) return setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 chars');
    if (pw !== confirm) return setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
    
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('gmis_user') || '{}');
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword: pw })
      });
      if (res.ok) {
        user.needs_password_change = 0;
        localStorage.setItem('gmis_user', JSON.stringify(user));
        onComplete();
      }
    } catch(err) { setError('Error saving password'); }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'grid', placeItems: 'center', padding: 20
    }}>
      <div className="card animate-scale" style={{ width: '100%', maxWidth: 400, padding: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: 800, marginBottom: 12 }}>
          {isRTL ? 'تغيير كلمة المرور إجباري' : 'Password Change Required'}
        </h2>
        <p style={{ color: 'var(--text-sec)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {isRTL ? 'لأمان حسابك، يجب تعيين كلمة مرور خاصة بك عند أول دخول' : 'For security, you must set your own password on first login'}
        </p>
        
        {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 10, marginBottom: 20, fontSize: '0.8rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="form-input" type="password" placeholder={isRTL ? 'كلمة المرور الجديدة' : 'New Password'} value={pw} onChange={e => setPw(e.target.value)} />
          <input className="form-input" type="password" placeholder={isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} value={confirm} onChange={e => setConfirm(e.target.value)} />
          <button className="btn btn-primary" style={{ marginTop: 10, justifyContent: 'center' }} onClick={handleSave} disabled={loading}>
            {loading ? '...' : (isRTL ? 'حفظ المتابعة' : 'Save & Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App
