import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Send, Bot,
  MoreVertical, Paperclip, Smile, Clock, MessageCircle, X
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';
import { io } from 'socket.io-client';
import { useToast, ToastContainer } from '../hooks/useToast';
import { NATIONALITIES } from '../services/nationalities';

type Channel = 'whatsapp' | 'facebook' | 'instagram' | 'web';

interface Lead {
  id: string; // The PSID or Phone Number
  name: string;
  channel: Channel;
  lastMsg: string;
  time: string;
  unread: number;
  status: string;
}

interface Message {
  id: string;
  text: string;
  image?: string;
  from: 'lead' | 'agent' | 'ai';
  time: string;
  receiver_id?: string;
  receiver_name?: string;
}

const channelLabel: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Messenger',
  instagram: 'Instagram',
  web: 'Web',
};
const channelClass: Record<Channel, string> = {
  whatsapp: 'channel-wa',
  facebook: 'channel-fb',
  instagram: 'channel-ig',
  web: 'channel-web',
};
const statusPill: Record<string, string> = {
  'جديد': 'pill pill-new',
  'مهتم': 'pill pill-hot',
  'متابعة': 'pill pill-interest',
  'Hot': 'pill pill-hot',
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

interface InboxProps {
  onNavigate?: (tab: string, leadId?: string) => void;
}

const Inbox: React.FC<InboxProps> = ({ onNavigate }) => {
  const { isRTL } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toasts, showToast, removeToast } = useToast();

  // CRM details & Toggles
  const [crmLeads, setCrmLeads] = useState<any[]>([]);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showSidebarDesktop, setShowSidebarDesktop] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: '',
    phone: '',
    grade: '',
    studentNationality: '',
    studentPassport: '',
    parentName: '',
    parentNationality: '',
    parentPassport: '',
    address: '',
    email: '',
    notes: ''
  });

  // Refs for socket callbacks and container tracking
  const selectedLeadRef = useRef<Lead | null>(selectedLead);
  const crmLeadsRef = useRef<any[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedLeadRef.current = selectedLead;
  }, [selectedLead]);

  useEffect(() => {
    crmLeadsRef.current = crmLeads;
  }, [crmLeads]);

  const handleSendRegistrationLink = async () => {
    if (!selectedLead) return;
    const link = `${window.location.origin}/apply`;
    const text = isRTL 
      ? `مرحباً، يمكنك تعبئة استمارة التسجيل الخاصة بمدارسنا عبر هذا الرابط:\n${link}`
      : `Hello, you can fill out the registration form for our school using this link:\n${link}`;
      
    const userMsg: Message = { 
      id: `link_${Date.now()}`, 
      text: text, 
      from: 'agent', 
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) 
    };

    // Optimistically update UI
    setMessagesMap(prev => ({
      ...prev,
      [selectedLead.id]: [...(prev[selectedLead.id] || []), userMsg]
    }));
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, lastMsg: text, time: userMsg.time } : l));

    try {
      await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userMsg.id,
          recipient_id: selectedLead.id,
          text: userMsg.text,
          channel: selectedLead.channel
        })
      });
      showToast(
        isRTL ? '✅ تم إرسال رابط التقديم للعميل' : '✅ Registration link sent to client',
        isRTL ? 'تم إرسال الرابط بنجاح' : 'Link has been sent successfully'
      );
    } catch (err) {
      console.error('Error sending link:', err);
    }
  };

  const handleSendBookingLink = async () => {
    if (!selectedLead) return;
    const link = `${window.location.origin}/book`;
    const text = isRTL 
      ? `مرحباً، يمكنك حجز موعد زيارتك ومقابلتك معنا مباشرة عبر هذا الرابط:\n${link}`
      : `Hello, you can book your visit and interview slot with us directly using this link:\n${link}`;
      
    const userMsg: Message = { 
      id: `link_${Date.now()}`, 
      text: text, 
      from: 'agent', 
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) 
    };

    setMessagesMap(prev => ({
      ...prev,
      [selectedLead.id]: [...(prev[selectedLead.id] || []), userMsg]
    }));
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, lastMsg: text, time: userMsg.time } : l));

    try {
      await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userMsg.id,
          recipient_id: selectedLead.id,
          text: userMsg.text,
          channel: selectedLead.channel
        })
      });
      showToast(
        isRTL ? '📅 تم إرسال رابط حجز الزيارة للعميل' : '📅 Booking link sent to client',
        isRTL ? 'تم إرسال الرابط بنجاح' : 'Link has been sent successfully'
      );
    } catch (err) {
      console.error('Error sending booking link:', err);
    }
  };

  const crmLead = selectedLead ? crmLeads.find(l => isPhoneMatch(l.phone, selectedLead.id) || l.id === selectedLead.id) : null;
  const isAiActive = crmLead ? (crmLead.ai_enabled !== 0) : true;
  const isFollowUpActive = crmLead ? (crmLead.follow_up !== 0) : true;

  const handleToggleAi = async () => {
    if (!crmLead) return;
    const newVal = isAiActive ? 0 : 1;
    setCrmLeads(prev => prev.map(l => l.id === crmLead.id ? { ...l, ai_enabled: newVal } : l));
    try {
      await axios.post(`${API_URL}/api/leads/${crmLead.id}/settings`, {
        ai_enabled: newVal,
        follow_up: crmLead.follow_up
      });
      showToast(
        isRTL ? '🤖 تم تحديث إعدادات الذكاء الاصطناعي' : '🤖 AI settings updated',
        isRTL ? `تم ${newVal ? 'تفعيل' : 'إيقاف'} الرد التلقائي` : `Auto-reply has been ${newVal ? 'enabled' : 'disabled'}`
      );
    } catch (err) {
      console.error(err);
      setCrmLeads(prev => prev.map(l => l.id === crmLead.id ? { ...l, ai_enabled: crmLead.ai_enabled } : l));
    }
  };

  const handleToggleFollowUp = async () => {
    if (!crmLead) return;
    const newVal = isFollowUpActive ? 0 : 1;
    setCrmLeads(prev => prev.map(l => l.id === crmLead.id ? { ...l, follow_up: newVal } : l));
    try {
      await axios.post(`${API_URL}/api/leads/${crmLead.id}/settings`, {
        ai_enabled: crmLead.ai_enabled,
        follow_up: newVal
      });
      showToast(
        isRTL ? '🔁 تم تحديث إعدادات المتابعة الدورية' : '🔁 Follow-up settings updated',
        isRTL ? `تم ${newVal ? 'تفعيل' : 'إيقاف'} المتابعة الدورية` : `Periodic follow-up has been ${newVal ? 'enabled' : 'disabled'}`
      );
    } catch (err) {
      console.error(err);
      setCrmLeads(prev => prev.map(l => l.id === crmLead.id ? { ...l, follow_up: crmLead.follow_up } : l));
    }
  };

  const handleQuickAddSubmit = () => {
    if (!quickForm.name.trim() || !quickForm.phone.trim()) return;
    const lead = {
      id: Date.now().toString(),
      name: quickForm.name,
      phone: quickForm.phone,
      channel: selectedLead?.channel || 'whatsapp',
      grade: quickForm.grade,
      score: 80,
      status: 'new',
      notes: quickForm.notes,
      student_nationality: quickForm.studentNationality,
      student_passport: quickForm.studentPassport,
      parent_name: quickForm.parentName,
      parent_nationality: quickForm.parentNationality,
      parent_passport: quickForm.parentPassport,
      address: quickForm.address,
      email: quickForm.email,
      ai_enabled: 1,
      follow_up: 1
    };

    axios.post(`${API_URL}/api/leads`, lead)
      .then(() => {
        setShowQuickAdd(false);
        axios.get(`${API_URL}/api/leads`).then(res => {
          setCrmLeads(res.data);
          showToast(
            isRTL ? '✅ تم إضافة العميل للـ CRM بنجاح' : '✅ Lead added to CRM successfully',
            isRTL ? 'تم تسجيل البيانات وربطها بالمحادثة' : 'Lead details saved and linked to chat'
          );
        });
      })
      .catch(console.error);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom instantly when selectedLead.id changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [selectedLead?.id]);

  // Smart scrolling on messages map updates
  useEffect(() => {
    if (!selectedLead || !messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    const leadMsgs = messagesMap[selectedLead.id] || [];
    if (leadMsgs.length === 0) return;
    
    const lastMsg = leadMsgs[leadMsgs.length - 1];
    const isFromMe = lastMsg.from === 'agent' || lastMsg.from === 'ai';
    
    if (isNearBottom || isFromMe) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesMap]);

  useEffect(() => {
    const newSocket = io(API_URL);

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const user = JSON.parse(localStorage.getItem('gmis_user') || '{}');
    // 1. Fetch CRM Leads
    axios.get(`${API_URL}/api/leads?userId=${user.id}&role=${user.role}`).then(crmRes => {
      const crmList = crmRes.data;
      setCrmLeads(crmList);

      const findName = (psid: string) => {
        const found = crmList.find((l: any) => isPhoneMatch(l.phone, psid) || l.id === psid);
        return found ? found.name : `User ${psid.slice(-4)}`;
      };
      
      const findStatus = (psid: string) => {
        const found = crmList.find((l: any) => isPhoneMatch(l.phone, psid) || l.id === psid);
        return found ? found.status : 'جديد';
      };

      // 2. Fetch messages
      axios.get(`${API_URL}/api/messages?userId=${user.id}&role=${user.role}`).then(res => {
        const msgs = res.data;
        const initialMap: Record<string, Message[]> = {};
        const initialLeads: Lead[] = [];
        
        msgs.forEach((m: any) => {
          if (!initialMap[m.sender_psid]) {
            initialMap[m.sender_psid] = [];
            initialLeads.push({
              id: m.sender_psid,
              name: findName(m.sender_psid),
              channel: m.channel as Channel,
              lastMsg: m.text,
              time: m.time,
              unread: 0,
              status: findStatus(m.sender_psid)
            });
          }
          initialMap[m.sender_psid].push({ 
            id: m.id, 
            text: m.text, 
            image: m.image,
            from: m.receiver_id === 'system' || m.sender_psid === 'system' ? 'ai' : (m.receiver_id === 'agent' ? 'agent' : 'lead'), 
            time: m.time,
            receiver_id: m.receiver_id,
            receiver_name: m.receiver_name
          });
          const l = initialLeads.find(x => x.id === m.sender_psid);
          if (l) { l.lastMsg = m.text; l.time = m.time; }
        });
        
        setMessagesMap(initialMap);
        setLeads(initialLeads.reverse());
      });
    }).catch(console.error);

    newSocket.on('new_message', (data: any) => {
      if (!data || !data.sender_psid) return;
      const isIncoming = data.receiver_id !== 'agent' && data.receiver_id !== 'system' && data.sender_psid !== 'system' && data.from !== 'ai' && data.from !== 'agent';

      setLeads(prevLeads => {
        const existing = prevLeads.find(l => l.id === data.sender_psid);
        
        const foundCrm = crmLeadsRef.current.find(x => isPhoneMatch(x.phone, data.sender_psid) || x.id === data.sender_psid);
        const name = foundCrm ? foundCrm.name : `User ${data.sender_psid.slice(-4)}`;
        const status = foundCrm ? foundCrm.status : 'جديد';

        if (existing) {
          return prevLeads.map(l => l.id === data.sender_psid ? { ...l, name, lastMsg: data.text, time: data.time, unread: selectedLeadRef.current?.id === l.id || !isIncoming ? l.unread : l.unread + 1 } : l);
        } else {
          return [{
            id: data.sender_psid,
            name,
            channel: data.channel,
            lastMsg: data.text,
            time: data.time,
            unread: selectedLeadRef.current?.id === data.sender_psid || !isIncoming ? 0 : 1,
            status
          }, ...prevLeads];
        }
      });

      if (isIncoming) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.play().catch(() => {});

        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(isRTL ? 'رسالة جديدة' : 'New Message', {
            body: data.text,
            icon: '/favicon.ico'
          });
        }
      }

      setMessagesMap(prev => {
        const list = prev[data.sender_psid] || [];
        if (list.some(m => m.id === data.id)) {
          return prev;
        }
        return {
          ...prev,
          [data.sender_psid]: [
            ...list,
            { 
              id: data.id, 
              text: data.text, 
              image: data.image,
              from: data.receiver_id === 'system' || data.sender_psid === 'system' ? 'ai' : (data.receiver_id === 'agent' ? 'agent' : 'lead'),
              time: data.time,
              receiver_id: data.receiver_id,
              receiver_name: data.receiver_name
            }
          ]
        };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const send = async () => {
    if (!input.trim() || !selectedLead) return;
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      text: input, 
      from: 'agent', 
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) 
    };

    // Optimistically update UI
    setMessagesMap(prev => ({
      ...prev,
      [selectedLead.id]: [...(prev[selectedLead.id] || []), userMsg]
    }));
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, lastMsg: input, time: userMsg.time } : l));
    setInput('');

    // Send to Backend
    try {
      await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userMsg.id,
          recipient_id: selectedLead.id,
          text: userMsg.text,
          channel: selectedLead.channel
        })
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowSidebarMobile(false);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, unread: 0 } : l));
  };

  const activeMessages = selectedLead ? (messagesMap[selectedLead.id] || []) : [];
  const showList = !isMobile || selectedLead === null;
  const showChat = !isMobile || selectedLead !== null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : (selectedLead && showSidebarDesktop ? '300px 1fr 280px' : '300px 1fr'),
      height: 'calc(100vh - var(--topbar-h) - 5rem)',
      gap: '1.25rem',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>

      {/* ── Conversations List ── */}
      {showList && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="section-title">{isRTL ? 'الرسائل' : 'Messages'}</span>
              <span style={{ background: '#14C35D', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99 }}>
                {leads.reduce((sum, l) => sum + l.unread, 0)} {isRTL ? 'جديد' : 'new'}
              </span>
            </div>
            {/* Channel Filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'whatsapp', 'facebook', 'instagram'] as const).map((ch, i) => (
                <button key={i} className={`channel-badge ${ch === 'all' ? 'channel-web' : channelClass[ch as Channel]}`} style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}>
                  {ch === 'all' ? (isRTL ? 'الكل' : 'All') : channelLabel[ch as Channel]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leads.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                {isRTL ? 'لا توجد رسائل بعد. جرب إرسال رسالة من فيسبوك أو واتساب.' : 'No messages yet. Send a message to your page.'}
              </div>
            ) : leads.map((l) => (
              <div
                key={l.id}
                onClick={() => handleSelectLead(l)}
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: selectedLead?.id === l.id ? 'rgba(0,28,94,0.04)' : 'transparent',
                  borderInlineStart: selectedLead?.id === l.id ? '3px solid var(--secondary)' : '3px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div className="avatar" style={{ width: 42, height: 42, fontSize: '0.85rem', flexShrink: 0 }}>
                  {l.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{l.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {l.unread > 0 && (
                        <span className="pulse-red" style={{ 
                          background: '#ef4444', color: '#fff', 
                          borderRadius: 99, minWidth: 18, height: 18, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '0.65rem', fontWeight: 900,
                          boxShadow: '0 0 10px rgba(239,68,68,0.5)'
                        }}>
                          {l.unread}
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, whiteSpace: 'nowrap' }}>{l.time}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{l.lastMsg}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                    <span className={`channel-badge ${channelClass[l.channel]}`} style={{ fontSize: '0.62rem' }}>{channelLabel[l.channel]}</span>
                    <span className={statusPill[l.status] || 'pill pill-cold'} style={{ fontSize: '0.62rem' }}>{l.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Chat Window ── */}
      {showChat && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, height: '100%' }}>
          {selectedLead ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                {isMobile && (
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0, marginInlineEnd: 6 }}
                    onClick={() => setSelectedLead(null)}
                  >
                    {isRTL ? '→' : '←'}
                  </button>
                )}
                <div className="avatar" style={{ width: 44, height: 44, fontSize: '0.95rem', flexShrink: 0 }}>{selectedLead.name.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)', cursor: onNavigate ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => onNavigate && onNavigate('crm', selectedLead.id)}
                    title={onNavigate ? (isRTL ? 'عرض ملف العميل في CRM' : 'View lead profile in CRM') : ''}
                  >
                    {selectedLead.name}
                    {onNavigate && <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>{isRTL ? 'CRM ←' : '→ CRM'}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                    <span className={`channel-badge ${channelClass[selectedLead.channel]}`} style={{ fontSize: '0.68rem' }}>{channelLabel[selectedLead.channel]}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>ID: {selectedLead.id}</span>
                  </div>
                </div>
                {/* Header Options / Settings Sidebar Trigger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ padding: 8 }} 
                    onClick={() => {
                      if (isMobile) {
                        setShowSidebarMobile(!showSidebarMobile);
                      } else {
                        setShowSidebarDesktop(!showSidebarDesktop);
                      }
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activeMessages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'lead' ? 'flex-start' : 'flex-end' }}>
                    {m.from === 'ai' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ background: '#d1fae5', borderRadius: 6, padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Bot size={12} color="#059669" />
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669' }}>AI</span>
                        </div>
                      </div>
                    )}
                    {m.from === 'lead' && m.receiver_name && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#25D366', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MessageCircle size={10} /> {isRTL ? 'مستلم على:' : 'On:'} {m.receiver_name}
                      </div>
                    )}
                    <div className={`bubble ${m.from === 'lead' ? 'bubble-in' : m.from === 'ai' ? 'bubble-ai' : 'bubble-out'}`}
                      style={{ whiteSpace: 'pre-line' }}>
                      {m.image && (
                        <div style={{ marginBottom: 8 }}>
                          <img 
                            src={m.image} 
                            alt="Media" 
                            style={{ maxWidth: '100%', borderRadius: 8, cursor: 'pointer', display: 'block' }} 
                            onClick={() => window.open(m.image, '_blank')}
                          />
                        </div>
                      )}
                      {m.text}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-light)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} />{m.time}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: '#fafafa' }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: 8, flexShrink: 0 }} onClick={() => showToast(isRTL ? '📎 إرسال الملفات قريباً' : '📎 File upload coming soon', isRTL ? 'إرسال الصور والمستندات سيكون متاحاً قريباً' : 'Image and document sending will be available soon')}><Paperclip size={18} /></button>
                <button className="btn btn-ghost btn-sm" style={{ padding: 8, flexShrink: 0 }} onClick={() => showToast(isRTL ? '😊 الإيموجي قريباً' : '😊 Emoji picker coming soon', isRTL ? 'لوحة الإيموجي ستتوفر قريباً' : 'Emoji panel will be available soon')}><Smile size={18} /></button>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                />
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, padding: '10px 18px' }} onClick={send}>
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}>
              <div style={{ textAlign: 'center' }}>
                <Bot size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>{isRTL ? 'اختر محادثة للبدء' : 'Select a conversation to start'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Desktop Properties Sidebar ── */}
      {!isMobile && selectedLead && showSidebarDesktop && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem', gap: '1.25rem', height: '100%' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isRTL ? 'خصائص المحادثة' : 'Chat Properties'}
            </h3>
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: 6 }}
            onClick={handleSendRegistrationLink}
          >
            📝 {isRTL ? 'إرسال رابط التقديم' : 'Send Registration Link'}
          </button>

          <button
            className="btn btn-outline btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: 6, borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
            onClick={handleSendBookingLink}
          >
            📅 {isRTL ? 'إرسال رابط حجز زيارة' : 'Send Booking Link'}
          </button>
          
          {crmLead ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                {/* AI Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{isRTL ? 'الرد الذكي' : 'AI Agent'}</span>
                  <div
                    onClick={handleToggleAi}
                    style={{
                      width: 42, height: 22, borderRadius: 99,
                      background: isAiActive ? 'var(--secondary)' : '#e2e8f0',
                      cursor: 'pointer', position: 'relative',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: isAiActive ? 22 : 4,
                      transition: 'left 0.3s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
                {/* Follow-up Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{isRTL ? 'متابعة دورية' : 'Periodic Follow-up'}</span>
                  <div
                    onClick={handleToggleFollowUp}
                    style={{
                      width: 42, height: 22, borderRadius: 99,
                      background: isFollowUpActive ? 'var(--secondary)' : '#e2e8f0',
                      cursor: 'pointer', position: 'relative',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: isFollowUpActive ? 22 : 4,
                      transition: 'left 0.3s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{isRTL ? 'بيانات العميل' : 'CRM Details'}</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div><strong>{isRTL ? 'الاسم:' : 'Name:'}</strong> {crmLead.name}</div>
                  <div><strong>{isRTL ? 'الصف:' : 'Grade:'}</strong> {crmLead.grade || '—'}</div>
                  {crmLead.student_nationality && <div><strong>{isRTL ? 'جنسية الطالب:' : 'Student Nationality:'}</strong> {crmLead.student_nationality}</div>}
                  {crmLead.student_passport && <div><strong>{isRTL ? 'رقم جواز الطالب:' : 'Student Passport:'}</strong> {crmLead.student_passport}</div>}
                  {crmLead.parent_name && <div><strong>{isRTL ? 'ولي الأمر:' : 'Parent:'}</strong> {crmLead.parent_name}</div>}
                  {crmLead.email && <div><strong>{isRTL ? 'البريد:' : 'Email:'}</strong> {crmLead.email}</div>}
                  {crmLead.address && <div><strong>{isRTL ? 'العنوان:' : 'Address:'}</strong> {crmLead.address}</div>}
                </div>
                
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={() => onNavigate && onNavigate('crm', crmLead.id)}
                >
                  {isRTL ? 'فتح في الـ CRM' : 'Open in CRM'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isRTL ? 'هذا العميل غير مسجل في الـ CRM حالياً.' : 'This contact is not registered in the CRM.'}
              </p>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setQuickForm({
                    name: selectedLead.name.startsWith('User ') ? '' : selectedLead.name,
                    phone: selectedLead.id,
                    grade: '',
                    studentNationality: '',
                    studentPassport: '',
                    parentName: '',
                    parentNationality: '',
                    parentPassport: '',
                    address: '',
                    email: '',
                    notes: ''
                  });
                  setShowQuickAdd(true);
                }}
              >
                {isRTL ? 'تسجيل في الـ CRM' : 'Register in CRM'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile Properties Drawer ── */}
      {isMobile && showSidebarMobile && selectedLead && (
        <div className="overlay" onClick={() => setShowSidebarMobile(false)}>
          <div className="modal animate-scale" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '340px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                {isRTL ? 'خصائص المحادثة' : 'Chat Properties'}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowSidebarMobile(false)}>
                <X size={18} />
              </button>
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center', gap: 6, marginBottom: 8 }}
              onClick={() => {
                setShowSidebarMobile(false);
                handleSendRegistrationLink();
              }}
            >
              📝 {isRTL ? 'إرسال رابط التقديم' : 'Send Registration Link'}
            </button>

            <button
              className="btn btn-outline btn-sm"
              style={{ width: '100%', justifyContent: 'center', gap: 6, marginBottom: 16, borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
              onClick={() => {
                setShowSidebarMobile(false);
                handleSendBookingLink();
              }}
            >
              📅 {isRTL ? 'إرسال رابط حجز زيارة' : 'Send Booking Link'}
            </button>
            
            {crmLead ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                  {/* AI Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{isRTL ? 'الرد الذكي' : 'AI Agent'}</span>
                    <div
                      onClick={handleToggleAi}
                      style={{
                        width: 42, height: 22, borderRadius: 99,
                        background: isAiActive ? 'var(--secondary)' : '#e2e8f0',
                        cursor: 'pointer', position: 'relative',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: isAiActive ? 22 : 4,
                        transition: 'left 0.3s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                  {/* Follow-up Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{isRTL ? 'متابعة دورية' : 'Periodic Follow-up'}</span>
                    <div
                      onClick={handleToggleFollowUp}
                      style={{
                        width: 42, height: 22, borderRadius: 99,
                        background: isFollowUpActive ? 'var(--secondary)' : '#e2e8f0',
                        cursor: 'pointer', position: 'relative',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: isFollowUpActive ? 22 : 4,
                        transition: 'left 0.3s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  <div><strong>{isRTL ? 'الاسم:' : 'Name:'}</strong> {crmLead.name}</div>
                  <div><strong>{isRTL ? 'الصف:' : 'Grade:'}</strong> {crmLead.grade || '—'}</div>
                  {crmLead.student_nationality && <div><strong>{isRTL ? 'جنسية الطالب:' : 'Student Nationality:'}</strong> {crmLead.student_nationality}</div>}
                  {crmLead.student_passport && <div><strong>{isRTL ? 'رقم جواز الطالب:' : 'Student Passport:'}</strong> {crmLead.student_passport}</div>}
                  {crmLead.parent_name && <div><strong>{isRTL ? 'ولي الأمر:' : 'Parent:'}</strong> {crmLead.parent_name}</div>}
                  {crmLead.email && <div><strong>{isRTL ? 'البريد:' : 'Email:'}</strong> {crmLead.email}</div>}
                  {crmLead.address && <div><strong>{isRTL ? 'العنوان:' : 'Address:'}</strong> {crmLead.address}</div>}
                </div>
                
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { setShowSidebarMobile(false); if (onNavigate) { onNavigate('crm', crmLead.id); } }}
                >
                  {isRTL ? 'فتح في الـ CRM' : 'Open in CRM'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {isRTL ? 'هذا العميل غير مسجل في الـ CRM حالياً.' : 'This contact is not registered in the CRM.'}
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setShowSidebarMobile(false);
                    setQuickForm({
                      name: selectedLead.name.startsWith('User ') ? '' : selectedLead.name,
                      phone: selectedLead.id,
                      grade: '',
                      studentNationality: '',
                      studentPassport: '',
                      parentName: '',
                      parentNationality: '',
                      parentPassport: '',
                      address: '',
                      email: '',
                      notes: ''
                    });
                    setShowQuickAdd(true);
                  }}
                >
                  {isRTL ? 'تسجيل في الـ CRM' : 'Register in CRM'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Add Lead Modal ── */}
      {showQuickAdd && (
        <div className="overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="modal animate-scale" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '460px' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.15rem' }}>
              {isRTL ? '➕ تسجيل العميل في الـ CRM' : '➕ Quick Register Lead in CRM'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 6 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input className="form-input" placeholder={isRTL ? 'اسم الطالب بالكامل' : 'Full Student Name'} value={quickForm.name} onChange={e => setQuickForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'رقم الهاتف / المعرّف' : 'Phone / ID'}</label>
                <input className="form-input" placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'} value={quickForm.phone} disabled />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'الصف الدراسي' : 'Grade'}</label>
                <select className="form-input" value={quickForm.grade} onChange={e => setQuickForm(p => ({ ...p, grade: e.target.value }))}>
                  <option value="">{isRTL ? '-- اختر الصف --' : '-- Select Grade --'}</option>
                  {['KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'جنسية الطالب' : 'Student Nationality'}</label>
                <select className="form-input" value={quickForm.studentNationality} onChange={e => setQuickForm(p => ({ ...p, studentNationality: e.target.value }))}>
                  <option value="">{isRTL ? '-- اختر جنسية الطالب --' : '-- Select Student Nationality --'}</option>
                  {NATIONALITIES.map((n, idx) => (
                    <option key={`${n.en}-${idx}`} value={isRTL ? n.ar : n.en}>
                      {isRTL ? n.ar : n.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'رقم جواز سفر الطالب' : 'Student Passport Number'}</label>
                <input className="form-input" placeholder={isRTL ? 'جواز السفر' : 'Student Passport'} value={quickForm.studentPassport} onChange={e => setQuickForm(p => ({ ...p, studentPassport: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'اسم ولي الأمر' : 'Parent Name'}</label>
                <input className="form-input" placeholder={isRTL ? 'اسم ولي الأمر الكامل' : 'Parent Full Name'} value={quickForm.parentName} onChange={e => setQuickForm(p => ({ ...p, parentName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'جنسية ولي الأمر' : 'Parent Nationality'}</label>
                <input className="form-input" placeholder={isRTL ? 'جنسية ولي الأمر' : 'Parent Nationality'} value={quickForm.parentNationality} onChange={e => setQuickForm(p => ({ ...p, parentNationality: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'رقم هوية / جواز ولي الأمر' : 'Parent ID / Passport'}</label>
                <input className="form-input" placeholder={isRTL ? 'هوية أو جواز ولي الأمر' : 'Parent ID/Passport'} value={quickForm.parentPassport} onChange={e => setQuickForm(p => ({ ...p, parentPassport: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input className="form-input" type="email" placeholder={isRTL ? 'البريد الإلكتروني' : 'Email Address'} value={quickForm.email} onChange={e => setQuickForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'العنوان السكني' : 'Residential Address'}</label>
                <input className="form-input" placeholder={isRTL ? 'العنوان بالتفصيل' : 'Address'} value={quickForm.address} onChange={e => setQuickForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
                <textarea className="form-input" style={{ minHeight: 60 }} placeholder={isRTL ? 'ملاحظات...' : 'Notes...'} value={quickForm.notes} onChange={e => setQuickForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowQuickAdd(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleQuickAddSubmit}>
                {isRTL ? 'حفظ البيانات' : 'Register Lead'}
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

export default Inbox;
