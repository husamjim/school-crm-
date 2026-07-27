import React from 'react';
import {
  LayoutDashboard, MessageSquare, Users, BookOpen,
  Settings, Calendar, UserPlus, BarChart3, LogOut, Zap, Radio, X, Share2
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import { SchoolLogo } from './SchoolLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  notifCount?: number;
}

const menuItems = [
  { id: 'dashboard',    icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'inbox',        icon: MessageSquare,   labelKey: 'inbox' },
  { id: 'crm',          icon: Users,           labelKey: 'crm' },
  { id: 'booking',      icon: Calendar,        labelKey: 'bookVisit' },
  { id: 'registration', icon: UserPlus,        labelKey: 'studentRegistration' },
  { id: 'broadcast',    icon: Radio,           labelKey: 'activeCampaigns' },
  { id: 'kb',           icon: BookOpen,        labelKey: 'knowledgeBase' },
  { id: 'autoreply',    icon: Zap,             labelKey: 'autoReply' },
  { id: 'analytics',    icon: BarChart3,       labelKey: 'analytics' },
  { id: 'social_analytics', icon: Share2,      labelKey: 'socialAnalytics' },
  { id: 'users',        icon: Users,           labelKey: 'users' },
  { id: 'settings',     icon: Settings,        labelKey: 'settings' },
] as const;

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, onLogout, notifCount = 0 }) => {
  const { t } = useI18n();
  const user = JSON.parse(localStorage.getItem('gmis_user') || '{}');
  const perms = user.permissions ? user.permissions.split(',') : [];
  const isAdmin = user.role === 'admin';

  const isAllowed = (id: string) => {
    if (isAdmin) return true;
    if (id === 'dashboard') return true;
    if (id === 'crm' || id === 'registration') return perms.includes('leads');
    if (id === 'inbox') return perms.includes('inbox');
    if (id === 'booking') return perms.includes('visits');
    if (id === 'broadcast' || id === 'analytics' || id === 'social_analytics') return perms.includes('analytics');
    if (id === 'users') return perms.includes('users');
    if (id === 'settings' || id === 'kb' || id === 'autoreply') return perms.includes('settings');
    return false;
  };

  return (
    <aside className={`sidebar-shell${isOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SchoolLogo size={42} />
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>
              GMIS <span style={{ color: '#14C35D' }}>CRM</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              Smart Enrollment
            </div>
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={() => setIsOpen(false)}>
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
        {menuItems.filter(item => isAllowed(item.id)).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item${isActive ? ' active' : ''}`}
              style={{ width: '100%', textAlign: 'inherit', cursor: 'pointer', border: 'none', background: 'none' }}
            >
              {isActive && <span className="nav-indicator" />}
              <span className="nav-icon-box">
                <item.icon size={18} />
              </span>
              <span style={{ flex: 1 }}>{t(item.labelKey as any)}</span>
              {item.id === 'inbox' && notifCount > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff',
                  borderRadius: 99, minWidth: 18, height: 18,
                  fontSize: '0.65rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)'
                }}>
                  {notifCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* AI Health */}
        <div style={{
          background: 'rgba(20,195,93,0.1)',
          border: '1px solid rgba(20,195,93,0.15)',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Zap size={13} color="#14C35D" />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              AI Agent
            </span>
            <span style={{ marginInlineStart: 'auto', fontSize: '0.65rem', fontWeight: 800, color: '#14C35D' }}>LIVE</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '96%' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 6, fontWeight: 600 }}>
            Response rate: 99.2%
          </div>
        </div>

        {/* Logout */}
        <button 
          className="nav-item btn-ghost" 
          style={{ width: '100%', color: '#f87171', gap: 10, border: 'none', background: 'none' }}
          onClick={onLogout}
        >
          <LogOut size={17} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {t('language') === 'اللغة' ? 'تسجيل الخروج' : 'Logout'}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
