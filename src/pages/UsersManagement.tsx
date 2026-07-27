import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Trash2, Shield, CheckCircle, XCircle, Info } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';

type Role = 'admin' | 'agent' | 'supervisor';
type Status = 'active' | 'inactive';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  lastLogin: string;
  permissions: string;
}

const ALL_PERMISSIONS = [
  { id: 'leads', label: 'إدارة العملاء والطلاب', labelEn: 'Manage Leads/Students', descAr: 'إضافة وتعديل بيانات الطلاب الجدد وحالاتهم.', descEn: 'Add and edit new student registrations and statuses.' },
  { id: 'visits', label: 'حجز وجدولة الزيارات', labelEn: 'Manage Visits/Appointments', descAr: 'حجز مواعيد زيارات المدرسة وجدولة المقابلات.', descEn: 'Book school visits and schedule admissions interviews.' },
  { id: 'inbox', label: 'إرسال واستقبال الرسائل', labelEn: 'Messages/Inbox Chat', descAr: 'الرد على محادثات الواتساب وفيسبوك وإنستقرام.', descEn: 'Reply to WhatsApp, Facebook, and Instagram chat sessions.' },
  { id: 'analytics', label: 'عرض التقارير والحملات', labelEn: 'Analytics/Campaigns', descAr: 'متابعة تقارير الأداء وإطلاق حملات رسائل تسويقية.', descEn: 'Monitor performance reports and launch bulk messaging campaigns.' },
  { id: 'settings', label: 'إعدادات النظام والربط', labelEn: 'System Connection Settings', descAr: 'إعداد الربط مع قنوات التواصل ومفتاح الذكاء الاصطناعي.', descEn: 'Configure channels, Meta webhooks, and AI agent prompt rules.' },
  { id: 'users', label: 'إدارة الموظفين والصلاحيات', labelEn: 'Staff/Permissions Management', descAr: 'إضافة الموظفين وتعديل صلاحياتهم وقبول حساباتهم.', descEn: 'Manage employee accounts and adjust their access privileges.' },
];

