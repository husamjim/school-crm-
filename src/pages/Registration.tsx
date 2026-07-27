import React, { useState } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, ChevronRight } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import { SchoolLogo } from '../components/SchoolLogo';
import { NATIONALITIES } from '../services/nationalities';

const steps = [
  { id: 1, labelAr: 'بيانات الطالب',    labelEn: 'Student Info' },
  { id: 2, labelAr: 'بيانات ولي الأمر', labelEn: 'Parent Info' },
  { id: 3, labelAr: 'المستندات',         labelEn: 'Documents' },
  { id: 4, labelAr: 'المراجعة والتأكيد', labelEn: 'Review & Confirm' },
];

const Registration: React.FC = () => {
  const { isRTL } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, { name: string; url: string }>>({});
  const [form, setForm] = useState({
    studentName: '', grade: '', birthDate: '', studentNationality: '',
    parentName: '', phone: '', email: '', address: '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleNextStep = () => {
    if (step === 1) {
      if (!form.studentName.trim()) {
        alert(isRTL ? 'الرجاء إدخال اسم الطالب كاملاً' : 'Please enter full student name');
        return;
      }
      if (!form.grade) {
        alert(isRTL ? 'الرجاء اختيار الصف الدراسي' : 'Please select grade');
        return;
      }
      if (!form.birthDate) {
        alert(isRTL ? 'الرجاء اختيار تاريخ الميلاد' : 'Please select date of birth');
        return;
      }
      if (!form.studentNationality) {
        alert(isRTL ? 'الرجاء اختيار جنسية الطالب' : 'Please select student nationality');
        return;
      }
    }
    if (step === 2) {
      if (!form.parentName.trim()) {
        alert(isRTL ? 'الرجاء إدخال اسم ولي الأمر' : 'Please enter parent name');
        return;
      }
      if (!form.phone.trim()) {
        alert(isRTL ? 'الرجاء إدخال رقم الهاتف' : 'Please enter phone number');
        return;
      }
      if (!form.email.trim()) {
        alert(isRTL ? 'الرجاء إدخال البريد الإلكتروني' : 'Please enter email address');
        return;
      }
      if (!form.address.trim()) {
        alert(isRTL ? 'الرجاء إدخال العنوان السكني' : 'Please enter home address');
        return;
      }
    }
    setStep(s => Math.min(4, s + 1));
  };

  const handleDocUpload = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await axios.post(`${API_URL}/api/upload`, {
            fileName: file.name,
            fileData: reader.result
          });
          if (res.data.url) {
            setUploadedFiles(prev => ({ ...prev, [index]: { name: file.name, url: res.data.url } }));
          }
        } catch (err) {
          console.error("Upload error", err);
          alert(isRTL ? 'فشل رفع المستند' : 'Failed to upload document');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDoc = (index: number) => {
    setUploadedFiles(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleConfirm = () => {
    setLoading(true);
    
    // Prepare files array
    const docKeys = Object.keys(uploadedFiles).map(Number);
    const filesList = docKeys.map(k => {
      const f = uploadedFiles[k];
      return {
        name: f.name,
        url: f.url,
        type: f.name.endsWith('.pdf') ? 'pdf' : 'image'
      };
    });

    const lead = {
      id: Date.now().toString(),
      name: form.studentName,
      phone: form.phone,
      channel: 'web',
      grade: form.grade,
      score: 100,
      status: 'new',
      notes: `جنسية الطالب: ${form.studentNationality || '—'} | ولي الأمر: ${form.parentName || '—'}`,
      student_nationality: form.studentNationality,
      birth_date: form.birthDate,
      parent_name: form.parentName,
      email: form.email,
      address: form.address,
      photo_url: uploadedFiles[0]?.url || null,
      files: JSON.stringify(filesList)
    };

    axios.post(`${API_URL}/api/leads`, lead)
      .then(() => {
        setSubmitted(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (submitted) {
    return (
      <div className="card animate-scale" style={{ padding: '3rem', textAlign: 'center', maxWidth: 500, margin: '2rem auto' }}>
        <CheckCircle size={64} color="#14C35D" style={{ margin: '0 auto 1.5rem' }} />
        <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>
          {isRTL ? 'تم التسجيل بنجاح!' : 'Registration Successful!'}
        </h2>
        <p style={{ color: 'var(--text-sec)', marginBottom: '2rem' }}>
          {isRTL ? 'تم استلام طلبك وسيتواصل معك فريق القبول قريباً.' : 'Your application has been received. Our admissions team will contact you soon.'}
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          {isRTL ? 'تسجيل طالب آخر' : 'Register Another Student'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 700, margin: '0 auto' }}>
      <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
        <SchoolLogo size={90} showText={true} />
        <h1 className="page-title" style={{ marginTop: 8 }}>{isRTL ? 'تسجيل طالب جديد' : 'Student Registration'}</h1>
        <p className="page-subtitle">{isRTL ? 'أكمل الخطوات لتسجيل الطالب في GMIS' : 'Complete the steps to enroll a student at GMIS'}</p>
      </div>

      {/* Steps Indicator */}
      <div className="animate-up delay-1 card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {/* Progress Line */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'var(--border)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, height: 2, background: 'var(--secondary)', zIndex: 0, transition: 'width 0.5s', width: `${((step-1) / (steps.length-1)) * 100}%` }} />
          {steps.map(s => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: s.id < step ? 'var(--secondary)' : s.id === step ? 'var(--primary)' : '#e2e8f0',
                color: s.id <= step ? '#fff' : 'var(--text-muted)',
                display: 'grid', placeItems: 'center',
                fontWeight: 800, fontSize: '0.9rem',
                border: s.id === step ? '3px solid rgba(0,28,94,0.2)' : '3px solid transparent',
                transition: 'all 0.4s',
                boxShadow: s.id === step ? '0 0 0 4px rgba(0,28,94,0.1)' : 'none'
              }}>
                {s.id < step ? <CheckCircle size={20} /> : s.id}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.id === step ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {isRTL ? s.labelAr : s.labelEn}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Body */}
      <div className="animate-up delay-2 card" style={{ padding: '2rem' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 4 }}>{isRTL ? '📚 بيانات الطالب' : '📚 Student Information'}</h3>
            <input className="form-input" placeholder={isRTL ? 'اسم الطالب كاملاً' : 'Full Student Name'} value={form.studentName} onChange={set('studentName')} />
            <select className="form-input" value={form.grade} onChange={set('grade')}>
              <option value="">{isRTL ? '-- اختر الصف الدراسي --' : '-- Select Grade --'}</option>
              {[
                'KG1','KG2',
                'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6',
                'Grade 7','Grade 8','Grade 9','Grade 10',
                'Grade 11 (IGCSE)','Grade 12 (AUSMAT)'
              ].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div style={{ position: 'relative' }}>
              <label style={{ position: 'absolute', top: -9, [isRTL ? 'right' : 'left']: 12, background: '#fff', padding: '0 4px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}
              </label>
              <input className="form-input" type="date" value={form.birthDate} onChange={set('birthDate')} />
            </div>
            <select className="form-input" value={form.studentNationality} onChange={set('studentNationality')}>
              <option value="">{isRTL ? '-- اختر جنسية الطالب --' : '-- Select Student Nationality --'}</option>
              {NATIONALITIES.map((n, idx) => (
                <option key={`${n.en}-${idx}`} value={isRTL ? n.ar : n.en}>
                  {isRTL ? n.ar : n.en}
                </option>
              ))}
            </select>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 4 }}>{isRTL ? '👨‍👩‍👧 بيانات ولي الأمر' : '👨‍👩‍👧 Parent Information'}</h3>
            <input className="form-input" placeholder={isRTL ? 'اسم ولي الأمر كاملاً' : "Parent's Full Name"} value={form.parentName} onChange={set('parentName')} />
            <input className="form-input" placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'} value={form.phone} onChange={set('phone')} />
            <input className="form-input" type="email" placeholder={isRTL ? 'البريد الإلكتروني' : 'Email Address'} value={form.email} onChange={set('email')} />
            <input className="form-input" placeholder={isRTL ? 'العنوان / السكن' : 'Home Address'} value={form.address} onChange={set('address')} />
          </div>
        )}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 4 }}>{isRTL ? '📎 رفع المستندات' : '📎 Upload Documents'}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              {isRTL ? 'يرجى رفع الصورة الشخصية وصورة جواز الطالب' : 'Please upload the personal photo and student passport photo'}
            </p>
            {[
              { label: isRTL ? 'الصورة الشخصية للطالب' : 'Student Personal Photo', accept: 'image/*', icon: '🖼️' },
              { label: isRTL ? 'صورة جواز سفر الطالب' : 'Student Passport Photo', accept: 'image/*', icon: '🛂' },
            ].map((doc, i) => {
              const fileName = uploadedFiles[i]?.name;
              const fileUrl = uploadedFiles[i]?.url;
              return (
                <div key={i} className="card-flat" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    {fileUrl && fileUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                      <img src={fileUrl} alt="preview" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(0,28,94,0.06)', display: 'grid', placeItems: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{doc.icon}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{doc.label}</div>
                      {fileName ? (
                        <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, marginTop: 3 }}>✅ {fileName}</div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>{isRTL ? 'لم يتم الرفع بعد' : 'Not uploaded yet'}</div>
                      )}
                    </div>
                  </div>
                  <input type="file" id={`doc-upload-${i}`} style={{ display: 'none' }} accept={doc.accept} onChange={handleDocUpload(i)} />
                  {fileName ? (
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeDoc(i)}>
                      {isRTL ? 'حذف' : 'Remove'}
                    </button>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => document.getElementById(`doc-upload-${i}`)?.click()}>
                      <Upload size={14} />{isRTL ? 'رفع' : 'Upload'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle size={64} color="#14C35D" style={{ margin: '0 auto' }} />
            <h3 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)' }}>
              {isRTL ? 'مراجعة البيانات' : 'Review & Submit'}
            </h3>
            <div className="card-flat" style={{ padding: '1.25rem', textAlign: isRTL ? 'right' : 'left' }}>
              <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <h4 style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 4 }}>{isRTL ? '📚 بيانات الطالب' : '📚 Student Info'}</h4>
                  <div><strong>{isRTL ? 'الاسم:' : 'Name:'}</strong> {form.studentName || '—'}</div>
                  <div><strong>{isRTL ? 'الصف:' : 'Grade:'}</strong> {form.grade || '—'}</div>
                  <div><strong>{isRTL ? 'تاريخ الميلاد:' : 'DOB:'}</strong> {form.birthDate || '—'}</div>
                  <div><strong>{isRTL ? 'الجنسية:' : 'Nationality:'}</strong> {form.studentNationality || '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <h4 style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 4 }}>{isRTL ? '👨‍👩‍👧 بيانات ولي الأمر' : '👨‍👩‍👧 Parent Info'}</h4>
                  <div><strong>{isRTL ? 'الاسم:' : 'Name:'}</strong> {form.parentName || '—'}</div>
                  <div><strong>{isRTL ? 'الهاتف:' : 'Phone:'}</strong> {form.phone || '—'}</div>
                  <div><strong>{isRTL ? 'البريد الإلكتروني:' : 'Email:'}</strong> {form.email || '—'}</div>
                  <div><strong>{isRTL ? 'العنوان:' : 'Address:'}</strong> {form.address || '—'}</div>
                </div>
              </div>
              {/* Documents summary */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 8, fontSize: '0.82rem' }}>📎 {isRTL ? 'المستندات المرفوعة' : 'Uploaded Documents'}</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[isRTL ? 'الصورة الشخصية' : 'Personal Photo', isRTL ? 'جواز الطالب' : 'Passport Photo'].map((lbl, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                      background: uploadedFiles[i] ? 'rgba(20,195,93,0.1)' : 'rgba(0,0,0,0.04)',
                      color: uploadedFiles[i] ? '#059669' : 'var(--text-muted)' }}>
                      {uploadedFiles[i] ? '✅' : '⬜'} {lbl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="animate-up delay-3" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} style={{ opacity: step === 1 ? 0.4 : 1 }}>
          {isRTL ? 'السابق' : 'Back'}
        </button>
        {step < 4
          ? <button className="btn btn-primary" onClick={handleNextStep}>
              {isRTL ? 'التالي' : 'Next'} <ChevronRight size={16} />
            </button>
          : <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
              <CheckCircle size={16} />{loading ? '...' : (isRTL ? 'تأكيد التسجيل' : 'Confirm Registration')}
            </button>}
      </div>
    </div>
  );
};

export default Registration;
