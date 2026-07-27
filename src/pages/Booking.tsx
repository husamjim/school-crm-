import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarDays, List, Plus, CheckCircle, X } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import ClientProfileModal from '../components/ClientProfileModal';
import type { ClientProfile } from '../components/ClientProfileModal';
import { useToast, ToastContainer } from '../hooks/useToast';

const statusStyle: Record<string, { bg: string; color: string; label: string; labelEn: string }> = {
  confirmed: { bg: '#f0fdf4', color: '#16a34a', label: 'مؤكدة', labelEn: 'Confirmed' },
  pending:   { bg: '#fff7ed', color: '#ea580c', label: 'معلقة', labelEn: 'Pending' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'ملغاة', labelEn: 'Cancelled' },
};

const cleanPhone = (p: string) => p.replace(/\D/g, '');
const isPhoneMatch = (p1?: string, p2?: string) => {
  if (!p1 || !p2) return false;
  const c1 = cleanPhone(p1);
  const c2 = cleanPhone(p2);
  if (c1 === c2) return true;
  if (c1.length >= 9 && c2.length >= 9) {
    return c1.slice(-9) === c2.slice(-9);
  }
  return false;
};

const Booking: React.FC = () => {
  const { isRTL } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [visits, setVisits] = useState<any[]>([]);
  const [newVisit, setNewVisit] = useState({ name: '', phone: '', date: '', time: '' });

  // Client profile modal
  const [profileClient, setProfileClient] = useState<ClientProfile | null>(null);

  // Toast
  const { toasts, showToast, removeToast } = useToast();

  const [crmLeads, setCrmLeads] = useState<any[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('gmis_user') || '{}');
    fetchVisits(user.id, user.role);
    axios.get(`${API_URL}/api/leads?userId=${user.id}&role=${user.role}`)
      .then(res => setCrmLeads(res.data))
      .catch(console.error);
  }, []);

  const fetchVisits = async (userId?: string, role?: string) => {
    try {
      const user = userId && role ? { id: userId, role } : JSON.parse(localStorage.getItem('gmis_user') || '{}');
      const res = await axios.get(`${API_URL}/api/visits?userId=${user.id}&role=${user.role}`);
      setVisits(res.data);
    } catch (err) { console.error(err); }
  };

  const addVisit = async () => {
    if (!newVisit.name || !newVisit.date) return;
    try {
      await axios.post(`${API_URL}/api/visits`, newVisit);
      showToast(
        isRTL ? '✅ تم حجز الموعد بنجاح' : '✅ Appointment Booked',
        isRTL ? 'تم حفظ الموعد في النظام' : 'Appointment saved successfully'
      );
      fetchVisits();
      setShowForm(false);
      setNewVisit({ name: '', phone: '', date: '', time: '' });
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.post(`${API_URL}/api/visits/${id}/status`, { status });
      fetchVisits();
    } catch (err) { console.error(err); }
  };

  const deleteVisit = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    try {
      await axios.delete(`${API_URL}/api/visits/${id}`);
      showToast(
        isRTL ? '🗑️ تم حذف الموعد' : '🗑️ Appointment Deleted',
        isRTL ? 'تم إزالة الموعد من النظام' : 'Appointment removed successfully'
      );
      fetchVisits();
    } catch (err) { console.error(err); }
  };

  const openVisitorProfile = (v: any) => {
    const found = crmLeads.find(l => isPhoneMatch(l.phone, v.phone) || l.name.toLowerCase() === v.name.toLowerCase());
    setProfileClient({
      name: v.name,
      phone: v.phone,
      date: v.date,
      time: v.time,
      status: v.status,
      ...found
    });
  };

  // Dynamic calendar based on current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - startingDayOfWeek + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });
  const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="animate-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{isRTL ? 'حجز الزيارات' : 'Visit Bookings'}</h1>
          <p className="page-subtitle">{isRTL ? 'إدارة مواعيد زيارات أولياء الأمور للمدرسة' : 'Manage parent school visit appointments'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="tab-group">
            <button className={`tab-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={16} />{isRTL ? 'القائمة' : 'List'}
            </button>
            <button className={`tab-btn${viewMode === 'calendar' ? ' active' : ''}`} onClick={() => setViewMode('calendar')}>
              <CalendarDays size={16} />{isRTL ? 'التقويم' : 'Calendar'}
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />{isRTL ? 'حجز زيارة' : 'Book Visit'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="animate-up delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
        {[
          { label: isRTL?'إجمالي الزيارات':'Total Visits', value: visits.length.toString(), color: '#001C5E' },
          { label: isRTL?'مؤكدة':'Confirmed',        value: visits.filter(v=>v.status==='confirmed').length.toString(), color: '#16a34a' },
          { label: isRTL?'معلقة':'Pending',           value: visits.filter(v=>v.status==='pending').length.toString(), color: '#ea580c' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card animate-up delay-2" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'rgba(0,28,94,0.03)' }}>
                  {[isRTL?'ولي الأمر':'Parent', isRTL?'التاريخ':'Date', isRTL?'الوقت':'Time', isRTL?'الحالة':'Status', isRTL?'إجراءات':'Actions'].map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: 'start', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visits.map(v => {
                  const st = statusStyle[v.status] || statusStyle.pending;
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '13px 16px' }}>
                        {/* Clickable parent name */}
                        <div
                          onClick={() => openVisitorProfile(v)}
                          style={{ cursor: 'pointer' }}
                          title={isRTL ? 'عرض بيانات ولي الأمر' : 'View parent details'}
                        >
                          <div style={{
                            fontWeight: 700, fontSize: '0.875rem',
                            color: 'var(--primary)',
                            textDecoration: 'underline',
                            textDecorationColor: 'transparent',
                            transition: 'text-decoration-color 0.2s',
                          }}
                            onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--primary)')}
                            onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                          >{v.name}</div>
                          {v.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', direction: 'ltr' }}>{v.phone}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '0.82rem' }}>{v.date}</td>
                      <td style={{ padding: '13px 16px', fontSize: '0.82rem' }}>{v.time}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: st.bg, color: st.color, fontSize: '0.72rem', fontWeight: 800, padding: '4px 12px', borderRadius: 99 }}>
                          {isRTL ? st.label : st.labelEn}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {v.status === 'pending' && (
                            <button className="btn btn-outline btn-sm" onClick={() => updateStatus(v.id, 'confirmed')}>
                              <CheckCircle size={13} color="#16a34a" />
                              {isRTL ? 'تأكيد' : 'Confirm'}
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteVisit(v.id)}>
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visits.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                      {isRTL ? 'لا توجد زيارات مجدولة' : 'No visits scheduled yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="card animate-up delay-2" style={{ padding: '1.5rem' }}>
          {/* Month header */}
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>
            {today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
          </div>
          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {(isRTL
              ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            ).map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-light)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Calendar grid — scrollable on mobile */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(44px, 1fr))', gap: 4, minWidth: 308 }}>
              {calendarDays.map((day, i) => {
                const dayStr = day ? `${monthStr}-${day.toString().padStart(2, '0')}` : '';
                const dayVisits = visits.filter(v => v.date === dayStr);
                const isToday = day === today.getDate();
                return (
                  <div key={i} style={{
                    minHeight: 70,
                    border: `1px solid ${isToday ? 'var(--secondary)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '6px 4px',
                    background: day ? (isToday ? 'rgba(20,195,93,0.05)' : '#fff') : '#f8fafc',
                    transition: 'all 0.2s',
                  }}>
                    {day && (
                      <div style={{
                        fontWeight: isToday ? 900 : 800,
                        fontSize: '0.8rem',
                        color: isToday ? 'var(--secondary)' : 'var(--text-main)',
                        marginBottom: 4,
                        textAlign: 'center',
                      }}>{day}</div>
                    )}
                    {dayVisits.map(v => (
                      <div
                        key={v.id}
                        onClick={() => openVisitorProfile(v)}
                        style={{
                          fontSize: '0.6rem', padding: '2px 4px',
                          background: statusStyle[v.status]?.bg,
                          color: statusStyle[v.status]?.color,
                          borderRadius: 4, marginTop: 2,
                          cursor: 'pointer', fontWeight: 700,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                        title={v.name}
                      >
                        {v.time && <span style={{ opacity: 0.8 }}>{v.time} </span>}
                        {v.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal animate-scale" onClick={e => e.stopPropagation()}>
            <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>{isRTL ? 'حجز موعد جديد' : 'New Appointment'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder={isRTL ? 'اسم ولي الأمر' : 'Parent Name'} className="form-input" value={newVisit.name} onChange={e => setNewVisit({...newVisit, name: e.target.value})} />
              <input type="text" placeholder={isRTL ? 'رقم الهاتف' : 'Phone'} className="form-input" value={newVisit.phone} onChange={e => setNewVisit({...newVisit, phone: e.target.value})} />
              <input type="date" className="form-input" value={newVisit.date} onChange={e => setNewVisit({...newVisit, date: e.target.value})} />
              <input type="time" className="form-input" value={newVisit.time} onChange={e => setNewVisit({...newVisit, time: e.target.value})} />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={addVisit}>{isRTL ? 'حفظ' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Profile Modal */}
      <ClientProfileModal
        client={profileClient}
        onClose={() => setProfileClient(null)}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} isRTL={isRTL} />
    </div>
  );
};

export default Booking;
