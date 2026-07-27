import React, { useState } from 'react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import { Lock, Mail, LogIn } from 'lucide-react';
import { SchoolLogo } from '../components/SchoolLogo';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { isRTL, language, setLanguage } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email.trim()) {
      setError(isRTL ? 'الرجاء إدخال البريد الإلكتروني' : 'Please enter your email');
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setError(isRTL ? 'الرجاء إدخال كلمة المرور' : 'Please enter your password');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('gmis_token', data.token);
        localStorage.setItem('gmis_user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      }
    } catch (err) {
      setError(isRTL ? 'خطأ في الاتصال بالخادم، تحقق من اتصالك' : 'Server connection error, check your connection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper" dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '2rem'
    }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <button 
          className="btn btn-outline" 
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          style={{ padding: '8px 16px', borderRadius: 99 }}
        >
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="card animate-up" style={{
        maxWidth: 420,
        width: '100%',
        padding: '2.5rem',
        textAlign: 'center',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        borderRadius: 24
      }}>
        <div style={{ margin: '0 auto 1.5rem' }}>
          <SchoolLogo size={80} showText={true} textColor="var(--text-main)" />
        </div>
        
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 800 }}>
          {isRTL ? 'مرحباً بعودتك' : 'Welcome Back'}
        </h1>
        <p style={{ color: 'var(--text-sec)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          {isRTL ? 'سجل الدخول للمتابعة إلى نظام GMIS CRM' : 'Sign in to continue to GMIS CRM'}
        </p>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            padding: '12px', 
            borderRadius: '12px', 
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: 16, color: 'var(--text-sec)' }}>
              <Mail size={20} />
            </div>
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={isRTL ? 'البريد الإلكتروني' : 'Email Address'}
              className="form-input"
              style={{ width: '100%', padding: isRTL ? '14px 48px 14px 16px' : '14px 16px 14px 48px', background: 'rgba(255,255,255,0.03)' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: 16, color: 'var(--text-sec)' }}>
              <Lock size={20} />
            </div>
            <input
              type="password"
              required
              placeholder={isRTL ? 'كلمة المرور' : 'Password'}
              className="form-input"
              style={{ width: '100%', padding: isRTL ? '14px 48px 14px 16px' : '14px 16px 14px 48px', background: 'rgba(255,255,255,0.03)' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
            style={{ width: '100%', padding: '14px', marginTop: '1rem', justifyContent: 'center', fontSize: '1rem' }}
          >
            {isLoading ? (
              <span className="spinner" style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <LogIn size={20} />
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              </>
            )}
          </button>
        </form>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    </div>
  );
};

export default Login;
