import React, { useState, useEffect } from 'react';
import { Bot, Bell, Globe, Save, MessageCircle, CheckCircle, XCircle, Share2, Image as ImageIcon, Cloud } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';

const Settings: React.FC = () => {
  const { isRTL, language, setLanguage } = useI18n();
  const [aiName, setAiName] = useState('نور — مساعدة GMIS');
  const [aiLang, setAiLang] = useState('ar');
  const [autoReply, setAutoReply] = useState(true);
  const [followUp, setFollowUp] = useState(true);
  const [followUpDelay, setFollowUpDelay] = useState('24');
  const [notifNew, setNotifNew] = useState(true);
  const [notifHot, setNotifHot] = useState(true);
  const [adminEmail, setAdminEmail] = useState('admin@gmis.edu');
  const [aiScheduled, setAiScheduled] = useState(false);
  const [aiStartTime, setAiStartTime] = useState('08:00');
  const [aiEndTime, setAiEndTime] = useState('17:00');
  
  // Facebook Dynamic Integration States
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [showFbInput, setShowFbInput] = useState(false);
  const [fbTokenInput, setFbTokenInput] = useState('');
  const [isSavingFb, setIsSavingFb] = useState(false);

  // Instagram Dynamic Integration States
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [showIgInput, setShowIgInput] = useState(false);
  const [igTokenInput, setIgTokenInput] = useState('');
  const [isSavingIg, setIsSavingIg] = useState(false);

  // WhatsApp Multi-Account Integration States
  const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
  const [showWaInput, setShowWaInput] = useState(false);
  const [waNameInput, setWaNameInput] = useState('');
  const [waTokenInput, setWaTokenInput] = useState('');
  const [waPhoneIdInput, setWaPhoneIdInput] = useState('');
  const [isSavingWa, setIsSavingWa] = useState(false);

  // Wix Chat Integration States
  const [wixConnected, setWixConnected] = useState(false);
  const [showWixInput, setShowWixInput] = useState(false);
  const [wixTokenInput, setWixTokenInput] = useState('');
  const [isSavingWix, setIsSavingWix] = useState(false);

  // Google Drive Credentials upload states
  const [isUploadingCreds, setIsUploadingCreds] = useState(false);
  const [uploadCredsStatus, setUploadCredsStatus] = useState('');

  const handleCredentialsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingCreds(true);
      setUploadCredsStatus(isRTL ? 'جاري الرفع...' : 'Uploading...');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch(`${API_URL}/api/settings/google-drive-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: reader.result
            })
          });
          const data = await res.json();
          if (data.success) {
            setUploadCredsStatus(isRTL ? '✅ تم رفع ملف الاعتمادات بنجاح!' : '✅ Credentials uploaded successfully!');
          } else {
            setUploadCredsStatus(isRTL ? `❌ فشل الرفع: ${data.error}` : `❌ Upload failed: ${data.error}`);
          }
        } catch (err: any) {
          setUploadCredsStatus(isRTL ? `❌ خطأ في الاتصال: ${err.message}` : `❌ Network error: ${err.message}`);
        } finally {
          setIsUploadingCreds(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch initial config status
  useEffect(() => {
    fetch(`${API_URL}/api/settings/facebook`).then(res => res.json()).then(data => setFacebookConnected(!!data.connected)).catch(err => console.error(err));
    fetch(`${API_URL}/api/settings/instagram`).then(res => res.json()).then(data => setInstagramConnected(!!data.connected)).catch(err => console.error(err));
    fetch(`${API_URL}/api/settings/wix`).then(res => res.json()).then(data => setWixConnected(!!data.connected)).catch(err => console.error(err));
    fetch(`${API_URL}/api/settings/whatsapp`).then(res => res.json()).then(data => {
      if (data.accounts) setWhatsappAccounts(data.accounts);
    }).catch(err => console.error(err));
  }, []);

  const handleConnect = async (channel: string, isConnected: boolean, setConnected: any, setShowInput: any) => {
    if (isConnected) {
      try {
        await fetch(`${API_URL}/api/settings/${channel}/disconnect`, { method: 'POST' });
        setConnected(false);
        setShowInput(false);
      } catch (err) { console.error('Error disconnecting:', err); }
    } else {
      setShowInput(true);
    }
  };

  const handleSaveToken = async (channel: string, bodyData: any, setConnected: any, setShowInput: any, setIsSaving: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (data.success) {
        setConnected(true);
        setShowInput(false);
      }
    } catch (err) { console.error('Error saving token:', err); }
    setIsSaving(false);
  };

  useEffect(() => {
    fetch(`${API_URL}/api/settings/ai`).then(res => res.json()).then(data => {
      setAutoReply(!!data.autoReply);
      setFollowUp(!!data.followUp);
      if(data.aiName) setAiName(data.aiName);
      if(data.aiLang) setAiLang(data.aiLang);
      if(data.followUpDelay) setFollowUpDelay(data.followUpDelay);
      if(data.admin_email) setAdminEmail(data.admin_email);
      if(data.ai?.scheduled) setAiScheduled(data.ai.scheduled);
      if(data.ai?.startTime) setAiStartTime(data.ai.startTime);
      if(data.ai?.endTime) setAiEndTime(data.ai.endTime);
    }).catch(console.error);
  }, []);

  const handleSaveGlobal = () => {
    fetch(`${API_URL}/api/settings/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        autoReply, followUp, aiName, aiLang, followUpDelay, 
        admin_email: adminEmail,
        ai: { scheduled: aiScheduled, startTime: aiStartTime, endTime: aiEndTime }
      })
    }).then(() => alert(isRTL ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved!'));
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <div onClick={onChange} style={{
      width: 48, height: 26, borderRadius: 99, cursor: 'pointer',
      background: value ? 'var(--secondary)' : '#e2e8f0', position: 'relative',
      transition: 'all 0.3s',
      boxShadow: value ? '0 0 16px rgba(20,195,93,0.3)' : 'none',
      flexShrink: 0
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: value ? 24 : 4, transition: 'left 0.3s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{label}</span>
      {children}
    </div>
  );

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="card animate-up" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(0,28,94,0.07)', borderRadius: 10, padding: 10, color: 'var(--primary)' }}>
          <Icon size={20} />
        </div>
        <h3 className="section-title">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 700, margin: '0 auto' }}>
      <div className="animate-up">
        <h1 className="page-title">{isRTL ? 'الإعدادات' : 'Settings'}</h1>
        <p className="page-subtitle">{isRTL ? 'تخصيص نظام CRM والمساعد الذكي' : 'Customize your CRM and AI agent'}</p>
      </div>

      {/* Social Media Integration */}
      <Section icon={Globe} title={isRTL ? '📱 ربط المنصات (Social Media)' : '📱 Social Media Integrations'}>
        <Row label={isRTL ? "حسابات واتساب بزنس" : "WhatsApp Business Accounts"}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
            {whatsappAccounts.map((acc, i) => (
              <div key={i} className="animate-up" style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                background: 'rgba(37, 211, 102, 0.08)', padding: '10px 15px', borderRadius: '12px',
                border: '1px solid rgba(37, 211, 102, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MessageCircle size={18} style={{ color: '#25D366' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>ID: {acc.phone_number_id}</div>
                  </div>
                </div>
                <button 
                  className="btn-outline" 
                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#f87171', color: '#f87171' }}
                  onClick={async () => {
                    if(confirm(isRTL ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Delete this account?')) {
                      await fetch(`${API_URL}/api/settings/whatsapp/disconnect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ account_id: acc.id })
                      });
                      setWhatsappAccounts(prev => prev.filter(a => a.id !== acc.id));
                    }
                  }}
                >
                  {isRTL ? 'حذف' : 'Delete'}
                </button>
              </div>
            ))}

            {whatsappAccounts.length < 4 && !showWaInput && (
              <button 
                className="btn btn-primary" 
                style={{ background: '#25D366', borderColor: '#25D366', alignSelf: 'flex-start', marginTop: 5 }}
                onClick={() => setShowWaInput(true)}
              >
                {isRTL ? '+ إضافة رقم جديد' : '+ Add New Number'}
              </button>
            )}

            {showWaInput && (
              <div style={{ 
                display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', 
                background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed #25D366',
                marginTop: 10
              }}>
                <input 
                  type="text" placeholder={isRTL ? "اسم الحساب (مثلاً: فريق المبيعات)" : "Account Name (e.g. Sales)"}
                  className="form-input" value={waNameInput} onChange={e => setWaNameInput(e.target.value)}
                />
                <input 
                  type="text" placeholder="Phone Number ID"
                  className="form-input" value={waPhoneIdInput} onChange={e => setWaPhoneIdInput(e.target.value)}
                />
                <input 
                  type="text" placeholder="Access Token"
                  className="form-input" value={waTokenInput} onChange={e => setWaTokenInput(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setShowWaInput(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
                  <button 
                    className="btn btn-primary" 
                    style={{ background: '#25D366', borderColor: '#25D366' }}
                    disabled={isSavingWa || !waNameInput || !waPhoneIdInput || !waTokenInput}
                    onClick={async () => {
                      setIsSavingWa(true);
                      const res = await fetch(`${API_URL}/api/settings/whatsapp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          is_multi: true,
                          name: waNameInput,
                          phone_number_id: waPhoneIdInput,
                          access_token: waTokenInput
                        })
                      });
                      const data = await res.json();
                      if (data.success) {
                        setWhatsappAccounts(prev => [...prev, { id: waPhoneIdInput, name: waNameInput, phone_number_id: waPhoneIdInput }]);
                        setShowWaInput(false);
                        setWaNameInput(''); setWaPhoneIdInput(''); setWaTokenInput('');
                      }
                      setIsSavingWa(false);
                    }}
                  >
                    {isSavingWa ? '...' : (isRTL ? 'ربط الآن' : 'Connect Now')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Row>
        
        <Row label="Facebook Page">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {facebookConnected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={16} /> {isRTL ? 'متصل' : 'Connected'}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                  <XCircle size={16} /> {isRTL ? 'غير متصل' : 'Disconnected'}
                </span>
              )}
              <button 
                className={`btn ${facebookConnected ? 'btn-outline' : 'btn-primary'}`} 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: facebookConnected ? '' : '#1877F2', borderColor: facebookConnected ? '' : '#1877F2', color: facebookConnected ? '' : '#fff' }}
                onClick={() => handleConnect('facebook', facebookConnected, setFacebookConnected, setShowFbInput)}
              >
                <Share2 size={14} />
                {facebookConnected ? (isRTL ? 'إلغاء الربط' : 'Disconnect') : (isRTL ? 'ربط الحساب' : 'Connect')}
              </button>
            </div>
            
            {showFbInput && !facebookConnected && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', animation: 'fadeIn 0.3s' }}>
                <input 
                  type="text" 
                  placeholder="Page Access Token..." 
                  className="form-input" 
                  style={{ width: '250px', padding: '6px 12px', fontSize: '0.85rem' }}
                  value={fbTokenInput}
                  onChange={(e) => setFbTokenInput(e.target.value)}
                />
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => handleSaveToken('facebook', { page_access_token: fbTokenInput }, setFacebookConnected, setShowFbInput, setIsSavingFb)}
                  disabled={isSavingFb || !fbTokenInput}
                >
                  {isSavingFb ? '...' : (isRTL ? 'حفظ' : 'Save')}
                </button>
              </div>
            )}
          </div>
        </Row>
        
        <Row label="Instagram Profile">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {instagramConnected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={16} /> {isRTL ? 'متصل' : 'Connected'}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                  <XCircle size={16} /> {isRTL ? 'غير متصل' : 'Disconnected'}
                </span>
              )}
              <button 
                className={`btn ${instagramConnected ? 'btn-outline' : 'btn-primary'}`} 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: instagramConnected ? '' : 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', borderColor: instagramConnected ? '' : 'transparent', color: instagramConnected ? '' : '#fff' }}
                onClick={() => handleConnect('instagram', instagramConnected, setInstagramConnected, setShowIgInput)}
              >
                <ImageIcon size={14} />
                {instagramConnected ? (isRTL ? 'إلغاء الربط' : 'Disconnect') : (isRTL ? 'ربط الحساب' : 'Connect')}
              </button>
            </div>

            {showIgInput && !instagramConnected && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', animation: 'fadeIn 0.3s' }}>
                <input 
                  type="text" 
                  placeholder="Instagram Token..." 
                  className="form-input" 
                  style={{ width: '250px', padding: '6px 12px', fontSize: '0.85rem' }}
                  value={igTokenInput}
                  onChange={(e) => setIgTokenInput(e.target.value)}
                />
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => handleSaveToken('instagram', { page_access_token: igTokenInput }, setInstagramConnected, setShowIgInput, setIsSavingIg)}
                  disabled={isSavingIg || !igTokenInput}
                >
                  {isSavingIg ? '...' : (isRTL ? 'حفظ' : 'Save')}
                </button>
              </div>
            )}
          </div>
        </Row>

        <Row label={isRTL ? "محادثات ويكس (Wix Chat)" : "Wix Chat"}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {wixConnected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={16} /> {isRTL ? 'متصل' : 'Connected'}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                  <XCircle size={16} /> {isRTL ? 'غير متصل' : 'Disconnected'}
                </span>
              )}
              <button 
                className={`btn ${wixConnected ? 'btn-outline' : 'btn-primary'}`} 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: wixConnected ? '' : '#FF4F00', borderColor: wixConnected ? '' : 'transparent', color: wixConnected ? '' : '#fff' }}
                onClick={() => handleConnect('wix', wixConnected, setWixConnected, setShowWixInput)}
              >
                <Share2 size={14} />
                {wixConnected ? (isRTL ? 'إلغاء الربط' : 'Disconnect') : (isRTL ? 'ربط الحساب' : 'Connect')}
              </button>
            </div>

            {showWixInput && !wixConnected && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', animation: 'fadeIn 0.3s' }}>
                <input 
                  type="text" 
                  placeholder="Wix API Key / Site ID..." 
                  className="form-input" 
                  style={{ width: '250px', padding: '6px 12px', fontSize: '0.85rem' }}
                  value={wixTokenInput}
                  onChange={(e) => setWixTokenInput(e.target.value)}
                />
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => handleSaveToken('wix', { page_access_token: wixTokenInput }, setWixConnected, setShowWixInput, setIsSavingWix)}
                  disabled={isSavingWix || !wixTokenInput}
                >
                  {isSavingWix ? '...' : (isRTL ? 'حفظ' : 'Save')}
                </button>
              </div>
            )}
          </div>
        </Row>
      </Section>

      {/* AI Agent */}
      <Section icon={Bot} title={isRTL ? '🤖 إعدادات المساعد الذكي' : '🤖 AI Agent Settings'}>
        <Row label={isRTL ? 'اسم المساعد' : 'Agent Name'}>
          <input className="form-input" style={{ width: 220, textAlign: isRTL ? 'right' : 'left' }} value={aiName} onChange={e => setAiName(e.target.value)} />
        </Row>
        <Row label={isRTL ? 'لغة الرد الأساسية' : 'Primary Response Language'}>
          <select className="form-input" style={{ width: 180 }} value={aiLang} onChange={e => setAiLang(e.target.value)}>
            <option value="ar">{isRTL ? 'العربية المصرية' : 'Egyptian Arabic'}</option>
            <option value="ar-sa">{isRTL ? 'العربية السعودية' : 'Saudi Arabic'}</option>
            <option value="ar-sd">{isRTL ? 'العربية السودانية' : 'Sudanese Arabic'}</option>
            <option value="en">{isRTL ? 'الإنجليزية' : 'English'}</option>
            <option value="both">{isRTL ? 'الاثنتان' : 'Both'}</option>
          </select>
        </Row>
        <Row label={isRTL ? 'الرد التلقائي على الرسائل' : 'Auto-reply to messages'}>
          <Toggle value={autoReply} onChange={() => setAutoReply(!autoReply)} />
        </Row>
        <Row label={isRTL ? 'متابعة العملاء تلقائياً' : 'Automatic lead follow-up'}>
          <Toggle value={followUp} onChange={() => setFollowUp(!followUp)} />
        </Row>
        {followUp && (
          <Row label={isRTL ? 'تأخير المتابعة (ساعات)' : 'Follow-up delay (hours)'}>
            <select className="form-input" style={{ width: 120 }} value={followUpDelay} onChange={e => setFollowUpDelay(e.target.value)}>
              {['1','3','6','12','24','48','72'].map(v => <option key={v} value={v}>{v} {isRTL ? 'ساعة' : 'hrs'}</option>)}
            </select>
          </Row>
        )}
        <Row label={isRTL ? 'تفعيل جدول العمل للذكاء الاصطناعي' : 'Enable AI Work Schedule'}>
          <Toggle value={aiScheduled} onChange={() => setAiScheduled(!aiScheduled)} />
        </Row>
        {aiScheduled && (
          <div style={{ padding: '0 0 14px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isRTL ? 'من:' : 'From:'}</span>
            <input type="time" className="form-input" style={{ width: 120 }} value={aiStartTime} onChange={e => setAiStartTime(e.target.value)} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isRTL ? 'إلى:' : 'To:'}</span>
            <input type="time" className="form-input" style={{ width: 120 }} value={aiEndTime} onChange={e => setAiEndTime(e.target.value)} />
          </div>
        )}
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title={isRTL ? '🔔 الإشعارات' : '🔔 Notifications'}>
        <Row label={isRTL ? 'البريد الإلكتروني للإشعارات' : 'Notification Email'}>
          <input className="form-input" style={{ width: 220 }} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
        </Row>
        <Row label={isRTL ? 'إشعار عند وصول عميل جديد' : 'Notify on new lead'}><Toggle value={notifNew} onChange={() => setNotifNew(!notifNew)} /></Row>
        <Row label={isRTL ? 'إشعار العملاء الساخنين' : 'Hot lead alerts'}><Toggle value={notifHot} onChange={() => setNotifHot(!notifHot)} /></Row>
      </Section>

      {/* Language */}
      <Section icon={Globe} title={isRTL ? '🌐 واجهة المستخدم' : '🌐 Interface Language'}>
        <Row label={isRTL ? 'لغة الواجهة' : 'UI Language'}>
          <div className="tab-group">
            <button className={`tab-btn${language === 'ar' ? ' active' : ''}`} onClick={() => setLanguage('ar')}>العربية</button>
            <button className={`tab-btn${language === 'en' ? ' active' : ''}`} onClick={() => setLanguage('en')}>English</button>
          </div>
        </Row>
      </Section>

      {/* Google Drive Credentials Section */}
      <Section icon={Cloud} title={isRTL ? '☁️ إعدادات جوجل درايف (Google Drive)' : '☁️ Google Drive Integration'}>
        <Row label={isRTL ? 'ملف مفتاح حساب الخدمة (Service Account Key)' : 'Service Account Key File (.json)'}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, width: '100%', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flex: 1, minWidth: 200, textAlign: 'start' }}>
                {isRTL ? 'ارفع ملف google_drive_credentials.json هنا لتفعيل التكامل التلقائي للطلاب.' : 'Upload google_drive_credentials.json to enable automatic folder uploads.'}
              </span>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => document.getElementById('drive-creds-input')?.click()}
                disabled={isUploadingCreds}
              >
                {isUploadingCreds ? '...' : (isRTL ? 'اختيار الملف' : 'Choose File')}
              </button>
              <input 
                id="drive-creds-input"
                type="file" 
                accept=".json" 
                style={{ display: 'none' }} 
                onChange={handleCredentialsUpload}
              />
            </div>
            {uploadCredsStatus && (
              <span style={{ fontSize: '0.75rem', color: uploadCredsStatus.includes('✅') ? 'var(--secondary)' : '#ef4444', fontWeight: 700 }}>
                {uploadCredsStatus}
              </span>
            )}
          </div>
        </Row>
      </Section>

      {/* Save */}
      <div className="animate-up delay-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-outline">{isRTL ? 'إعادة الضبط' : 'Reset'}</button>
        <button className="btn btn-primary" onClick={handleSaveGlobal}>
          <Save size={16} />{isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
