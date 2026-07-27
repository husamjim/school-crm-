import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
  X, MessageSquare,
  Copy, CheckCheck, Star, Calendar,
  Plus, Trash2, FileText, Upload, Download, Eye, Cloud
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import { printStudentDossier, printDocumentFile } from '../services/printDossier';

export type ClientProfile = {
  id?: string;
  name: string;
  phone?: string;
  channel?: string;
  grade?: string;
  score?: number;
  status?: string;
  notes?: string;
  date?: string;   // for booking visits
  time?: string;

  // Extra fields:
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
  photo_url?: string;
  files?: string | any[];
  assigned_to?: string;
};

interface Props {
  client: ClientProfile | null;
  onClose: () => void;
  onUpdate?: (updatedLead: any) => void;
}

const channelLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', facebook: 'Facebook',
  instagram: 'Instagram', web: 'Web Form',
};
const statusAr: Record<string, string> = {
  new: 'جديد', following: 'متابعة', interested: 'مهتم',
  registered: 'تم التسجيل', cold: 'غير مهتم',
  confirmed: 'مؤكدة', pending: 'معلقة', cancelled: 'ملغاة',
};
const statusColors: Record<string, { bg: string; color: string }> = {
  new:        { bg: '#eff6ff', color: '#3b82f6' },
  following:  { bg: '#fff7ed', color: '#ea580c' },
  interested: { bg: '#fefce8', color: '#ca8a04' },
  registered: { bg: '#f0fdf4', color: '#16a34a' },
  cold:       { bg: '#f8fafc', color: '#64748b' },
  confirmed:  { bg: '#f0fdf4', color: '#16a34a' },
  pending:    { bg: '#fff7ed', color: '#ea580c' },
  cancelled:  { bg: '#fef2f2', color: '#dc2626' },
};

