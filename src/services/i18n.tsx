import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations: Translations = {
  dashboard:           { ar: 'لوحة التحكم',        en: 'Dashboard' },
  inbox:               { ar: 'صندوق الرسائل',      en: 'Inbox' },
  crm:                 { ar: 'إدارة العملاء',       en: 'CRM' },
  knowledgeBase:       { ar: 'قاعدة المعرفة',       en: 'Knowledge Base' },
  settings:            { ar: 'الإعدادات',           en: 'Settings' },
  users:               { ar: 'المستخدمين والصلاحيات', en: 'Users & Roles' },
  analytics:           { ar: 'التحليلات',           en: 'Analytics' },
  socialAnalytics:     { ar: 'تحليلات التواصل',     en: 'Social Media Analytics' },
  newLeads:            { ar: 'عملاء جدد',           en: 'New Leads' },
  totalLeads:          { ar: 'إجمالي العملاء',      en: 'Total Leads' },
  conversionRate:      { ar: 'نسبة التحويل',        en: 'Conversion Rate' },
  activeCampaigns:     { ar: 'الحملات التسويقية',   en: 'Campaigns' },
  aiAgent:             { ar: 'المساعد الذكي',       en: 'AI Agent' },
  bookVisit:           { ar: 'حجز زيارة',           en: 'Book a Visit' },
  studentRegistration: { ar: 'تسجيل الطلاب',        en: 'Registration' },
  status:              { ar: 'الحالة',              en: 'Status' },
  source:              { ar: 'المصدر',              en: 'Source' },
  grade:               { ar: 'الصف',               en: 'Grade' },
  actions:             { ar: 'الإجراءات',           en: 'Actions' },
  search:              { ar: 'بحث...',              en: 'Search...' },
  notifications:       { ar: 'التنبيهات',           en: 'Notifications' },
  language:            { ar: 'اللغة',              en: 'Language' },
  autoReply:           { ar: 'الردود الآلية',        en: 'Auto Replies' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'ar';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    localStorage.setItem('lang', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = (key: keyof typeof translations): string => {
    return translations[key]?.[language] || (key as string);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
