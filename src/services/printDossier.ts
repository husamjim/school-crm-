import { API_URL } from '../config';

export const printStudentDossier = (lead: any, isRTL: boolean) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const filesHtml = (() => {
    let files = [];
    if (lead.files) {
      try {
        files = typeof lead.files === 'string' ? JSON.parse(lead.files) : lead.files;
      } catch (e) {
        files = [];
      }
    }
    if (files.length === 0) return `<p>${isRTL ? 'لا توجد ملفات مرفقة.' : 'No attached files.'}</p>`;
    return files.map((f: any) => `
      <div class="file-item">
        <strong>${f.name}</strong> - <span>${f.type.toUpperCase()}</span>
      </div>
    `).join('');
  })();

  const html = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <title>${lead.name} - Dossier</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 2rem;
          color: #0d1b3e;
          line-height: 1.6;
        }
        .header {
          border-bottom: 3px solid #001c5e;
          padding-bottom: 1rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 {
          margin: 0;
          color: #001c5e;
          font-size: 24px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: #001c5e;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 1rem;
        }
        .info-box {
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .info-box label {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }
        .info-box span {
          font-size: 14px;
          font-weight: 800;
          color: #0d1b3e;
        }
        .notes-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          padding: 12px;
          border-radius: 8px;
          margin-top: 1rem;
          color: #92400e;
        }
        .file-item {
          padding: 8px 12px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 6px;
          font-size: 13px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${lead.name}</h1>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">ID: ${lead.id} | ${isRTL ? 'ملف طالب مدارس GMIS' : 'GMIS Student Dossier'}</p>
        </div>
        <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #001c5e; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
          ${isRTL ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}
        </button>
      </div>

      <div class="section-title">${isRTL ? 'بيانات الطالب' : 'Student Information'}</div>
      <div class="grid">
        <div class="info-box"><label>${isRTL ? 'الاسم بالكامل' : 'Full Name'}</label><span>${lead.name}</span></div>
        <div class="info-box"><label>${isRTL ? 'الصف الدراسي' : 'Grade'}</label><span>${lead.grade || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'تاريخ الميلاد' : 'Birth Date'}</label><span>${lead.birth_date || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'الجنسية' : 'Nationality'}</label><span>${lead.student_nationality || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'جواز السفر / الهوية' : 'Passport/ID'}</label><span>${lead.student_passport || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'قناة التسجيل' : 'Source Channel'}</label><span>${lead.channel || '—'}</span></div>
      </div>

      <div class="section-title">${isRTL ? 'بيانات ولي الأمر' : 'Parent / Guardian Information'}</div>
      <div class="grid">
        <div class="info-box"><label>${isRTL ? 'اسم ولي الأمر' : 'Parent Name'}</label><span>${lead.parent_name || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'رقم الهاتف' : 'Phone'}</label><span>${lead.phone || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'البريد الإلكتروني' : 'Email'}</label><span>${lead.email || '—'}</span></div>
        <div class="info-box"><label>${isRTL ? 'العنوان' : 'Address'}</label><span>${lead.address || '—'}</span></div>
      </div>

      ${lead.notes ? `
        <div class="section-title">${isRTL ? 'ملاحظات إدارية' : 'Administrative Notes'}</div>
        <div class="notes-box">${lead.notes}</div>
      ` : ''}

      <div class="section-title">${isRTL ? 'المستندات المرفوعة' : 'Uploaded Documents'}</div>
      <div style="margin-top: 10px;">
        ${filesHtml}
      </div>

      <script>
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printDocumentFile = (file: { name: string; url: string; type: string }) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isPdf = file.type === 'pdf';
  const fileFullUrl = `${API_URL}${file.url}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Document: ${file.name}</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
        iframe { width: 100%; height: 100vh; border: none; }
        @media print {
          body { background: #fff; }
          img { max-height: 100%; }
        }
      </style>
    </head>
    <body>
      ${isPdf 
        ? `<iframe src="${fileFullUrl}"></iframe>`
        : `<img src="${fileFullUrl}" alt="${file.name}" onload="window.print()" />`
      }
      
      <script>
        if (${isPdf}) {
          // If it's a PDF, we can trigger print via window or let the user handle it
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
