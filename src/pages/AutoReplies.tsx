import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Search, Send, Globe } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';

const AutoReplies: React.FC = () => {
  const { isRTL } = useI18n();
  const [replies, setReplies] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [channel, setChannel] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchReplies = () => {
    fetch(`${API_URL}/api/auto-replies`)
      .then(res => res.json())
      .then(setReplies)
      .catch(console.error);
  };

  useEffect(() => {
    fetchReplies();
  }, []);

  const handleAdd = async () => {
    if (!keyword || !response) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auto-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, response, channel })
      });
      setKeyword(''); setResponse(''); setChannel('all');
      setShowAdd(false);
      fetchReplies();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل تريد حذف هذا الرد الآلي؟' : 'Delete this auto-reply?')) return;
    try {
      await fetch(`${API_URL}/api/auto-replies/${id}`, { method: 'DELETE' });
      fetchReplies();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <div className="animate-up">
        <h1 className="page-title">{isRTL ? 'الردود الآلية الذكية' : 'Smart Auto-Replies'}</h1>
        <p className="page-subtitle">
          {isRTL 
            ? 'قم بإعداد ردود يتم إرسالها تلقائياً عند اكتشاف كلمات مفتاحية معينة' 
            : 'Set up responses that are sent automatically when specific keywords are detected'}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={18} style={{ position: 'absolute', top: 12, [isRTL ? 'right' : 'left']: 12, opacity: 0.4 }} />
          <input 
            className="form-input" 
            style={{ paddingInlineStart: 40, width: '100%' }} 
            placeholder={isRTL ? 'بحث في الكلمات...' : 'Search keywords...'} 
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {isRTL ? 'إضافة رد جديد' : 'Add New Reply'}
        </button>
      </div>

      {showAdd && (
        <div className="card animate-up" style={{ padding: '1.5rem', border: '1px solid var(--secondary)' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>{isRTL ? 'إضافة قاعدة رد آلي' : 'Add Auto-Reply Rule'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 5 }}>{isRTL ? 'الكلمة المفتاحية (تظهر في رسالة العميل)' : 'Keyword (appears in client message)'}</label>
                <input className="form-input" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder={isRTL ? 'مثال: السعر، العنوان، المواعيد' : 'e.g. Price, Location, Hours'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 5 }}>{isRTL ? 'القناة' : 'Channel'}</label>
                <select className="form-input" value={channel} onChange={e => setChannel(e.target.value)}>
                  <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 5 }}>{isRTL ? 'الرد التلقائي' : 'Auto-Response'}</label>
              <textarea className="form-input" style={{ minHeight: 100 }} value={response} onChange={e => setResponse(e.target.value)} placeholder={isRTL ? 'اكتب الرد الذي سيتم إرساله للعميل...' : 'Type the message to send to the client...'} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>{isRTL ? 'حفظ القاعدة' : 'Save Rule'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {replies.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
            <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>{isRTL ? 'لا توجد ردود آلية مضافة بعد.' : 'No auto-replies added yet.'}</p>
          </div>
        ) : replies.map(r => (
          <div key={r.id} className="card animate-up" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ background: 'rgba(0,28,94,0.07)', borderRadius: 10, padding: 10, color: 'var(--primary)', height: 'fit-content' }}>
                  <Send size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{r.keyword}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                      {r.channel === 'all' ? <Globe size={10} style={{marginInlineEnd:3}}/> : null}
                      {r.channel}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{r.response}</p>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ color: '#ef4444', padding: 8 }} onClick={() => handleDelete(r.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutoReplies;
