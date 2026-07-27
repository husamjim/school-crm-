import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useI18n } from '../services/i18n';
import { io } from 'socket.io-client';
import { API_URL } from '../config';
import {
  MessageSquare, X,
  LayoutDashboard, Users, Calendar, BarChart3
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

// Bottom nav items (most-used 5)
const BOTTOM_NAV = [
  { id: 'dashboard', icon: LayoutDashboard, labelAr: 'الرئيسية', labelEn: 'Home' },
  { id: 'inbox',     icon: MessageSquare,   labelAr: 'الرسائل',  labelEn: 'Inbox' },
  { id: 'crm',       icon: Users,           labelAr: 'العملاء',  labelEn: 'CRM' },
  { id: 'booking',   icon: Calendar,        labelAr: 'المواعيد', labelEn: 'Visits' },
  { id: 'analytics', icon: BarChart3,       labelAr: 'التحليل',  labelEn: 'Stats' },
];

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout }) => {
  const { isRTL } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [latestMsg, setLatestMsg] = useState<any>(null);

  React.useEffect(() => {
    const socket = io(API_URL);
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.on('new_message', (data: any) => {
      if (!data) return;
      const isIncoming = data.receiver_id !== 'agent' && data.receiver_id !== 'system' && data.sender_psid !== 'system' && data.from !== 'ai' && data.from !== 'agent';
      if (isIncoming) {
        // Sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.play().catch(() => {});

        // State update for Bell icon & Toast
        setNotifications(prev => [data, ...prev]);
        setLatestMsg(data);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);

        // Browser Notification
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(isRTL ? 'رسالة جديدة' : 'New Message', {
            body: data.text,
          });
        }
      }
    });

    return () => { socket.disconnect(); };
  }, [isRTL]);

  // Clear notifications when entering Inbox
  React.useEffect(() => {
    if (activeTab === 'inbox') {
      setNotifications([]);
    }
  }, [activeTab]);

  return (
    <div className="layout-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={onLogout}
        notifCount={notifications.length}
      />
      <div className="main-shell">
        <Topbar 
          toggleSidebar={() => setSidebarOpen(prev => !prev)} 
          notifCount={notifications.length}
          onBellClick={() => setActiveTab('inbox')}
        />
        <div className="page-content">
          {children}
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="mobile-bottom-nav">
        {BOTTOM_NAV.map(item => {
          const isActive = activeTab === item.id;
          const isInbox = item.id === 'inbox';
          return (
            <button
              key={item.id}
              className={`mobile-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {isInbox && notifications.length > 0 && (
                <span className="mobile-nav-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
              )}
              <span className="mobile-nav-icon">
                <item.icon size={20} />
              </span>
              <span>{isRTL ? item.labelAr : item.labelEn}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Notification Toast */}
      {showToast && latestMsg && (
        <div className="animate-up" style={{
          position: 'fixed', bottom: 80, [isRTL ? 'left' : 'right']: 24,
          background: 'var(--primary)', color: '#fff',
          padding: '12px 20px', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 14,
          zIndex: 9999, minWidth: 280,
          cursor: 'pointer'
        }} onClick={() => { setActiveTab('inbox'); setShowToast(false); }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 8 }}>
            <MessageSquare size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 2 }}>
              {isRTL ? 'رسالة جديدة' : 'New Message'}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
              {latestMsg.text}
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); setShowToast(false); }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;