const ScoreRingLg: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : 'ضعيف';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 54, height: 54, borderRadius: '50%',
        background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0)`,
        display: 'grid', placeItems: 'center'
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: '#fff', display: 'grid', placeItems: 'center'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 950, color }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{label}</span>
    </div>
  );
};

const ClientProfileModal: React.FC<Props> = ({ client, onClose, onUpdate }) => {
  const { isRTL } = useI18n();
  const [copied, setCopied] = React.useState(false);
  const [localPhoto, setLocalPhoto] = React.useState<string | null>(null);
  const [localFiles, setLocalFiles] = React.useState<any[]>([]);
  const [isHoverPhoto, setIsHoverPhoto] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [uploadingDoc, setUploadingDoc] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<{ name: string; url: string; type: string } | null>(null);
  
  const [isUploadingToDrive, setIsUploadingToDrive] = React.useState(false);

  const handleGoogleDriveUpload = async () => {
    if (!client || !client.id) return;
    setIsUploadingToDrive(true);
    try {
      const res = await axios.post(`${API_URL}/api/leads/${client.id}/upload-to-drive`);
      if (res.data.success) {
        alert(isRTL 
          ? `✅ تم الرفع بنجاح لجوجل درايف!\nتم إنشاء مجلد باسم: ${res.data.folderName}\nورفع ${res.data.uploadedCount} مستندات.` 
          : `✅ Successfully uploaded to Google Drive!\nCreated folder: ${res.data.folderName}\nUploaded ${res.data.uploadedCount} documents.`
        );
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message;
      alert(isRTL 
        ? `❌ فشل الرفع لجوجل درايف:\n${errMsg}` 
        : `❌ Google Drive upload failed:\n${errMsg}`
      );
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const [users, setUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    axios.get(`${API_URL}/api/users`).then(res => {
      setUsers(res.data);
    }).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (client) {
      setLocalPhoto(client.photo_url || null);
      if (client.files) {
        try {
          setLocalFiles(typeof client.files === 'string' ? JSON.parse(client.files) : client.files);
        } catch (e) {
          setLocalFiles([]);
        }
      } else {
        setLocalFiles([]);
      }
    }
  }, [client]);

  if (!client) return null;

  const ch = client.channel || 'web';
  const st = client.status || '';
  const stColors = statusColors[st] || { bg: '#f1f5f9', color: '#475569' };

  const initials = (client.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';

  const copyPhone = () => {
    if (client.phone) {
      navigator.clipboard.writeText(client.phone).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openWhatsApp = () => {
    if (client.phone) {
      const clean = client.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${clean}`, '_blank');
    }
  };

  // Upload student photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && client.id) {
      setUploadingPhoto(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await axios.post(`${API_URL}/api/leads/${client.id}/upload`, {
            fileName: file.name,
            fileData: reader.result,
            category: 'photo'
          });
          if (res.data.url) {
            setLocalPhoto(res.data.url);
            if (onUpdate) {
              onUpdate({ ...client, photo_url: res.data.url, files: localFiles });
            }
          }
        } catch (err) {
          console.error("Photo upload failed", err);
          alert(isRTL ? "فشل رفع الصورة الشخصية" : "Failed to upload photo");
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload student document
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && client.id) {
      setUploadingDoc(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await axios.post(`${API_URL}/api/leads/${client.id}/upload`, {
            fileName: file.name,
            fileType: file.name.endsWith('.pdf') ? 'pdf' : 'image',
            fileData: reader.result,
            category: 'document'
          });
          if (res.data.files) {
            setLocalFiles(res.data.files);
            if (onUpdate) {
              onUpdate({ ...client, photo_url: localPhoto || undefined, files: res.data.files });
            }
          }
        } catch (err) {
          console.error("Document upload failed", err);
          alert(isRTL ? "فشل رفع المستند" : "Failed to upload document");
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete student document
  const handleDocDelete = async (fileUrl: string) => {
    if (!client.id) return;
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Are you sure you want to delete this document?')) return;
    try {
      const res = await axios.post(`${API_URL}/api/leads/${client.id}/delete-file`, {
        url: fileUrl
      });
      if (res.data.files) {
        setLocalFiles(res.data.files);
        if (onUpdate) {
          onUpdate({ ...client, photo_url: localPhoto || undefined, files: res.data.files });
        }
      }
    } catch (err) {
      console.error("Document deletion failed", err);
      alert(isRTL ? "فشل حذف المستند" : "Failed to delete document");
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="profile-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9000,
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="animate-scale client-profile-modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 32px 80px rgba(0,28,94,0.25)',
          width: '100%',
          maxWidth: 720,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: '2rem auto'
        }}
      >
        {/* ─── Header gradient ─── */}
        <div style={{
          background: 'linear-gradient(135deg, #001440 0%, #001C5E 60%, #1a4fa8 100%)',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* bg circles */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 150, height: 150, borderRadius: '50%',
            background: 'rgba(20,195,93,0.15)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: -20, left: 20,
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none'
          }} />

          {/* close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 20, [isRTL ? 'left' : 'right']: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 12, padding: 8, cursor: 'pointer',
              color: '#fff', display: 'flex', alignItems: 'center',
              backdropFilter: 'blur(8px)',
              zIndex: 10
            }}
          >
            <X size={20} />
          </button>

          <div className="profile-modal-header-content" style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
            {/* Student Photo with edit overlay */}
            <div 
              onMouseEnter={() => client.id && setIsHoverPhoto(true)}
              onMouseLeave={() => setIsHoverPhoto(false)}
              onClick={() => {
                if (!client.id) {
                  alert(isRTL ? 'يجب تسجيل الزائر في الـ CRM أولاً لتتمكن من رفع صورته الشخصية.' : 'This visitor must be registered in the CRM first to upload a profile photo.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              style={{
                width: 80, height: 80, borderRadius: 22,
                position: 'relative',
                overflow: 'hidden',
                cursor: client.id ? 'pointer' : 'not-allowed',
                background: 'linear-gradient(135deg, #14C35D, #0dab4f)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 8px 24px rgba(20,195,93,0.4)',
                flexShrink: 0,
              }}
            >
              {localPhoto ? (
                <img 
                  src={`${API_URL}${localPhoto}`} 
                  alt="Student avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{initials}</span>
              )}
              
              {/* Hover Edit Overlay */}
              {(isHoverPhoto || uploadingPhoto) && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0, 0, 0, 0.6)',
                  display: 'grid', placeItems: 'center',
                  color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                  transition: 'opacity 0.2s'
                }}>
                  {uploadingPhoto ? '...' : <Upload size={18} />}
                </div>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />

            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                {client.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {client.channel && (
                  <span style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '4px 12px', borderRadius: 99,
                    backdropFilter: 'blur(8px)',
                  }}>
                    {channelLabel[ch] || ch}
                  </span>
                )}
                {st && (
                  <span style={{
                    background: stColors.bg, color: stColors.color,
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '4px 12px', borderRadius: 99,
                  }}>
                    {isRTL ? (statusAr[st] || st) : st}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="client-profile-modal-body" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          
          {/* Main Grid: Student info (left) & Parent info (right) */}
          <div className="client-profile-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}>
            
            {/* Student Info Card */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 14,
              padding: '1.25rem', background: '#f8fafc',
              borderRadius: 20, border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                📚 {isRTL ? 'بيانات الطالب التفصيلية' : 'Detailed Student Info'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '1.1rem' }}>👤</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'الاسم بالكامل' : 'Full Name'}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                  </div>
                </div>

                {client.grade && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>🏫</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'الصف الدراسي' : 'Grade'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.grade}</div>
                    </div>
                  </div>
                )}

                {client.birth_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>📅</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.birth_date}</div>
                    </div>
                  </div>
                )}

                {client.student_nationality && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>🌍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'جنسية الطالب' : 'Student Nationality'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.student_nationality}</div>
                    </div>
                  </div>
                )}

                {client.student_passport && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>🛂</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'رقم جواز السفر / الهوية' : 'Passport/ID Number'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.student_passport}</div>
                    </div>
                  </div>
                )}

                {client.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>💼</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'الموظف المسؤول' : 'Assigned Employee'}</div>
                      <select
                        className="form-input"
                        style={{ padding: '2px 4px', fontSize: '0.78rem', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-main)', fontWeight: 700, outline: 'none' }}
                        value={client.assigned_to || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          try {
                            await axios.post(`${API_URL}/api/leads/${client.id}/assign`, { assigned_to: val || null });
                            if (onUpdate) {
                              onUpdate({ ...client, assigned_to: val });
                            }
                          } catch (err) {
                            console.error("Failed to assign lead", err);
                          }
                        }}
                      >
                        <option value="">{isRTL ? '-- غير معين --' : '-- Unassigned --'}</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Interest Score Gauge */}
              {client.score !== undefined && (
                <div style={{
                  padding: '10px 12px', background: '#fff',
                  borderRadius: 14, border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 14, marginTop: 6
                }}>
                  <ScoreRingLg score={client.score} />
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 4 }}>
                      {isRTL ? 'مؤشر الاهتمام' : 'Interest Score'}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={14}
                          fill={i <= Math.ceil(client.score! / 20) ? '#F5A623' : 'none'}
                          color={i <= Math.ceil(client.score! / 20) ? '#F5A623' : '#e2e8f0'}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Parent Info Card */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 14,
              padding: '1.25rem', background: '#f8fafc',
              borderRadius: 20, border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                👨‍👩‍👧 {isRTL ? 'بيانات ولي الأمر' : 'Parent Information'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '1.1rem' }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'اسم ولي الأمر' : 'Parent Name'}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.parent_name || '—'}</div>
                  </div>
                </div>

                {client.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>📞</span>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'رقم الهاتف' : 'Phone'}</div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', direction: 'ltr', textAlign: 'start' }}>{client.phone}</div>
                      </div>
                      <button
                        onClick={copyPhone}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: copied ? '#14C35D' : 'var(--text-light)',
                          padding: 4
                        }}
                        title={isRTL ? 'نسخ' : 'Copy'}
                      >
                        {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {client.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>📧</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={client.email}>{client.email}</div>
                    </div>
                  </div>
                )}

                {client.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'العنوان السكني' : 'Address'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={client.address}>{client.address}</div>
                    </div>
                  </div>
                )}

                {client.parent_nationality && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>🌍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'جنسية ولي الأمر' : 'Parent Nationality'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.parent_nationality}</div>
                    </div>
                  </div>
                )}

                {client.parent_passport && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1.1rem' }}>🛂</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>{isRTL ? 'رقم هوية/جواز ولي الأمر' : 'Parent ID/Passport'}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{client.parent_passport}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Communication Buttons */}
              {client.phone && (
                <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 10 }}>
                  <button
                    onClick={openWhatsApp}
                    className="btn btn-sm"
                    style={{
                      width: '100%', justifyContent: 'center', gap: 8,
                      background: '#25D366', color: '#fff',
                      boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                      padding: '10px 16px', borderRadius: 12,
                      fontSize: '0.85rem', fontWeight: 800
                    }}
                  >
                    <MessageSquare size={16} />
                    WhatsApp
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Visit and General Notes Section */}
          {(client.date || client.time || client.notes) && (
            <div className="client-profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              {/* Appointment */}
              {(client.date || client.time) && (
                <div style={{
                  padding: '12px 16px', background: '#f0fdf4',
                  borderRadius: 16, border: '1px solid #bbf7d0',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#dcfce7', display: 'grid', placeItems: 'center', flexShrink: 0
                  }}>
                    <Calendar size={16} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                      {isRTL ? 'موعد الزيارة وجدولة المقابلة' : 'Admissions Visit Interview'}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d', marginTop: 2 }}>
                      {client.date} {client.time && `— ${client.time}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {client.notes && (
                <div style={{
                  padding: '12px 16px', background: '#fffbeb',
                  borderRadius: 16, border: '1px solid #fde68a',
                  fontSize: '0.8rem', color: '#92400e', lineHeight: 1.6
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4, color: '#b45309' }}>
                    {isRTL ? 'ملاحظات وتوجيهات' : 'Administrative Notes'}
                  </div>
                  {client.notes}
                </div>
              )}

            </div>
          )}

          {/* 📎 Student Documents & Certificates section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '1.5rem',
            border: '1px dashed rgba(0,28,94,0.15)',
            borderRadius: 24,
            background: 'linear-gradient(180deg, #fafafa 0%, #f4f6f9 100%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>📎</span>
                {isRTL ? 'ملفات ومستندات الطالب المرفقة' : 'Attached Student Certificates & Documents'}
              </h3>
              
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (!client.id) {
                    alert(isRTL ? 'يجب تسجيل الزائر في الـ CRM أولاً لتتمكن من رفع مستنداته.' : 'This visitor must be registered in the CRM first to upload documents.');
                    return;
                  }
                  docInputRef.current?.click();
                }}
                disabled={uploadingDoc || !client.id}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  borderRadius: 12,
                  opacity: !client.id ? 0.5 : 1,
                  cursor: client.id ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: client.id ? '0 4px 12px rgba(0,28,94,0.15)' : 'none'
                }}
              >
                <Plus size={15} />
                {uploadingDoc ? '...' : (isRTL ? 'رفع مستند جديد' : 'Upload Document')}
              </button>
              
              <input 
                type="file" 
                ref={docInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf,image/*" 
                onChange={handleDocUpload} 
              />
            </div>

            {localFiles.length === 0 ? (
              <div style={{ 
                padding: '2.5rem 1.5rem', 
                textAlign: 'center', 
                color: 'var(--text-light)', 
                fontSize: '0.85rem', 
                background: '#fff',
                borderRadius: 18,
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10
              }}>
                <FileText size={36} style={{ opacity: 0.25, color: 'var(--primary)' }} />
                <span>
                  {!client.id 
                    ? (isRTL ? 'يجب تسجيل هذا الزائر في الـ CRM لتتمكن من رفع الملفات والصور الشخصية.' : 'This visitor must be registered in the CRM first to upload files and photos.')
                    : (isRTL ? 'لا توجد مستندات مرفوعة لهذا الطالب حالياً. اضغط على زر الرفع لإضافة مستند.' : 'No files uploaded yet for this student. Click upload to add.')
                  }
                </span>
              </div>
            ) : (
              <div className="doc-list-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: 16 
              }}>
                {localFiles.map((file, i) => {
                  const isPdf = file.type === 'pdf';
                  return (
                    <div 
                      key={i} 
                      className="document-card-premium" 
                      style={{ 
                        padding: 14, 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 10,
                        background: '#fff', 
                        border: '1px solid rgba(0,28,94,0.06)', 
                        borderRadius: 16,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => setPreviewFile(file)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Document Icon/Preview Thumbnail */}
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: isPdf ? 'rgba(239, 68, 68, 0.08)' : 'rgba(20, 195, 93, 0.08)',
                          display: 'grid',
                          placeItems: 'center',
                          color: isPdf ? '#ef4444' : '#14C35D',
                          flexShrink: 0,
                          overflow: 'hidden',
                          position: 'relative',
                          border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                          {!isPdf && file.url ? (
                            <img 
                              src={`${API_URL}${file.url}`} 
                              alt={file.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <FileText size={18} style={{ color: isPdf ? '#ef4444' : '#14C35D' }} />
                          )}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 700, 
                            color: 'var(--primary)',
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis'
                          }} title={file.name}>
                            {file.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ 
                              fontSize: '0.58rem', 
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: 4,
                              background: isPdf ? '#fef2f2' : '#f0fdf4',
                              color: isPdf ? '#dc2626' : '#16a34a',
                              textTransform: 'uppercase'
                            }}>
                              {isPdf ? 'PDF' : 'IMAGE'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons bar */}
                      <div 
                        style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}
                        onClick={e => e.stopPropagation()} // Prevent triggering lightbox preview
                      >
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', height: 28, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, background: '#f4f6f9', borderRadius: 8 }}
                          title={isRTL ? 'عرض' : 'View'}
                        >
                          <Eye size={12} />
                          <span>{isRTL ? 'عرض' : 'View'}</span>
                        </button>
                        <a
                          href={`${API_URL}${file.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', height: 28, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, background: '#f4f6f9', borderRadius: 8, color: 'inherit', textDecoration: 'none' }}
                          title={isRTL ? 'تنزيل' : 'Download'}
                          download
                        >
                          <Download size={12} />
                          <span>{isRTL ? 'تنزيل' : 'Download'}</span>
                        </a>
                        <button
                          onClick={() => printDocumentFile(file)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', height: 28, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, background: '#fff1f2', color: '#e11d48', borderRadius: 8 }}
                          title={isRTL ? 'تحميل كـ PDF' : 'Download as PDF'}
                        >
                          <FileText size={12} />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => handleDocDelete(file.url)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', height: 28, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#ef4444', borderRadius: 8 }}
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={12} />
                          <span>{isRTL ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lightbox / Document Viewer Modal */}
          {previewFile && (
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 9999,
                display: 'grid',
                placeItems: 'center',
                padding: '2rem'
              }}
              onClick={() => setPreviewFile(null)}
            >
              <div 
                style={{
                  background: '#fff',
                  borderRadius: 24,
                  width: '100%',
                  maxWidth: '900px',
                  maxHeight: '90vh',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Viewer Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ 
                      fontWeight: 800, 
                      fontSize: '0.95rem', 
                      color: 'var(--primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {previewFile.name}
                    </h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 2 }}>
                      {previewFile.type === 'pdf' ? 'PDF Document' : 'Image File'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a
                      href={`${API_URL}${previewFile.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={14} />
                      {isRTL ? 'تحميل الملف' : 'Download File'}
                    </a>
                    
                    <button 
                      onClick={() => setPreviewFile(null)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: 10,
                        padding: 8,
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Viewer Content */}
                <div style={{ 
                  flex: 1, 
                  background: '#0f172a', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  overflow: 'auto',
                  minHeight: '400px',
                  maxHeight: 'calc(90vh - 80px)',
                  padding: '1rem'
                }}>
                  {previewFile.type === 'pdf' ? (
                    <iframe 
                      src={`${API_URL}${previewFile.url}`} 
                      style={{ 
                        width: '100%', 
                        height: '70vh', 
                        border: 'none', 
                        borderRadius: 12,
                        background: '#fff'
                      }} 
                      title={previewFile.name}
                    />
                  ) : (
                    <img 
                      src={`${API_URL}${previewFile.url}`} 
                      alt={previewFile.name} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '75vh', 
                        objectFit: 'contain',
                        borderRadius: 8,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }} 
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons at the bottom of the profile modal */}
          {client.id && (
            <div className="profile-modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button
                onClick={handleGoogleDriveUpload}
                className="btn btn-primary"
                disabled={isUploadingToDrive}
                style={{
                  minWidth: 200, justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #4285F4 0%, #357ae8 100%)',
                  boxShadow: '0 8px 20px rgba(66,133,244,0.3)',
                  border: 'none', color: '#fff'
                }}
              >
                <Cloud size={16} />
                {isUploadingToDrive 
                  ? (isRTL ? 'جاري الرفع للـ Drive...' : 'Uploading to Drive...') 
                  : (isRTL ? 'رفع لـ Google Drive' : 'Upload to Google Drive')}
              </button>
              <button
                onClick={() => printStudentDossier(client, isRTL)}
                className="btn btn-outline"
                style={{
                  minWidth: 180, justifyContent: 'center', gap: 8,
                  borderColor: '#ef4444', color: '#ef4444'
                }}
              >
                <FileText size={16} />
                {isRTL ? 'تحميل كـ PDF' : 'Download as PDF'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ClientProfileModal;

