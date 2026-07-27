import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Upload, Trash2, Plus, CheckCircle, FileText, X } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { API_URL } from '../config';

interface KBItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file';
  words: number;
  status: 'active' | 'draft';
  created_at?: string;
  createdAt?: string; // fallback
}

const KnowledgeBase: React.FC = () => {
  const { isRTL } = useI18n();
  const [items, setItems] = useState<KBItem[]>([]);
  const [showTextForm, setShowTextForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    axios.get(`${API_URL}/api/kb`)
      .then(res => setItems(res.data))
      .catch(console.error);
  };

  const addTextItem = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const item = {
      title: newTitle,
      content: newContent,
      type: 'text',
      words: countWords(newContent),
      status: 'active',
    };
    axios.post(`${API_URL}/api/kb`, item)
      .then(() => {
        fetchItems();
        setNewTitle('');
        setNewContent('');
        setShowTextForm(false);
      })
      .catch(console.error);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);

    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Dynamic loading of PDF.js
        await new Promise<void>((resolve, reject) => {
          if ((window as any).pdfjsLib) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load PDF parser'));
          document.head.appendChild(script);
        });

        // Read file as ArrayBuffer
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const arrayBuffer = ev.target?.result as ArrayBuffer;
            const pdfjsLib = (window as any).pdfjsLib;
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n';
            }

            const cleanText = fullText.trim();
            const item = {
              title: file.name,
              content: cleanText.length > 1000 ? cleanText.slice(0, 1000) + '...' : cleanText,
              type: 'file',
              words: countWords(cleanText),
              status: 'active',
            };
            axios.post(`${API_URL}/api/kb`, item)
              .then(() => fetchItems())
              .catch(console.error)
              .finally(() => setIsParsing(false));
          } catch (err) {
            console.error('Error parsing PDF:', err);
            alert(isRTL ? 'حدث خطأ أثناء قراءة ملف الـ PDF. تأكد من أنه غير محمي.' : 'Error reading PDF file. Make sure it is not password-protected.');
            setIsParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Plain text file (.txt)
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string || '';
          const item = {
            title: file.name,
            content: content,
            type: 'file',
            words: countWords(content),
            status: 'active',
          };
          axios.post(`${API_URL}/api/kb`, item)
            .then(() => fetchItems())
            .catch(console.error)
            .finally(() => setIsParsing(false));
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error(err);
      alert(isRTL ? 'فشل تحميل مكتبة معالجة الـ PDF' : 'Failed to load PDF parsing library');
      setIsParsing(false);
    }
    e.target.value = '';
  };

  const deleteItem = (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا العنصر؟' : 'Are you sure you want to delete this item?')) return;
    axios.delete(`${API_URL}/api/kb/${id}`)
      .then(() => fetchItems())
      .catch(console.error);
  };

  const toggleStatus = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'active' ? 'draft' : 'active';
    axios.post(`${API_URL}/api/kb/${id}/status`, { status: newStatus })
      .then(() => fetchItems())
      .catch(console.error);
  };

  const activeItems = items.filter(i => i.status === 'active');
  const totalWords = items.reduce((sum, i) => sum + i.words, 0);
  const lastUpdated = items.length > 0 ? (items[0].created_at || items[0].createdAt || '-') : '-';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div className="animate-up">
        <h1 className="page-title">{isRTL ? 'قاعدة معرفة الذكاء الاصطناعي' : 'AI Knowledge Base'}</h1>
        <p className="page-subtitle">
          {isRTL ? 'أضف محتوى لتدريب المساعد الذكي على معلومات مدرستك' : 'Add content to train your AI agent about the school'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid-3-col animate-up delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: isRTL ? 'عناصر نشطة' : 'Active Items',  value: activeItems.length.toString(), color: '#14C35D' },
          { label: isRTL ? 'إجمالي الكلمات' : 'Total Words', value: totalWords.toLocaleString(), color: '#001C5E' },
          { label: isRTL ? 'آخر تحديث' : 'Last Updated',   value: lastUpdated, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload / Add Zone */}
      <div className="animate-up delay-2 card" style={{ padding: '2rem', border: '2px dashed rgba(20,195,93,0.35)', background: 'rgba(20,195,93,0.03)' }}>
        <div style={{ textAlign: 'center', marginBottom: showTextForm ? 24 : 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(20,195,93,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <Upload size={28} color="#14C35D" />
          </div>
          <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6, fontSize: '1.05rem' }}>
            {isRTL ? 'ارفع ملف أو أضف نصاً' : 'Upload a File or Add Text'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 18 }}>
            {isRTL ? 'سيقوم النظام باستخراج المعلومات وتدريب المساعد الذكي عليها' : 'The system will extract info and train the AI agent'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer', opacity: isParsing ? 0.7 : 1, pointerEvents: isParsing ? 'none' : 'auto' }}>
              <Upload size={16} />
              {isParsing ? (isRTL ? 'جاري قراءة الملف...' : 'Parsing file...') : (isRTL ? 'رفع ملف PDF / TXT' : 'Upload PDF / TXT')}
              <input type="file" accept=".txt,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isParsing} />
            </label>
            <button className="btn btn-outline" onClick={() => setShowTextForm(v => !v)}>
              {showTextForm ? <X size={16} /> : <Plus size={16} />}
              {showTextForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'أضف نصاً يدوياً' : 'Add Text Manually')}
            </button>
          </div>
        </div>

        {/* Text Form */}
        {showTextForm && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="form-input"
              placeholder={isRTL ? 'عنوان المحتوى (مثل: الرسوم الدراسية)' : 'Content Title (e.g. Tuition Fees)'}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <textarea
              className="form-input"
              style={{ minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder={isRTL ? 'أكتب المعلومات هنا... (الأسئلة الشائعة، المناهج، المصاريف...)' : 'Write content here... (FAQs, curriculum, fees...)'}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowTextForm(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={addTextItem}>
                <Plus size={16} />
                {isRTL ? 'إضافة للقاعدة' : 'Add to Knowledge Base'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="animate-up delay-3 card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="section-title">{isRTL ? 'المحتوى المُضاف' : 'Knowledge Items'}</h3>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {items.length} {isRTL ? 'عناصر' : 'items'}
          </span>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
            <BookOpen size={40} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {isRTL ? 'لا يوجد محتوى بعد. أضف نصاً أو ارفع ملفاً للبدء.' : 'No content yet. Add text or upload a file to get started.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.id} className="card-flat" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: 'rgba(0,28,94,0.07)', borderRadius: 10, padding: 10, color: 'var(--primary)', flexShrink: 0 }}>
                  {item.type === 'file' ? <FileText size={20} /> : <BookOpen size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#3b82f6', padding: '2px 9px', borderRadius: 99 }}>
                      {item.type === 'file' ? (isRTL ? 'ملف' : 'File') : (isRTL ? 'نص' : 'Text')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>
                      {item.words.toLocaleString()} {isRTL ? 'كلمة' : 'words'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>• {item.created_at || item.createdAt}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleStatus(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: item.status === 'active' ? '#f0fdf4' : '#f8fafc',
                      color: item.status === 'active' ? '#16a34a' : '#94a3b8' }}
                  >
                    <CheckCircle size={12} />
                    {item.status === 'active' ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'مسودة' : 'Draft')}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: 7, color: '#ef4444' }} onClick={() => deleteItem(item.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="animate-up delay-4 banner-gradient" style={{ padding: '1.5rem' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h4 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 10 }}>
            💡 {isRTL ? 'نصائح لتحسين أداء الذكاء الاصطناعي' : 'Tips to Improve AI Performance'}
          </h4>
          <ul style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 2, paddingInlineStart: 20 }}>
            <li>{isRTL ? 'أضف جداول المصاريف بتفصيل لكل مرحلة دراسية' : 'Add detailed fee tables for each grade level'}</li>
            <li>{isRTL ? 'ضمّن الأسئلة الشائعة من أولياء الأمور وإجاباتها' : 'Include FAQs from parents with clear answers'}</li>
            <li>{isRTL ? 'حدّث المعلومات بانتظام لضمان دقة الردود' : 'Update info regularly to ensure accurate responses'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
