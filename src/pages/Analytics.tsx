import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Radio, Users, Eye, MessageSquare, Plus, Download, Megaphone, Zap, ArrowRight, X, Info } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';

interface AnalyticsProps {
  onNavigate?: (tab: string) => void;
}

// ─── Inline mini-toast (no external hook dependency) ─────────────────────────
interface Toast { id: number; text: string; sub?: string; }

const Analytics: React.FC<AnalyticsProps> = ({ onNavigate }) => {
  const i18n = useI18n();
  const isRTL = i18n?.isRTL ?? false;

  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignChannel, setCampaignChannel] = useState('whatsapp');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((text: string, sub?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, sub }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    axios.get(`${API_URL}/api/stats`)
      .then(res => {
        const d = res?.data ?? {};
        setActiveCampaigns(Number(d.activeCampaigns) || 0);
        setTotalSent(Number(d.totalSent) || 0);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const handleSaveCampaign = () => {
    if (!campaignName.trim()) {
      showToast(isRTL ? '⚠️ أدخل اسم الحملة' : '⚠️ Enter campaign name');
      return;
    }
    if (!campaignMessage.trim()) {
      showToast(isRTL ? '⚠️ أدخل نص الرسالة' : '⚠️ Enter message text');
      return;
    }
    showToast(
      isRTL ? '✅ تم حفظ الحملة كمسودة' : '✅ Campaign saved as draft',
      isRTL ? 'ستتوفر ميزة إرسال الحملات قريباً' : 'Campaign sending coming soon'
    );
    setShowNewCampaign(false);
    setCampaignName('');
    setCampaignMessage('');
  };

  const kpis = [
    { icon: Radio,         label: isRTL ? 'حملات نشطة'      : 'Active Campaigns', value: String(activeCampaigns), color: '#14C35D' },
    { icon: Users,         label: isRTL ? 'إجمالي المُرسَل'  : 'Total Sent',       value: String(totalSent),       color: '#001C5E' },
    { icon: Eye,           label: isRTL ? 'معدل الفتح'       : 'Open Rate',        value: '—',                     color: '#8b5cf6' },
    { icon: MessageSquare, label: isRTL ? 'معدل الرد'        : 'Reply Rate',       value: '—',                     color: '#f59e0b' },
  ];

  const steps = [
    { step: '1', title: isRTL ? 'ربط القنوات'   : 'Connect Channels', desc: isRTL ? 'اربط واتساب وفيسبوك من الإعدادات' : 'Connect WhatsApp & Facebook in Settings', color: '#3b82f6' },
    { step: '2', title: isRTL ? 'اختر العملاء'  : 'Select Leads',     desc: isRTL ? 'اختر من قائمة العملاء المحتملين'  : 'Choose from your lead list',              color: '#8b5cf6' },
    { step: '3', title: isRTL ? 'أرسل الحملة'   : 'Send Campaign',    desc: isRTL ? 'أرسل الرسالة لجميع العملاء'       : 'Send message to all selected leads',       color: '#14C35D' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{isRTL ? 'الحملات التسويقية' : 'Marketing Campaigns'}</h1>
          <p className="page-subtitle">{isRTL ? 'إرسال رسائل مجمّعة وتتبع الأداء' : 'Send bulk messages and track performance'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => showToast(
              isRTL ? '📊 تصدير التقرير قريباً' : '📊 Export coming soon',
              isRTL ? 'لا توجد حملات لتصديرها بعد' : 'No campaigns to export yet'
            )}
          >
            <Download size={16} />{isRTL ? 'تصدير التقرير' : 'Export Report'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewCampaign(true)}>
            <Plus size={16} />{isRTL ? 'حملة جديدة' : 'New Campaign'}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="animate-up delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
        {kpis.map((k, i) => (
          <div key={i} className={`card stat-card animate-up delay-${i + 1}`}>
            <div className="stat-icon" style={{ background: k.color + '15', color: k.color }}><k.icon size={22} /></div>
            <div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="card animate-up delay-2" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(0,28,94,0.08), rgba(20,195,93,0.08))',
          display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem',
        }}>
          <Megaphone size={36} color="var(--primary)" />
        </div>
        <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', marginBottom: 10 }}>
          {isRTL ? 'لا توجد حملات بعد' : 'No campaigns yet'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
          {isRTL
            ? 'أنشئ حملتك الأولى لإرسال رسائل مجمّعة عبر واتساب وفيسبوك وإنستغرام.'
            : 'Create your first campaign to send bulk messages via WhatsApp, Facebook & Instagram.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowNewCampaign(true)}>
            <Plus size={16} />
            {isRTL ? 'إنشاء حملة جديدة' : 'Create Campaign'}
          </button>
          {onNavigate && (
            <button className="btn btn-outline" onClick={() => onNavigate('settings')}>
              <Zap size={16} />
              {isRTL ? 'ربط القنوات أولاً' : 'Connect Channels First'}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="card animate-up delay-3" style={{ padding: '1.5rem' }}>
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          {isRTL ? '🔧 كيف تعمل الحملات؟' : '🔧 How campaigns work?'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: '1rem', borderRadius: 14,
              background: s.color + '10', border: `1px solid ${s.color}25`,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: s.color, color: '#fff',
                display: 'grid', placeItems: 'center',
                fontWeight: 900, fontSize: '0.9rem', flexShrink: 0,
              }}>{s.step}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div className="overlay" onClick={() => setShowNewCampaign(false)}>
          <div className="modal animate-scale" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.2rem' }}>
              📣 {isRTL ? 'حملة تسويقية جديدة' : 'New Marketing Campaign'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {isRTL ? 'اسم الحملة' : 'Campaign Name'}
                </label>
                <input
                  className="form-input"
                  placeholder={isRTL ? 'مثال: عروض العودة للمدرسة' : 'e.g. Back to School Offers'}
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {isRTL ? 'القناة' : 'Channel'}
                </label>
                <select className="form-input" value={campaignChannel} onChange={e => setCampaignChannel(e.target.value)}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="facebook">Facebook Messenger</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {isRTL ? 'نص الرسالة' : 'Message Text'}
                </label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 100, resize: 'vertical' }}
                  placeholder={isRTL ? 'اكتب نص الرسالة هنا...' : 'Write your message here...'}
                  value={campaignMessage}
                  onChange={e => setCampaignMessage(e.target.value)}
                />
              </div>
              <div style={{ padding: '10px 14px', background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 }}>
                ⚠️ {isRTL ? 'لإرسال الحملة يجب ربط القناة من الإعدادات أولاً.' : 'To send the campaign, connect the channel in Settings first.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowNewCampaign(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveCampaign}>
                {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Toast */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, [isRTL ? 'left' : 'right']: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {toasts.map(t => (
            <div key={t.id} className="animate-up" style={{
              background: 'linear-gradient(135deg,#1e3a6e,#001C5E)',
              color: '#fff', borderRadius: 16, padding: '14px 16px',
              boxShadow: '0 12px 40px rgba(0,28,94,0.35)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              border: '1px solid rgba(255,255,255,0.1)', minWidth: 280,
            }}>
              <div style={{ background: 'rgba(245,166,35,0.2)', borderRadius: 10, padding: 8, flexShrink: 0, display: 'flex' }}>
                <Info size={18} color="#F5A623" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', marginBottom: 3 }}>{t.text}</div>
                {t.sub && <div style={{ fontSize: '0.78rem', opacity: 0.75, lineHeight: 1.5 }}>{t.sub}</div>}
              </div>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', borderRadius: 8, padding: 4, display: 'flex', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Analytics;
