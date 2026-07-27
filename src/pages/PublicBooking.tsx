import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import { SchoolLogo } from '../components/SchoolLogo';

const PublicBooking: React.FC = () => {
  const { isRTL } = useI18n();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    date: '',
    time: ''
  });

  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert(isRTL ? 'الرجاء إدخال الاسم بالكامل' : 'Please enter your full name');
      return;
    }
    if (!form.phone.trim()) {
      alert(isRTL ? 'الرجاء إدخال رقم الهاتف' : 'Please enter your phone number');
      return;
    }
    if (!form.date) {
      alert(isRTL ? 'الرجاء اختيار تاريخ الزيارة' : 'Please select a visit date');
      return;
    }
    if (!form.time) {
      alert(isRTL ? 'الرجاء اختيار وقت الزيارة' : 'Please select a visit time');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/visits`, {
        name: form.name,
        phone: form.phone,
        date: form.date,
        time: form.time,
        status: 'pending' // Initial status is pending approval
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(isRTL ? 'فشل حجز الموعد، الرجاء المحاولة مرة أخرى' : 'Failed to book appointment, please try again');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card animate-scale" style={{ padding: '3rem', textAlign: 'center', maxWidth: 500, margin: '2rem auto' }}>
        <CheckCircle size={64} color="#14C35D" style={{ margin: '0 auto 1.5rem' }} />
        <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>
          {isRTL ? 'تم تقديم طلب الحجز بنجاح!' : 'Booking Request Submitted!'}
        </h2>
        <p style={{ color: 'var(--text-sec)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
          {isRTL 
            ? 'تم تسجيل موعد الزيارة المقترح بنجاح. سنقوم بمراجعة الطلب وتأكيده معك عبر الهاتف أو واتساب قريباً.' 
            : 'Your proposed visit slot has been registered. We will review and confirm it with you via phone/WhatsApp shortly.'}
        </p>
        <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
          {isRTL ? 'حجز موعد آخر' : 'Book Another Slot'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 500, margin: '0 auto' }}>
      <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
        <SchoolLogo size={90} showText={true} />
        <h1 className="page-title" style={{ marginTop: 8 }}>{isRTL ? 'حجز زيارة للمدرسة' : 'Book a School Visit'}</h1>
        <p className="page-subtitle">{isRTL ? 'اختر اليوم والوقت المناسبين لزيارة حرم مدارسنا ومقابلة فريق القبول' : 'Choose the best date and time to visit our campus and meet our admissions team'}</p>
      </div>

      <div className="card animate-up delay-1" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Visitor Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              👤 {isRTL ? 'اسم الزائر / ولي الأمر الكامل' : 'Visitor / Parent Full Name'}
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder={isRTL ? 'الاسم بالكامل' : 'Full Name'}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Visitor Phone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              📞 {isRTL ? 'رقم الهاتف للتواصل' : 'Contact Phone Number'}
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          {/* Date of Visit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              📅 {isRTL ? 'تاريخ الزيارة المقترح' : 'Proposed Visit Date'}
            </label>
            <input 
              type="date"
              className="form-input"
              min={new Date().toISOString().split('T')[0]} // Block past dates
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>

          {/* Time Slot */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              🕒 {isRTL ? 'الوقت المناسب' : 'Preferred Time'}
            </label>
            <select 
              className="form-input"
              value={form.time}
              onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
            >
              <option value="">{isRTL ? '-- اختر وقت المقابلة --' : '-- Select Time Slot --'}</option>
              {timeSlots.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          >
            {loading ? '...' : (isRTL ? 'حجز زيارة الآن' : 'Book Visit Now')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicBooking;
