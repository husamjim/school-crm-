import React, { useState, useCallback } from 'react';
import { Info, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  subText?: string;
  type: 'info' | 'warning' | 'soon';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
  isRTL?: boolean;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove, isRTL }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      [isRTL ? 'left' : 'right']: 24,
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 340,
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-up"
          style={{
            background: 'linear-gradient(135deg, #1e3a6e 0%, #001C5E 100%)',
            color: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 12px 40px rgba(0,28,94,0.35)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 280,
          }}
        >
          <div style={{
            background: 'rgba(245,166,35,0.2)',
            borderRadius: 10,
            padding: 8,
            flexShrink: 0,
            display: 'flex',
          }}>
            <Info size={18} color="#F5A623" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', marginBottom: 3 }}>
              {t.text}
            </div>
            {t.subText && (
              <div style={{ fontSize: '0.78rem', opacity: 0.75, lineHeight: 1.5 }}>
                {t.subText}
              </div>
            )}
          </div>
          <button
            onClick={() => onRemove(t.id)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              borderRadius: 8,
              padding: 4,
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, subText?: string, duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, subText, type: 'info' }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};

export default useToast;
