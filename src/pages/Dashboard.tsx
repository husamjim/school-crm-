import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, MessageSquare, TrendingUp, Zap, Calendar,
  ArrowUpRight, ArrowDownRight, Flame, Globe, User
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import ClientProfileModal from '../components/ClientProfileModal';
import type { ClientProfile } from '../components/ClientProfileModal';
import { useToast, ToastContainer } from '../hooks/useToast';

interface DashboardProps {
  onNavigate?: (tab: string, leadId?: string) => void;
}

const statusPill: Record<string, string> = {
  'جديد': 'pill pill-new',
  'مهتم': 'pill pill-hot',
  'متابعة': 'pill pill-interest',
  'تم التسجيل': 'pill pill-reg',
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { isRTL } = useI18n();
  const user = JSON.parse(localStorage.getItem('gmis_user') || '{"name":"User"}');
  const [statsData, setStatsData] = useState({ totalLeads: 0, newToday: 0, conversion: '0%', visitsBooked: 0, hotLeads: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [isWeekly, setIsWeekly] = useState(true);
  const [showMyStatsOnly, setShowMyStatsOnly] = useState(user.role === 'agent');
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);

  // Client profile modal
  const [profileClient, setProfileClient] = useState<ClientProfile | null>(null);

  // Toast
  const { toasts, showToast, removeToast } = useToast();

  const fetchStats = (weekly: boolean, myStatsOnly: boolean) => {
    setIsLoadingPeriod(true);
    const currentUser = JSON.parse(localStorage.getItem('gmis_user') || '{}');
    
    let url = `${API_URL}/api/stats?`;
    if (myStatsOnly) {
      url += `userId=${currentUser.id}&role=${currentUser.role}&`;
    }
    url += weekly ? '' : 'period=month';

    axios.get(url).then(res => {
      setStatsData({
        totalLeads: res.data.totalLeads,
        newToday: res.data.newToday,
        conversion: res.data.totalLeads > 0 ? Math.round((res.data.newToday / res.data.totalLeads) * 100) + '%' : '0%',
        visitsBooked: res.data.upcomingVisits || 0,
        hotLeads: res.data.hotLeads || 0
      });
      setRecentLeads(res.data.recentLeads || []);
      setWeekData(res.data.weekData || []);
      setChannelData(res.data.channelData || []);
    }).catch(console.error).finally(() => setIsLoadingPeriod(false));
  };

  useEffect(() => {
    fetchStats(isWeekly, showMyStatsOnly);
  }, [isWeekly, showMyStatsOnly]);

  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Leads', statsData.totalLeads],
      ['New Today', statsData.newToday],
      ['Conversion Rate', statsData.conversion],
      ['Visits Booked', statsData.visitsBooked]
    ];
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gmis_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChartTabClick = (tab: string) => {
    showToast(
      isRTL ? `📊 تصفية "${tab}" قيد التطوير` : `📊 "${tab}" filter coming soon`,
      isRTL ? 'سيتم دعم تصفية الرسم البياني حسب الفترة قريباً' : 'Chart period filtering will be available soon'
    );
  };

  const handleCampaignBtn = () => {
    if (onNavigate) {
      onNavigate('broadcast');
    } else {
      showToast(
        isRTL ? '📣 الحملات قيد التطوير' : '📣 Campaigns coming soon',
        isRTL ? 'ميزة البث الجماعي ستكون متاحة قريباً' : 'Broadcast feature will be available soon'
      );
    }
  };

  const handleViewAll = () => {
    if (onNavigate) {
      onNavigate('crm');
    } else {
      showToast(
        isRTL ? 'انقر للذهاب لصفحة CRM' : 'Navigate to CRM',
        isRTL ? 'استخدم الشريط الجانبي للوصول لإدارة العملاء' : 'Use the sidebar to access CRM'
      );
    }
  };

  const openLeadProfile = (lead: any) => {
    setProfileClient({
      ...lead
    });
  };

  const stats = [
    {
      label:  isRTL ? 'إجمالي العملاء'  : 'Total Leads',
      value:  statsData.totalLeads.toString(),
      icon:   Users,
      color:  '#001C5E',
      bg:     'rgba(0,28,94,0.08)',
      trend:  '0%',
      up:     true,
    },
    {
      label:  isRTL ? 'عملاء جدد اليوم' : 'New Today',
      value:  statsData.newToday.toString(),
      icon:   MessageSquare,
      color:  '#14C35D',
      bg:     'rgba(20,195,93,0.1)',
      trend:  '0%',
      up:     true,
    },
    {
      label:  isRTL ? 'نسبة التحويل'    : 'Conversion',
      value:  statsData.conversion,
      icon:   TrendingUp,
      color:  '#1a4fa8',
      bg:     'rgba(26,79,168,0.08)',
      trend:  '0%',
      up:     true,
    },
    {
      label:  isRTL ? 'زيارات محجوزة'   : 'Visits Booked',
      value:  statsData.visitsBooked.toString(),
      icon:   Calendar,
      color:  '#F5A623',
      bg:     'rgba(245,166,35,0.1)',
      trend:  '+8%',
      up:     true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Page Header ── */}
      <div className="animate-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">
            {isRTL ? `👋 مرحباً، ${user.name}` : `👋 Welcome back, ${user.name.split(' ')[0]}`}
          </h1>
          <p className="page-subtitle">
            {isRTL
              ? 'إليك أداء نظام CRM الذكاء الاصطناعي اليوم'
              : "Here's what's happening with GMIS CRM today"}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn btn-sm ${showMyStatsOnly ? 'btn-primary' : 'btn-outline'}`}
            style={{
              background: showMyStatsOnly ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
              borderColor: showMyStatsOnly ? '#10b981' : undefined,
              color: showMyStatsOnly ? '#fff' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onClick={() => setShowMyStatsOnly(prev => !prev)}
          >
            {showMyStatsOnly ? <User size={14} /> : <Globe size={14} />}
            {isRTL 
              ? (showMyStatsOnly ? 'إحصائياتي الخاصة' : 'إحصائيات المدرسة كاملة')
              : (showMyStatsOnly ? 'My Stats' : 'Full School Stats')
            }
          </button>
          <button 
            className={`btn btn-sm ${isWeekly ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setIsWeekly(prev => !prev);
            }}
            disabled={isLoadingPeriod}
            style={{ opacity: isLoadingPeriod ? 0.7 : 1 }}
          >
            <Calendar size={15} />
            {isLoadingPeriod
              ? (isRTL ? 'جاري التحديث...' : 'Loading...')
              : (isWeekly ? (isRTL ? 'هذا الأسبوع' : 'This Week') : (isRTL ? 'هذا الشهر' : 'This Month'))}
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportToCSV}>
            <Zap size={15} />
            {isRTL ? 'تصدير التقرير' : 'Export'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '1.25rem' }}>
        {stats.map((s, i) => (
          <div key={i} className={`card stat-card animate-up delay-${i + 1}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                <s.icon size={24} />
              </div>
              <span className={`stat-badge ${s.up ? 'badge-up' : 'badge-down'}`}>
                {s.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {s.trend}
              </span>
            </div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="dashboard-charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>

        {/* Area Chart */}
        <div className="card animate-up delay-2" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <div className="section-title">{isRTL ? 'تدفق العملاء' : 'Lead Pipeline Flow'}</div>
              <div className="page-subtitle" style={{ fontSize: '0.8rem' }}>{isRTL ? 'الأسبوع الماضي' : 'Last 7 days'}</div>
            </div>
            <div className="tab-group">
              <button className="tab-btn active">{isRTL ? 'أسبوع' : 'Week'}</button>
              <button className="tab-btn" onClick={() => handleChartTabClick(isRTL ? 'شهر' : 'Month')}>{isRTL ? 'شهر' : 'Month'}</button>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#001C5E" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#001C5E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14C35D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#14C35D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 13 }}
                />
                <Area type="monotone" dataKey="leads" stroke="#001C5E" strokeWidth={3} fill="url(#gLeads)" animationDuration={1500} name={isRTL ? 'عملاء' : 'Leads'} />
                <Area type="monotone" dataKey="conv"  stroke="#14C35D" strokeWidth={3} fill="url(#gConv)"  animationDuration={1500} name={isRTL ? 'تحويل' : 'Converted'} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            {[{ color: '#001C5E', label: isRTL ? 'عملاء محتملون' : 'Leads' }, { color: '#14C35D', label: isRTL ? 'محوّلون' : 'Converted' }].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card animate-up delay-3" style={{ padding: '1.75rem' }}>
          <div className="section-title" style={{ marginBottom: 4 }}>{isRTL ? 'أداء القنوات' : 'Channels'}</div>
          <div className="page-subtitle" style={{ fontSize: '0.78rem', marginBottom: '1rem' }}>{isRTL ? 'توزيع المصادر' : 'Source distribution'}</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelData} innerRadius={55} outerRadius={78} paddingAngle={6} dataKey="value" animationDuration={1200}>
                  {channelData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {channelData.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</span>
                <div className="progress-bar" style={{ width: 80, flexShrink: 0 }}>
                  <div className="progress-bar-fill" style={{ width: `${c.value * 2}%`, background: c.color }} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="dashboard-bottom-row" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>

        {/* Recent Leads Table */}
        <div className="card animate-up delay-4" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="section-title">{isRTL ? 'آخر العملاء المحتملين' : 'Recent Leads'}</div>
            <button className="btn btn-ghost btn-sm" onClick={handleViewAll}>
              {isRTL ? 'عرض الكل' : 'View All'}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', minWidth: 460 }}>
              <thead>
                <tr>
                  {[isRTL ? 'الاسم' : 'Name', isRTL ? 'المصدر' : 'Source', isRTL ? 'الصف' : 'Grade', isRTL ? 'الحالة' : 'Status', isRTL ? 'منذ' : 'Time'].map((h, i) => (
                    <th key={i} style={{ textAlign: 'start', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((l, i) => (
                  <tr key={i} style={{ background: '#fff', borderRadius: 12 }}>
                    <td style={{ padding: '10px 10px', borderRadius: '10px 0 0 10px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                        onClick={() => openLeadProfile(l)}
                        title={isRTL ? 'عرض بيانات العميل' : 'View client profile'}
                      >
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{l.name.slice(0, 2)}</div>
                        <span style={{
                          color: 'var(--primary)',
                          textDecoration: 'underline',
                          textDecorationColor: 'transparent',
                          transition: 'text-decoration-color 0.2s',
                        }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.textDecorationColor = 'var(--primary)')}
                          onMouseLeave={e => ((e.target as HTMLElement).style.textDecorationColor = 'transparent')}
                        >{l.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <span className={`channel-badge ${l.channel}`}>{l.channel ? l.channel.toUpperCase() : 'WEB'}</span>
                    </td>
                    <td style={{ padding: '10px 10px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{l.grade}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span className={statusPill[l.status] || 'pill pill-cold'}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 10px', borderRadius: '0 10px 10px 0', fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 600 }}>{l.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hot leads */}
          <div className="card animate-up delay-4" style={{ padding: '1.5rem', background: 'linear-gradient(135deg,#fff7ed,#fff)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Flame size={20} color="#ea580c" />
              <span className="section-title" style={{ color: '#c2410c' }}>{isRTL ? 'عملاء ساخنون' : 'Hot Leads'}</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#c2410c', lineHeight: 1 }}>{statsData.hotLeads}</div>
            <div style={{ fontSize: '0.78rem', color: '#9a3412', fontWeight: 600, marginTop: 6 }}>
              {isRTL ? 'يحتاجون متابعة فورية خلال الـ 24 ساعة' : 'Need immediate follow-up within 24h'}
            </div>
            <button
              className="btn btn-sm"
              style={{ marginTop: 14, background: '#fff', color: '#c2410c', border: '1.5px solid #fed7aa', boxShadow: 'none', width: '100%', justifyContent: 'center' }}
              onClick={() => onNavigate && onNavigate('crm')}
            >
              {isRTL ? 'تابع الآن' : 'Follow Up Now'}
            </button>
          </div>

          {/* AI Tip */}
          <div className="banner-gradient animate-up delay-5" style={{ padding: '1.5rem', flex: 1 }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'rgba(20,195,93,0.2)', borderRadius: 8, padding: 6, backdropFilter: 'blur(8px)' }}>
                  <Zap size={16} color="#14C35D" />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  AI Insight
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 16 }}>
                {isRTL
                  ? 'ارتفعت استفسارات "مصاريف KG2" بنسبة 40% عبر واتساب. ابدأ حملة ترويجية الآن!'
                  : '"KG2 Fees" inquiries spiked 40% on WhatsApp. Launch a targeted campaign now!'}
              </p>
              <button
                className="btn btn-sm"
                style={{ background: '#14C35D', color: '#fff', boxShadow: '0 4px 16px rgba(20,195,93,0.4)' }}
                onClick={handleCampaignBtn}
              >
                <Zap size={13} />
                {isRTL ? 'تفعيل الحملة' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ClientProfileModal
        client={profileClient}
        onClose={() => setProfileClient(null)}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} isRTL={isRTL} />
    </div>
  );
};

export default Dashboard;
