import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, Users, Calendar, ArrowUp, Download, Edit3, Check, Printer, FileText } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#14C35D', '#001C5E', '#f59e0b', '#8b5cf6', '#ef4444'];

const RealAnalytics: React.FC = () => {
  const { isRTL } = useI18n();
  
  // States for stats and editing
  const [stats, setStats] = useState<any>({ totalLeads: 0, newToday: 0, upcomingVisits: 0, hotLeads: 0, totalSent: 0, weekData: [], channelData: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [editableStats, setEditableStats] = useState<any>({ totalLeads: 0, newToday: 0, upcomingVisits: 0, hotLeads: 0, totalSent: 0 });
  const [reportNotes, setReportNotes] = useState('');
  
  // Grade distribution state
  const [gradeLeads, setGradeLeads] = useState<{ grade: string; count: number }[]>([]);

  // Conversion metrics state
  const [conversionMetrics, setConversionMetrics] = useState({
    scheduledRate: '0%',
    registeredRate: '0%',
    activeRate: '0%'
  });

  // Funnel state
  const [funnel, setFunnel] = useState({
    newLeads: 0,
    followingLeads: 0,
    interestedLeads: 0,
    registeredLeads: 0,
    coldLeads: 0
  });

  // Recent leads state
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/stats`)
      .then(res => {
        const data = res.data;
        setStats(data);
        setEditableStats({
          totalLeads: data.totalLeads || 0,
          newToday: data.newToday || 0,
          upcomingVisits: data.upcomingVisits || 0,
          hotLeads: data.hotLeads || 0,
          totalSent: data.totalSent || 0
        });
        if (data.gradeDistribution) {
          setGradeLeads(data.gradeDistribution);
        }
        if (data.conversionMetrics) {
          setConversionMetrics(data.conversionMetrics);
        }
        if (data.funnel) {
          setFunnel(data.funnel);
        }
        if (data.recentLeads) {
          setRecentLeads(data.recentLeads);
        }
        setReportNotes(
          isRTL 
            ? 'تقرير أداء تسجيل وقبول الطلاب بنظام GMIS.\nتم تحديث التحليلات لتسحب البيانات الحقيقية من قاعدة البيانات مباشرة.'
            : 'Performance report for GMIS enrollment and registrations.\nAnalytics have been updated to fetch actual live data from the database.'
        );
      })
      .catch(console.error);
  }, [isRTL]);

  const handleStatChange = (key: string, value: string) => {
    const num = parseInt(value) || 0;
    setEditableStats((prev: any) => ({ ...prev, [key]: num }));
  };

  const handleGradeChange = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    setGradeLeads(prev => prev.map((item, i) => i === index ? { ...item, count: num } : item));
  };

  const handleConversionChange = (key: string, value: string) => {
    setConversionMetrics(prev => ({ ...prev, [key]: value }));
  };

  // CSV Export
  const downloadCSV = () => {
    const headers = isRTL 
      ? ['المقياس (Metric)', 'القيمة (Value)']
      : ['Metric', 'Value'];
      
    const data = [
      headers,
      [isRTL ? 'إجمالي العملاء' : 'Total Leads', editableStats.totalLeads],
      [isRTL ? 'عملاء اليوم الجدد' : 'New Leads Today', editableStats.newToday],
      [isRTL ? 'زيارات قادمة مجدولة' : 'Upcoming Scheduled Visits', editableStats.upcomingVisits],
      [isRTL ? 'عملاء مهتمون' : 'Hot Leads', editableStats.hotLeads],
      [isRTL ? 'رسائل تم إرسالها' : 'Messages Sent', editableStats.totalSent],
      [],
      [isRTL ? 'قمع القبول والمراحل' : 'Admissions Funnel Stages', ''],
      [isRTL ? 'طلبات جديدة' : 'New Leads', funnel.newLeads],
      [isRTL ? 'قيد المتابعة' : 'Following Up', funnel.followingLeads],
      [isRTL ? 'مهتم بالزيارة' : 'Interested', funnel.interestedLeads],
      [isRTL ? 'مسجل نهائي' : 'Registered', funnel.registeredLeads],
      [isRTL ? 'غير مهتم' : 'Cold Leads', funnel.coldLeads],
      [],
      [isRTL ? 'توزيع الصفوف الدراسية' : 'Grade Level Distribution', ''],
      ...gradeLeads.map(item => [item.grade, item.count]),
      [],
      [isRTL ? 'توزيع الطلاب حسب الجنسية' : 'Student Nationality Distribution', ''],
      ...(stats.nationalityDistribution || []).map((item: any) => [item.nationality, item.count]),
      [],
      [isRTL ? 'توزيع الطلاب حسب العنوان' : 'Student Address Distribution', ''],
      ...(stats.addressDistribution || []).map((item: any) => [item.address, item.count]),
      [],
      [isRTL ? 'معدلات التحويل' : 'Conversion Rates', ''],
      [isRTL ? 'نسبة جدولة المقابلات' : 'Scheduled Visit Rate', conversionMetrics.scheduledRate],
      [isRTL ? 'نسبة القبول النهائي' : 'Final Registration Rate', conversionMetrics.registeredRate],
      [isRTL ? 'نسبة تفاعل العملاء' : 'Active Engagement Rate', conversionMetrics.activeRate],
      [],
      [isRTL ? 'ملخص وتوصيات المحلل' : 'Executive Notes & Summary', reportNotes]
    ];
    
    // Build CSV Content
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + data.map(e => e.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gmis_detailed_report_${new Date().toLocaleDateString('ar-EG')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = [
    { icon: Users,        label: isRTL ? 'إجمالي العملاء' : 'Total Leads',     value: editableStats.totalLeads,     color: '#001C5E', key: 'totalLeads' },
    { icon: TrendingUp,   label: isRTL ? 'عملاء اليوم'   : 'New Today',        value: editableStats.newToday,       color: '#14C35D', key: 'newToday' },
    { icon: Calendar,     label: isRTL ? 'زيارات قادمة'  : 'Upcoming Visits',  value: editableStats.upcomingVisits, color: '#8b5cf6', key: 'upcomingVisits' },
    { icon: ArrowUp,      label: isRTL ? 'عملاء مهتمون'  : 'Hot Leads',        value: editableStats.hotLeads,       color: '#f59e0b', key: 'hotLeads' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header and Controls */}
      <div className="animate-up no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{isRTL ? 'التحليلات والتقارير المفصلة' : 'Detailed Analytics & Reports'}</h1>
          <p className="page-subtitle">{isRTL ? 'عرض تقارير الأداء مع إمكانية التعديل اليدوي للبيانات وتصديرها' : 'View performance reports with manual editing capabilities and exporting options'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(v => !v)}>
            {isEditing ? <Check size={16} color="#14C35D" /> : <Edit3 size={16} />}
            {isEditing ? (isRTL ? 'حفظ التعديلات' : 'Save Changes') : (isRTL ? 'تعديل التقرير يدوياً' : 'Edit Report Manually')}
          </button>
          <button className="btn btn-outline btn-sm" onClick={downloadCSV}>
            <Download size={16} />{isRTL ? 'تنزيل التقرير (Excel)' : 'Download CSV'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Printer size={16} />{isRTL ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      {/* Print-Only Title Header */}
      <div className="print-only" style={{ display: 'none', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#001C5E', fontWeight: 900, fontSize: '2rem', margin: 0 }}>GMIS CRM Smart Enrollment Report</h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '5px 0 0' }}>
          Date: {new Date().toLocaleDateString('ar-EG')} | Status: Deployed & Active
        </p>
      </div>

      {/* KPI Row */}
      <div className="real-analytics-top-grid animate-up delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {kpis.map((k, i) => (
          <div key={i} className={`card stat-card animate-up delay-${i + 1}`} style={{ minHeight: 120 }}>
            <div className="stat-icon" style={{ background: k.color + '15', color: k.color }}>
              <k.icon size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="stat-label">{k.label}</div>
              {isEditing ? (
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '100px', height: '36px', fontSize: '1.25rem', fontWeight: 900, padding: '4px 8px', marginTop: 4 }}
                  value={k.value}
                  onChange={(e) => handleStatChange(k.key, e.target.value)}
                />
              ) : (
                <div className="stat-value">{k.value.toLocaleString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="real-analytics-middle-grid animate-up delay-2 no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Weekly Bar Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>
            {isRTL ? '📈 تدفق العملاء الأسبوعي' : '📈 Weekly Lead Flow'}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.weekData?.length ? stats.weekData : [{ day: 'Today', leads: stats.newToday, conv: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,28,94,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,28,94,0.1)' }} />
              <Bar dataKey="leads" fill="#14C35D" radius={[6, 6, 0, 0]} name={isRTL ? 'عملاء' : 'Leads'} />
              <Bar dataKey="conv" fill="#001C5E" radius={[6, 6, 0, 0]} name={isRTL ? 'تحويل' : 'Converted'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Pie */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>
            {isRTL ? '📊 قنوات التواصل المباشر' : '📊 Channel Distribution'}
          </h3>
          {stats.channelData?.length > 0 ? (() => {
            const total = stats.channelData.reduce((s: number, d: any) => s + (d.value || 0), 0);
            const CHANNEL_COLORS: Record<string, { bg: string; color: string; label: string }> = {
              whatsapp:  { bg: '#dcfce7', color: '#16a34a', label: 'WhatsApp' },
              facebook:  { bg: '#dbeafe', color: '#1d4ed8', label: 'Facebook' },
              instagram: { bg: '#fce7f3', color: '#9d174d', label: 'Instagram' },
              web:       { bg: '#f1f5f9', color: '#475569', label: 'Web' },
              messenger: { bg: '#ede9fe', color: '#7c3aed', label: 'Messenger' },
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Donut chart */}
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.channelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {stats.channelData.map((entry: any, index: number) => {
                        const key = (entry.name || '').toLowerCase();
                        const cfg = CHANNEL_COLORS[key] || { color: COLORS[index % COLORS.length] };
                        return <Cell key={index} fill={cfg.color} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,28,94,0.12)', fontSize: '0.82rem' }}
                      formatter={(value: any, name: any) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom legend cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.channelData.map((entry: any, index: number) => {
                    const key = (entry.name || '').toLowerCase();
                    const cfg = CHANNEL_COLORS[key] || { bg: '#f8fafc', color: COLORS[index % COLORS.length], label: entry.name };
                    const pct = total ? Math.round(((entry.value || 0) / total) * 100) : 0;
                    return (
                      <div key={index} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 12,
                        background: cfg.bg,
                        border: `1px solid ${cfg.color}20`,
                      }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: cfg.color, flexShrink: 0,
                          boxShadow: `0 0 0 3px ${cfg.color}25`
                        }} />
                        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.82rem', color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {entry.value ?? 0}
                        </span>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 800,
                          padding: '2px 8px', borderRadius: 99,
                          background: `${cfg.color}15`, color: cfg.color
                        }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div style={{ height: 220, display: 'grid', placeItems: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              <div style={{ textAlign: 'center' }}>
                <BarChart3 size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                <p>{isRTL ? 'لا توجد بيانات توزيع قنوات' : 'No channel distribution data'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="real-analytics-bottom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Grade Level Leads Table */}
        <div className="card animate-up delay-3" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            🎓 {isRTL ? 'توزيع الطلاب بحسب المراحل الدراسية' : 'Students Grade Distribution'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gradeLeads.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                {isRTL ? 'لا توجد بيانات توزيع صفوف بعد.' : 'No grade distribution data yet.'}
              </div>
            ) : gradeLeads.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{item.grade}</span>
                {isEditing ? (
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '80px', height: '32px', textAlign: 'center', padding: 4 }}
                    value={item.count}
                    onChange={(e) => handleGradeChange(idx, e.target.value)}
                  />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', background: 'rgba(0,28,94,0.05)', padding: '2px 10px', borderRadius: 8 }}>
                    {item.count} {isRTL ? 'طلاب' : 'students'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Rate Optimization Table */}
        <div className="card animate-up delay-3" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            🔄 {isRTL ? 'معدلات تحويل طلبات القبول' : 'Admissions Conversion Rates'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Scheduled Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {isRTL ? 'نسبة جدولة المقابلات والزيارات' : 'Scheduled Visit Rate'}
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', height: '28px', padding: 4 }}
                    value={conversionMetrics.scheduledRate}
                    onChange={(e) => handleConversionChange('scheduledRate', e.target.value)}
                  />
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--secondary)' }}>{conversionMetrics.scheduledRate}</span>
                )}
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: conversionMetrics.scheduledRate, background: 'var(--secondary)' }} />
              </div>
            </div>

            {/* Registered Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {isRTL ? 'نسبة التسجيل والقبول النهائي' : 'Final Registration Rate'}
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', height: '28px', padding: 4 }}
                    value={conversionMetrics.registeredRate}
                    onChange={(e) => handleConversionChange('registeredRate', e.target.value)}
                  />
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#001C5E' }}>{conversionMetrics.registeredRate}</span>
                )}
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: conversionMetrics.registeredRate, background: '#001C5E' }} />
              </div>
            </div>

            {/* Engagement Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {isRTL ? 'نسبة تفاعل وقبول المحادثات التلقائية' : 'Auto Engagement Success'}
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', height: '28px', padding: 4 }}
                    value={conversionMetrics.activeRate}
                    onChange={(e) => handleConversionChange('activeRate', e.target.value)}
                  />
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#8b5cf6' }}>{conversionMetrics.activeRate}</span>
                )}
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: conversionMetrics.activeRate, background: '#8b5cf6' }} />
              </div>
            </div>

          </div>
        </div>

        {/* Admissions Funnel Card */}
        <div className="card animate-up delay-3" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            📊 {isRTL ? 'قمع قبول الطلاب والمراحل النشطة' : 'Admissions Funnel Stages'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: isRTL ? 'طلبات جديدة' : 'New Leads', count: funnel.newLeads, color: '#3b82f6' },
              { label: isRTL ? 'متابعة مستمرة' : 'Following Up', count: funnel.followingLeads, color: '#f59e0b' },
              { label: isRTL ? 'مهتمين بالزيارة' : 'Interested', count: funnel.interestedLeads, color: '#8b5cf6' },
              { label: isRTL ? 'تم التسجيل النهائي' : 'Registered', count: funnel.registeredLeads, color: '#10b981' },
              { label: isRTL ? 'غير مهتمين / بارد' : 'Not Interested', count: funnel.coldLeads, color: '#94a3b8' }
            ].map((stage, sIdx) => {
              const maxVal = Math.max(funnel.newLeads, funnel.followingLeads, funnel.interestedLeads, funnel.registeredLeads, funnel.coldLeads, 1);
              const percentage = Math.round((stage.count / maxVal) * 100);
              return (
                <div key={sIdx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{stage.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: stage.color }}>
                      {stage.count} {isRTL ? 'طلاب' : 'leads'}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${percentage}%`, background: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Nationality and Address Breakdown Row */}
      <div className="real-analytics-bottom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Nationality Card */}
        <div className="card animate-up delay-3" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            🌍 {isRTL ? 'توزيع الطلاب بحسب الجنسية' : 'Students by Nationality'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!stats.nationalityDistribution || stats.nationalityDistribution.length === 0) ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                {isRTL ? 'لا توجد بيانات توزيع جنسيات بعد.' : 'No nationality distribution data yet.'}
              </div>
            ) : stats.nationalityDistribution.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{item.nationality}</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', background: 'rgba(0,28,94,0.05)', padding: '2px 10px', borderRadius: 8 }}>
                  {item.count} {isRTL ? 'طلاب' : 'students'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Address Card */}
        <div className="card animate-up delay-3" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            📍 {isRTL ? 'توزيع الطلاب بحسب العنوان / السكن' : 'Students by Address'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!stats.addressDistribution || stats.addressDistribution.length === 0) ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                {isRTL ? 'لا توجد بيانات توزيع عناوين بعد.' : 'No address distribution data yet.'}
              </div>
            ) : stats.addressDistribution.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{item.address}</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', background: 'rgba(0,28,94,0.05)', padding: '2px 10px', borderRadius: 8 }}>
                  {item.count} {isRTL ? 'طلاب' : 'students'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Admissions Activity */}
      <div className="card animate-up delay-4" style={{ padding: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>
          🔔 {isRTL ? 'آخر نشاطات وحالات تسجيل الطلاب' : 'Recent Student Registration Activities'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recentLeads.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              {isRTL ? 'لا توجد تسجيلات مدخلة بعد في النظام.' : 'No student registrations entered yet.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'start' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 800 }}>{isRTL ? 'الطالب' : 'Student'}</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 800 }}>{isRTL ? 'الصف' : 'Grade'}</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 800 }}>{isRTL ? 'قناة التسجيل' : 'Channel'}</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 800 }}>{isRTL ? 'الحالة الحالية' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary)' }}>{lead.name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-main)' }}>{lead.grade || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`channel-badge channel-${lead.channel || 'web'}`} style={{ fontSize: '0.65rem' }}>
                          {lead.channel ? lead.channel.toUpperCase() : 'WEB'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: 99,
                          background: lead.status === 'registered' ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.03)',
                          color: lead.status === 'registered' ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {lead.status === 'registered' ? (isRTL ? 'مقبول / مسجل' : 'Registered') : lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Analyst Summary & Notes */}
      <div className="card animate-up delay-4" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
          <FileText size={20} color="var(--primary)" />
          <h3 className="section-title" style={{ margin: 0 }}>
            📝 {isRTL ? 'ملاحظات التحليل والتوصيات التنفيذية' : 'Executive Analyst Notes & Recommendations'}
          </h3>
        </div>
        {isEditing ? (
          <textarea
            className="form-input"
            style={{ width: '100%', minHeight: 110, resize: 'vertical', fontFamily: 'inherit', padding: 12 }}
            value={reportNotes}
            onChange={(e) => setReportNotes(e.target.value)}
          />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
            {reportNotes}
          </p>
        )}
      </div>

    </div>
  );
};

export default RealAnalytics;
