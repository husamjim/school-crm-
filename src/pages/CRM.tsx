import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Search,
  MessageSquare, Trash2, Edit3, Download, Cloud, FileText
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import ClientProfileModal from '../components/ClientProfileModal';
import { NATIONALITIES } from '../services/nationalities';
import type { ClientProfile } from '../components/ClientProfileModal';
import { useToast, ToastContainer } from '../hooks/useToast';
import { printStudentDossier } from '../services/printDossier';

type Status = 'new' | 'following' | 'interested' | 'registered' | 'cold';
type Channel = 'whatsapp' | 'facebook' | 'instagram' | 'web';

interface Lead {
  id: string;
  name: string;
  phone: string;
  channel: Channel;
  grade: string;
  score: number;
  status: Status;
  notes?: string;

  // Extra columns:
  student_nationality?: string;
  student_passport?: string;
  parent_nationality?: string;
  parent_passport?: string;
  birth_date?: string;
  parent_name?: string;
  email?: string;
  address?: string;
  ai_enabled?: number;
  follow_up?: number;
  assigned_to?: string;
}

const COLUMNS: { id: Status; label: string; labelEn: string; color: string }[] = [
  { id: 'new',        label: 'جديد',         labelEn: 'New',          color: '#3b82f6' },
  { id: 'following',  label: 'متابعة',        labelEn: 'Following Up',  color: '#f59e0b' },
  { id: 'interested', label: 'مهتم',          labelEn: 'Interested',    color: '#8b5cf6' },
  { id: 'registered', label: 'تم التسجيل',    labelEn: 'Registered',    color: '#10b981' },
  { id: 'cold',       label: 'غير مهتم',     labelEn: 'Not Interested', color: '#94a3b8' },
];

const INIT_LEADS: Lead[] = [];