const UsersManagement: React.FC = () => {
  const { isRTL } = useI18n();
  const [users, setUsers] = useState<Employee[]>([]);
  const [activeDetailUser, setActiveDetailUser] = useState<Employee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'agent' as Role, password: '' });

  const roleStyles: Record<Role, { bg: string; color: string; labelAr: string; labelEn: string; descAr: string; descEn: string }> = {
    admin: { 
      bg: '#fee2e2', 
      color: '#dc2626', 
      labelAr: 'مدير التسويق (Marketing Director)', 
      labelEn: 'Marketing Director',
      descAr: 'يمتلك كامل الصلاحيات للتحكم بالربط، وإدارة إعدادات الذكاء الاصطناعي، وإدارة حسابات الموظفين والتسويق.',
      descEn: 'Has complete access to system settings, AI configuration, staff accounts, and marketing management.'
    },
    agent: { 
      bg: '#e0e7ff', 
      color: '#4f46e5', 
      labelAr: 'موظف تسويق أو مبيعات', 
      labelEn: 'Marketing/Sales Employee',
      descAr: 'تتركز مهامه في متابعة طلبات الطلاب، المراسلة والرد الفوري، وجدولة زيارات المدرسة والمقابلات.',
      descEn: 'Focused on checking student admissions, replying to active chats, and scheduling school visits.'
    },
    supervisor: { 
      bg: '#fef3c7', 
      color: '#d97706', 
      labelAr: 'مشرف أو مراقب عام (Principal)', 
      labelEn: 'Principal/Supervisor',
      descAr: 'يختص بالإشراف والمراقبة العامة على العمليات والزيارات، ومتابعة أداء الموظفين وإحصائيات الطلاب.',
      descEn: 'Responsible for general supervision, monitoring visits, reviewing employee performance, and student stats.'
    },
  };

  const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    axios.get(`${API_URL}/api/settings/whatsapp`).then(res => {
      setWhatsappAccounts(res.data.accounts || []);
    }).catch(console.error);
  }, []);

  const fetchUsers = () => {
    axios.get(`${API_URL}/api/users`)
      .then(res => {
        setUsers(res.data);
        if (res.data.length > 0) {
          // Keep active selected user or default to the first one
          setActiveDetailUser(prev => prev ? (res.data.find((u: Employee) => u.id === prev.id) || res.data[0]) : res.data[0]);
        }
      })
      .catch(console.error);
  };

  const addUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    const defaultPerms = newUser.role === 'admin' ? ALL_PERMISSIONS.map(p => p.id).join(',') : 'leads,inbox';
    const userToSave = { ...newUser, status: 'active', lastLogin: '—', permissions: defaultPerms };
    axios.post(`${API_URL}/api/users`, userToSave).then(() => {
      fetchUsers();
      setNewUser({ name: '', email: '', role: 'agent', password: '' });
      setShowModal(false);
    }).catch(console.error);
  };

  const openPerms = (user: Employee, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting row as detail user
    setSelectedUser(user);
    setUserPerms(user.permissions ? user.permissions.split(',') : []);
    setSelectedWhatsapp((user as any).assigned_whatsapp || '');
    setShowPermModal(true);
  };

  const togglePerm = (id: string) => {
    setUserPerms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const savePerms = () => {
    if (!selectedUser) return;
    axios.post(`${API_URL}/api/users/${selectedUser.id}/permissions`, { 
      permissions: userPerms.join(','),
      assigned_whatsapp: selectedWhatsapp || null
    }).then(() => {
      fetchUsers();
      setShowPermModal(false);
    }).catch(console.error);
  };

  const toggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting row
    const user = users.find(u => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    axios.post(`${API_URL}/api/users/${id}/status`, { status: newStatus }).then(() => {
      fetchUsers();
    }).catch(console.error);
  };

  const deleteUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting row
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) return;
    axios.delete(`${API_URL}/api/users/${id}`).then(() => {
      fetchUsers();
    }).catch(console.error);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="animate-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{isRTL ? 'إدارة المستخدمين والصلاحيات' : 'User Management & Roles'}</h1>
          <p className="page-subtitle">{isRTL ? 'إضافة الموظفين وتحديد صلاحياتهم وعرض دليل مهام الموظف' : 'Manage staff access, edit specific privileges, and view details'}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <UserPlus size={16} />{isRTL ? 'إضافة مستخدم' : 'Add User'}
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="users-management-split animate-up delay-1" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* Table Column (70%) */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'rgba(0,28,94,0.03)' }}>
                  {[isRTL ? 'المستخدم' : 'User', isRTL ? 'الدور' : 'Role', isRTL ? 'الصلاحيات' : 'Permissions', isRTL ? 'الحالة' : 'Status', isRTL ? 'إجراءات' : 'Actions'].map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: 'start', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isActiveDetail = activeDetailUser?.id === u.id;
                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => setActiveDetailUser(u)}
                      style={{ 
                        borderBottom: '1px solid var(--border)', 
                        cursor: 'pointer',
                        background: isActiveDetail ? 'rgba(20,195,93,0.05)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.78rem', background: isActiveDetail ? 'var(--secondary)' : 'var(--primary)', color: '#fff' }}>
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          background: roleStyles[u.role]?.bg || '#f1f5f9', color: roleStyles[u.role]?.color || '#475569',
                          fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99
                        }}>
                          {isRTL ? roleStyles[u.role]?.labelAr : roleStyles[u.role]?.labelEn}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                         <button className="btn btn-outline btn-sm" onClick={(e) => openPerms(u, e)} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                           <Shield size={12} /> {isRTL ? 'تعديل' : 'Edit'}
                         </button>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <button
                          onClick={(e) => toggleStatus(u.id, e)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                            color: u.status === 'active' ? '#16a34a' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700
                          }}
                        >
                          {u.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {isRTL ? (u.status === 'active' ? 'نشط' : 'موقوف') : (u.status === 'active' ? 'Active' : 'Inactive')}
                        </button>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: '#ef4444' }} onClick={(e) => deleteUser(u.id, e)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Permissions Explainer Card (30%) */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: 'var(--topbar-h)' }}>
          {activeDetailUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Employee Overview */}
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(0,28,94,0.06)', color: 'var(--primary)',
                  display: 'grid', placeItems: 'center', margin: '0 auto 10px',
                  fontWeight: 900, fontSize: '1.25rem'
                }}>
                  {activeDetailUser.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', marginBottom: 4 }}>{activeDetailUser.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>{activeDetailUser.email}</p>
                <span style={{
                  background: roleStyles[activeDetailUser.role]?.bg, color: roleStyles[activeDetailUser.role]?.color,
                  fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99
                }}>
                  {isRTL ? roleStyles[activeDetailUser.role]?.labelAr : roleStyles[activeDetailUser.role]?.labelEn}
                </span>
              </div>

              {/* Role General Description */}
              <div>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isRTL ? '📝 وصف وظيفة الدور' : '📝 Role Description'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.5, background: 'rgba(0,28,94,0.03)', padding: 10, borderRadius: 10 }}>
                  {isRTL ? roleStyles[activeDetailUser.role]?.descAr : roleStyles[activeDetailUser.role]?.descEn}
                </p>
              </div>

              {/* Specific Privileges Guide */}
              <div>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isRTL ? '🔑 دليل الصلاحيات المفصلة' : '🔑 Active Privileges Explainer'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                  {ALL_PERMISSIONS.map(p => {
                    const hasPerm = activeDetailUser.permissions ? activeDetailUser.permissions.split(',').includes(p.id) : false;
                    return (
                      <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: hasPerm ? 1 : 0.45 }}>
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          {hasPerm ? <CheckCircle size={14} color="#14C35D" /> : <XCircle size={14} color="#94a3b8" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: hasPerm ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {isRTL ? p.label : p.labelEn}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {isRTL ? p.descAr : p.descEn}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-light)' }}>
              <Info size={36} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.82rem' }}>
                {isRTL ? 'اضغط على موظف لعرض دليل صلاحياته وتوصيفه الوظيفي هنا.' : 'Click on a user to view their detailed role permissions guide here.'}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* New User Modal */}
      {showModal && (
        <div className="overlay">
          <div className="card animate-scale" style={{ width: '100%', maxWidth: 400, padding: '2rem' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20 }}>{isRTL ? 'إضافة مستخدم جديد' : 'Add New User'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="form-input" placeholder={isRTL ? 'الاسم الكامل' : 'Full Name'} value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
              <input className="form-input" type="email" placeholder={isRTL ? 'البريد الإلكتروني' : 'Email Address'} value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
              <input className="form-input" type="password" placeholder={isRTL ? 'كلمة المرور' : 'Password'} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as Role })}>
                <option value="admin">{isRTL ? 'مدير التسويق (Marketing Director)' : 'Marketing Director'}</option>
                <option value="agent">{isRTL ? 'موظف تسويق أو مبيعات (Agent)' : 'Marketing/Sales Employee'}</option>
                <option value="supervisor">{isRTL ? 'مراقب أو مشرف (Principal)' : 'Principal/Supervisor'}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={addUser}>{isRTL ? 'إضافة' : 'Add User'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermModal && (
        <div className="overlay">
          <div className="card" style={{ maxWidth: 450, width: '90%', padding: '2rem' }}>
            <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>{isRTL ? `صلاحيات: ${selectedUser?.name}` : `Permissions: ${selectedUser?.name}`}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {ALL_PERMISSIONS.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'rgba(0,0,0,0.02)', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={userPerms.includes(p.id)} onChange={() => togglePerm(p.id)} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isRTL ? p.label : p.labelEn}</span>
                </label>
              ))}
            </div>

            {/* WhatsApp account assignment */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isRTL ? 'تعيين حساب واتساب محدد للموظف (اختياري):' : 'Assign Specific WhatsApp Account (Optional):'}
              </label>
              <select
                className="form-input"
                value={selectedWhatsapp}
                onChange={e => setSelectedWhatsapp(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
              >
                <option value="">{isRTL ? '-- يرى كل الرسائل / غير معين --' : '-- Sees all messages / Unassigned --'}</option>
                {whatsappAccounts.map(acc => (
                  <option key={acc.id} value={acc.phone_number_id}>{acc.name} ({acc.phone_number_id})</option>
                ))}
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 2 }}>
                {isRTL 
                  ? 'إذا تم تحديده، سيتمكن الموظف فقط من متابعة المحادثات والرسائل القادمة على هذا الرقم. بينما تظل رسائل ماسنجر وإنستغرام متاحة بشكل عادي.'
                  : 'If selected, this employee will only see chats from this WhatsApp number. Messenger and Instagram chats will remain visible normally.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPermModal(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={savePerms}>{isRTL ? 'حفظ الصلاحيات' : 'Save Permissions'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
