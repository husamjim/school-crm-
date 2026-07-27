import React from 'react';
import { Bell, Search, Command, Menu } from 'lucide-react';
import { useI18n } from '../services/i18n';

interface TopbarProps {
  toggleSidebar: () => void;
  notifCount?: number;
  onBellClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleSidebar, notifCount = 0, onBellClick }) => {
  const { t, language, setLanguage, isRTL } = useI18n();
  const user = JSON.parse(localStorage.getItem('gmis_user') || '{"name":"User","role":"Admin"}');
  const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="topbar-shell">
      {/* Search and Mobile Toggle */}
      <div style={{ flex: 1, maxWidth: 480, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="mobile-menu-btn" onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 4 }}>
          <Menu size={22} />
        </button>
        <div className="topbar-search-container" style={{ position: 'relative', flex: 1 }}>
          <Search
            size={17}
            style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              [isRTL ? 'right' : 'left']: 14,
              color: 'var(--text-light)'
            }}
          />
          <input
            type="text"
            placeholder={t('search')}
            className="form-input"
            style={{
              [isRTL ? 'paddingRight' : 'paddingLeft']: 44,
              [isRTL ? 'paddingLeft' : 'paddingRight']: 44,
              fontSize: '0.875rem',
            }}
          />
          <div className="Command-badge" style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            [isRTL ? 'left' : 'right']: 10,
            display: 'flex', alignItems: 'center', gap: 3,
            background: '#f1f5f9', border: '1px solid var(--border)',
            borderRadius: 6, padding: '2px 7px'
          }}>
            <Command size={11} color="var(--text-light)" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-light)' }}>K</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginInlineStart: 'auto' }}>
        {/* Lang toggle */}
        <div className="tab-group lang-toggle" style={{ padding: 4 }}>
          <button
            className={`tab-btn${language === 'ar' ? ' active' : ''}`}
            onClick={() => setLanguage('ar')}
          >
            العربية
          </button>
          <button
            className={`tab-btn${language === 'en' ? ' active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
        </div>

        {/* Notifications */}
        <button 
          className="btn btn-ghost btn-sm" 
          style={{ position: 'relative', padding: '8px' }}
          onClick={onBellClick}
        >
          <Bell size={20} />
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 16, height: 16, padding: '0 4px',
              background: '#ef4444', color: '#fff',
              borderRadius: '50%', border: '2px solid #fff',
              fontSize: '0.6rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {notifCount}
            </span>
          )}
        </button>

        <div className="divider-vert" style={{ width: 1, height: 36, background: 'var(--border)' }} />

        {/* Profile */}
        <div className="profile-section" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div className="profile-text" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>{user.name}</div>
            <div style={{ fontWeight: 700, fontSize: '0.65rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {user.role}
            </div>
          </div>
          <div className="avatar" style={{ width: 42, height: 42, fontSize: '1rem', position: 'relative' }}>
            {initials}
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 11, height: 11,
              background: '#22c55e', borderRadius: '50%',
              border: '2px solid #fff'
            }} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