const channelClass: Record<Channel, string> = {
  whatsapp: 'channel-wa', facebook: 'channel-fb', instagram: 'channel-ig', web: 'channel-web',
};
const channelLabel: Record<Channel, string> = {
  whatsapp: 'WhatsApp', facebook: 'Messenger', instagram: 'Instagram', web: 'Web',
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0)`, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color }}>{score}</span>
        </div>
      </div>
    </div>
  );
};

interface CRMProps {
  onNavigate?: (tab: string, leadId?: string) => void;
}

const CRM: React.FC<CRMProps> = () => {
  const { isRTL } = useI18n();
  const [leads, setLeads] = useState<Lead[]>(INIT_LEADS);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', grade: '', channel: 'whatsapp' as Channel });
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  // Client profile modal
  const [profileClient, setProfileClient] = useState<ClientProfile | null>(null);
  
  // Edit Lead Modal States
  const [users, setUsers] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  // Toast
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('gmis_user') || '{}');
    axios.get(`${API_URL}/api/leads?userId=${user.id}&role=${user.role}`).then(res => {
      setLeads(res.data);
      const targetId = sessionStorage.getItem('crm_target_lead');
      if (targetId) {
        setHighlightedLeadId(targetId);
        sessionStorage.removeItem('crm_target_lead');
        setTimeout(() => {
          highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
        setTimeout(() => setHighlightedLeadId(null), 3000);
      }
    });

    axios.get(`${API_URL}/api/users`).then(res => {
      setUsers(res.data);
    }).catch(console.error);
  }, []);

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      grade: lead.grade,
      notes: lead.notes || '',
      student_nationality: lead.student_nationality || '',
      student_passport: lead.student_passport || '',
      parent_nationality: lead.parent_nationality || '',
      parent_passport: lead.parent_passport || '',
      birth_date: lead.birth_date || '',
      parent_name: lead.parent_name || '',
      email: lead.email || '',
      address: lead.address || ''
    });
    setShowEditModal(true);
  };

  const saveLeadEdits = async () => {
    if (!editingLead || !editingLead.name.trim()) return;
    try {
      await axios.post(`${API_URL}/api/leads/${editingLead.id}`, editingLead);
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...editingLead } : l));
      setShowEditModal(false);
      setEditingLead(null);
      showToast(
        isRTL ? '✅ تم حفظ التعديلات بنجاح' : '✅ Lead details updated',
        isRTL ? 'تم حفظ التعديلات الجديدة في النظام' : 'Changes saved successfully'
      );
    } catch (err) {
      console.error(err);
      alert(isRTL ? 'فشل حفظ التعديلات' : 'Failed to save changes');
    }
  };

  const [isUploadingToDrive, setIsUploadingToDrive] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const uploadToGoogleDrive = async (leadId: string) => {
    setIsUploadingToDrive(leadId);
    try {
      const res = await axios.post(`${API_URL}/api/leads/${leadId}/upload-to-drive`);
      if (res.data.success) {
        showToast(
          isRTL ? '✅ تم الرفع بنجاح لجوجل درايف!' : '✅ Drive Upload Success',
          isRTL 
            ? `تم إنشاء مجلد باسم "${res.data.folderName}" ورفع الملفات فيه` 
            : `Folder "${res.data.folderName}" created with all documents.`
        );
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message;
      alert(isRTL 
        ? `فشل الرفع لجوجل درايف: ${errMsg}` 
        : `Drive upload failed: ${errMsg}`
      );
    } finally {
      setIsUploadingToDrive(null);
    }
  };

  const syncAllToDrive = async () => {
    setIsSyncingAll(true);
    showToast(
      isRTL ? '🔄 جاري المزامنة...' : '🔄 Syncing...',
      isRTL ? 'جاري رفع وتحديث جميع ملفات ومجلدات الطلاب على Google Drive.' : 'Uploading and updating all student folders and dossiers on Google Drive.'
    );
    try {
      const res = await axios.post(`${API_URL}/api/leads/sync-all-drive`);
      if (res.data.success) {
        showToast(
          isRTL ? '✅ تم التحديث والمزامنة بنجاح' : '✅ Sync Completed',
          res.data.message
        );
      } else {
        showToast(
          isRTL ? '❌ فشلت المزامنة' : '❌ Sync Failed',
          res.data.error || ''
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        isRTL ? '❌ فشلت المزامنة' : '❌ Sync Failed',
        err.response?.data?.error || err.message
      );
    } finally {
      setIsSyncingAll(false);
    }
  };

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search)
  );

  const addLead = () => {
    if (!newLead.name.trim()) return;
    const l = {
      ...newLead,
      id: Date.now().toString(),
      score: Math.floor(Math.random() * 40) + 50,
      status: 'new' as Status,
    };
    axios.post(`${API_URL}/api/leads`, l).then(() => {
      setLeads(prev => [l, ...prev]);
    });
    setNewLead({ name: '', phone: '', grade: '', channel: 'whatsapp' });
    setShowModal(false);
  };

  const moveLead = (id: string, toStatus: Status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: toStatus } : l));
    axios.post(`${API_URL}/api/leads/${id}/status`, { status: toStatus });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Channel', 'Grade', 'Score', 'Status'];
    const csvContent = [
      headers.join(','),
      ...leads.map(l => `"${l.name}","${l.phone}","${l.channel}","${l.grade}","${l.score}","${l.status}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gmis_leads_export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMsgBtn = (lead: Lead) => {
    if (!lead.phone) {
      showToast(
        isRTL ? '💬 المراسلة غير متاحة' : '💬 Messaging unavailable',
        isRTL ? 'لا يوجد رقم مسجّل — أضف رقم الهاتف أولاً' : 'No phone number — please add one first'
      );
      return;
    }
    const clean = lead.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };


  const openProfile = (lead: Lead) => {
    setProfileClient({
      ...lead
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{isRTL ? 'إدارة العملاء (CRM)' : 'CRM Pipeline'}</h1>
          <p className="page-subtitle">{isRTL ? `${leads.length} عميل محتمل في المسار` : `${leads.length} leads in the pipeline`}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: 12, color: 'var(--text-light)' }} />
            <input
              className="form-input"
              style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: 38, fontSize: '0.85rem', width: 220 }}
              placeholder={isRTL ? 'بحث...' : 'Search leads...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tab-group">
            <button className={`tab-btn${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>{isRTL ? 'لوحة المتابعة' : 'Kanban'}</button>
            <button className={`tab-btn${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>{isRTL ? 'جدول' : 'Table'}</button>
          </div>
          <button 
            className="btn btn-outline btn-sm" 
            style={{ color: '#4285F4', borderColor: 'rgba(66,133,244,0.3)' }} 
            onClick={syncAllToDrive}
            disabled={isSyncingAll}
          >
            <Cloud size={16} className={isSyncingAll ? 'animate-pulse' : ''} />
            {isSyncingAll ? (isRTL ? 'جاري التحديث...' : 'Syncing...') : (isRTL ? 'تحديث ومزامنة درايف' : 'Sync Google Drive')}
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportToCSV}>
            <Download size={16} />
            {isRTL ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            {isRTL ? 'إضافة عميل' : 'Add Lead'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="animate-up delay-1" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {COLUMNS.map(col => {
          const count = leads.filter(l => l.status === col.id).length;
          return (
            <div key={col.id} className="card-flat" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 140px' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: col.color }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{isRTL ? col.label : col.labelEn}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginInlineStart: 'auto' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="animate-up delay-2" style={{ overflowX: 'auto', paddingBottom: 12, width: '100%', maxWidth: '100%' }}>
          <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content', padding: '0.25rem' }}>
            {COLUMNS.map(col => {
            const colLeads = filtered.filter(l => l.status === col.id);
            return (
              <div key={col.id} className="kanban-col" style={{ width: 260, minWidth: 260, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                <div className="kanban-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: col.color }} />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>{isRTL ? col.label : col.labelEn}</span>
                  </div>
                  <span style={{ background: col.color + '20', color: col.color, fontSize: '0.7rem', fontWeight: 800, padding: '2px 9px', borderRadius: 99 }}>
                    {colLeads.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {colLeads.map(lead => (
                    <div key={lead.id} className="card-flat" style={{ padding: '14px', cursor: 'default', transition: 'all 0.4s', outline: highlightedLeadId === lead.id ? '2px solid var(--secondary)' : 'none', boxShadow: highlightedLeadId === lead.id ? '0 0 20px rgba(20,195,93,0.35)' : undefined, borderRadius: highlightedLeadId === lead.id ? '14px' : undefined }} ref={highlightedLeadId === lead.id ? highlightedRef : null}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>{lead.name.slice(0, 2)}</div>
                          <div>
                            {/* Clickable name */}
                            <div
                              onClick={() => openProfile(lead)}
                              style={{
                                fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)',
                                cursor: 'pointer', textDecoration: 'underline',
                                textDecorationColor: 'transparent',
                                transition: 'text-decoration-color 0.2s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--primary)')}
                              onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                              title={isRTL ? 'عرض بيانات العميل' : 'View client profile'}
                            >
                              {lead.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{lead.grade}</div>
                          </div>
                        </div>
                        <ScoreRing score={lead.score} />
                      </div>
                      <span className={`channel-badge ${channelClass[lead.channel]}`} style={{ fontSize: '0.68rem', marginBottom: 10, display: 'inline-block' }}>
                        {channelLabel[lead.channel]}
                      </span>
                      {lead.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>{lead.notes}</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {/* Assignee select dropdown (Employee) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-light)', minWidth: 44 }}>
                            {isRTL ? 'المسؤول:' : 'Assign:'}
                          </span>
                          <select
                            className="form-input"
                            style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem', fontWeight: 600 }}
                            value={lead.assigned_to || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: val } : l));
                              await axios.post(`${API_URL}/api/leads/${lead.id}/assign`, { assigned_to: val || null });
                            }}
                          >
                            <option value="">{isRTL ? 'غير معين' : 'Unassigned'}</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Action buttons (WhatsApp, Edit, Drive & Status Selector) */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm tooltip"
                            data-tip="WhatsApp"
                            style={{ flex: 1, justifyContent: 'center', padding: '6px' }}
                            onClick={() => handleMsgBtn(lead)}
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            className="btn btn-outline btn-sm tooltip"
                            data-tip={isRTL ? 'تعديل' : 'Edit'}
                            style={{ flex: 1, justifyContent: 'center', padding: '6px' }}
                            onClick={() => handleOpenEditModal(lead)}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="btn btn-outline btn-sm tooltip"
                            data-tip={isRTL ? 'رفع لجوجل درايف' : 'Upload to Google Drive'}
                            disabled={isUploadingToDrive === lead.id}
                            style={{ flex: 1, justifyContent: 'center', padding: '6px', color: isUploadingToDrive === lead.id ? '#94a3b8' : '#4285F4' }}
                            onClick={() => uploadToGoogleDrive(lead.id)}
                          >
                            <Cloud size={13} className={isUploadingToDrive === lead.id ? 'animate-pulse' : ''} />
                          </button>
                          <button
                            className="btn btn-outline btn-sm tooltip"
                            data-tip={isRTL ? 'تحميل كـ PDF' : 'Download as PDF'}
                            style={{ flex: 1, justifyContent: 'center', padding: '6px', color: '#ef4444' }}
                            onClick={() => printStudentDossier(lead, isRTL)}
                          >
                            <FileText size={13} />
                          </button>
                          <select
                            className="form-input"
                            style={{ flex: 2, padding: '6px 8px', fontSize: '0.72rem', fontWeight: 700 }}
                            value={lead.status}
                            onChange={e => moveLead(lead.id, e.target.value as Status)}
                          >
                            {COLUMNS.map(c => <option key={c.id} value={c.id}>{isRTL ? c.label : c.labelEn}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 600 }}>
                      {isRTL ? 'لا يوجد عملاء' : 'No leads'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="card animate-up delay-2" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(0,28,94,0.03)' }}>
                {[isRTL?'الاسم':'Name', isRTL?'الهاتف':'Phone', isRTL?'القناة':'Channel', isRTL?'الصف':'Grade', isRTL?'النقاط':'Score', isRTL?'المسؤول':'Assignee', isRTL?'الحالة':'Status', isRTL?'إجراءات':'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 16px', textAlign: 'start', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,28,94,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.78rem' }}>{l.name.slice(0, 2)}</div>
                      {/* Clickable name */}
                      <span
                        onClick={() => openProfile(l)}
                        style={{
                          fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                          color: 'var(--primary)',
                          textDecoration: 'underline',
                          textDecorationColor: 'transparent',
                          transition: 'text-decoration-color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                        title={isRTL ? 'عرض بيانات العميل' : 'View client profile'}
                      >
                        {l.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{l.phone}</td>
                  <td style={{ padding: '13px 16px' }}><span className={`channel-badge ${channelClass[l.channel]}`}>{channelLabel[l.channel]}</span></td>
                  <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{l.grade}</td>
                  <td style={{ padding: '13px 16px' }}><ScoreRing score={l.score} /></td>
                  <td style={{ padding: '13px 16px' }}>
                    <select className="form-input" style={{ padding: '4px 6px', fontSize: '0.78rem', width: 130 }}
                      value={l.assigned_to || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setLeads(prev => prev.map(x => x.id === l.id ? { ...x, assigned_to: val } : x));
                        await axios.post(`${API_URL}/api/leads/${l.id}/assign`, { assigned_to: val || null });
                      }}
                    >
                      <option value="">{isRTL ? 'غير معين' : 'Unassigned'}</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <select className="form-input" style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, width: 140 }}
                      value={l.status} onChange={e => moveLead(l.id, e.target.value as Status)}>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{isRTL ? c.label : c.labelEn}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm tooltip" data-tip="WhatsApp" style={{ padding: 6 }} onClick={() => handleMsgBtn(l)}><MessageSquare size={15} /></button>
                      <button className="btn btn-ghost btn-sm tooltip" data-tip={isRTL ? 'تعديل' : 'Edit'} style={{ padding: 6 }} onClick={() => handleOpenEditModal(l)}><Edit3 size={15} /></button>
                      <button 
                        className="btn btn-ghost btn-sm tooltip" 
                        data-tip={isRTL ? 'رفع لجوجل درايف' : 'Upload to Google Drive'} 
                        disabled={isUploadingToDrive === l.id}
                        style={{ padding: 6, color: isUploadingToDrive === l.id ? '#94a3b8' : '#4285F4' }} 
                        onClick={() => uploadToGoogleDrive(l.id)}
                      >
                        <Cloud size={15} className={isUploadingToDrive === l.id ? 'animate-pulse' : ''} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm tooltip" 
                        data-tip={isRTL ? 'تحميل كـ PDF' : 'Download as PDF'} 
                        style={{ padding: 6, color: '#ef4444' }} 
                        onClick={() => printStudentDossier(l, isRTL)}
                      >
                        <FileText size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: '#ef4444' }} onClick={() => setLeads(prev => prev.filter(x => x.id !== l.id))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal animate-scale" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.2rem' }}>
              {isRTL ? '➕ إضافة عميل جديد' : '➕ Add New Lead'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="form-input" placeholder={isRTL ? 'الاسم الكامل' : 'Full Name'} value={newLead.name} onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} />
              <input className="form-input" placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'} value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
              <input className="form-input" placeholder={isRTL ? 'الصف الدراسي (مثل KG2)' : 'Grade (e.g. KG2)'} value={newLead.grade} onChange={e => setNewLead(p => ({ ...p, grade: e.target.value }))} />
              <select className="form-input" value={newLead.channel} onChange={e => setNewLead(p => ({ ...p, channel: e.target.value as Channel }))}>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="web">Web Form</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={addLead}>
                {isRTL ? 'إضافة' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientProfileModal
        client={profileClient}
        onClose={() => setProfileClient(null)}
        onUpdate={(updatedLead) => {
          setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
          setProfileClient(updatedLead);
        }}
      />

      {/* Edit Lead Modal */}
      {showEditModal && editingLead && (
        <div className="overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '90%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              ✏️ {isRTL ? 'تعديل بيانات الطالب' : 'Edit Student Details'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Student info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'اسم الطالب كاملاً' : 'Full Name'}</label>
                <input className="form-input" value={editingLead.name} onChange={e => setEditingLead({ ...editingLead, name: e.target.value })} />
              </div>
              <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'الهاتف' : 'Phone'}</label>
                  <input className="form-input" value={editingLead.phone} onChange={e => setEditingLead({ ...editingLead, phone: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'الصف' : 'Grade'}</label>
                  <input className="form-input" value={editingLead.grade} onChange={e => setEditingLead({ ...editingLead, grade: e.target.value })} />
                </div>
              </div>
              
              {/* Extra details */}
              <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'تاريخ الميلاد' : 'Birth Date'}</label>
                  <input type="date" className="form-input" value={editingLead.birth_date} onChange={e => setEditingLead({ ...editingLead, birth_date: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'جنسية الطالب' : 'Student Nationality'}</label>
                  <select 
                    className="form-input" 
                    value={editingLead.student_nationality || ''} 
                    onChange={e => setEditingLead({ ...editingLead, student_nationality: e.target.value })}
                  >
                    <option value="">{isRTL ? '-- اختر جنسية الطالب --' : '-- Select Student Nationality --'}</option>
                    {NATIONALITIES.map((n, idx) => (
                      <option key={`${n.en}-${idx}`} value={isRTL ? n.ar : n.en}>
                        {isRTL ? n.ar : n.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'اسم ولي الأمر' : 'Parent Name'}</label>
                <input className="form-input" value={editingLead.parent_name} onChange={e => setEditingLead({ ...editingLead, parent_name: e.target.value })} />
              </div>
              <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input className="form-input" value={editingLead.email} onChange={e => setEditingLead({ ...editingLead, email: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'العنوان' : 'Address'}</label>
                  <input className="form-input" value={editingLead.address} onChange={e => setEditingLead({ ...editingLead, address: e.target.value })} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-light)' }}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <textarea className="form-input" style={{ minHeight: 60, padding: '8px 12px', resize: 'vertical' }} value={editingLead.notes} onChange={e => setEditingLead({ ...editingLead, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowEditModal(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveLeadEdits}>
                {isRTL ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} isRTL={isRTL} />
    </div>
  );
};

export default CRM;
