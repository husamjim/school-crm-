const dbModule = require('../db');
const db = dbModule.db;

/**
 * Robust CSV Line Parser handling quotes, commas, and escapes
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Parses raw CSV content into array of record objects
 */
function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const obj = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      obj[key] = values[index] !== undefined ? values[index] : '';
    });
    records.push(obj);
  }
  return records;
}

/**
 * Bulk import master data into database using transaction for optimal performance
 */
function importMasterData(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { imported: 0, updated: 0, total: 0 };
  }

  let imported = 0;
  let updated = 0;
  
  const insertStmt = db.prepare(`
    INSERT INTO leads (
      id, name, phone, channel, grade, score, status, notes,
      student_nationality, student_passport, parent_nationality, parent_passport,
      birth_date, parent_name, email, address, ai_enabled, follow_up, photo_url, files, assigned_to
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      channel = excluded.channel,
      grade = excluded.grade,
      score = excluded.score,
      status = excluded.status,
      notes = excluded.notes,
      student_nationality = excluded.student_nationality,
      student_passport = excluded.student_passport,
      parent_nationality = excluded.parent_nationality,
      parent_passport = excluded.parent_passport,
      birth_date = excluded.birth_date,
      parent_name = excluded.parent_name,
      email = excluded.email,
      address = excluded.address,
      assigned_to = excluded.assigned_to
  `);

  const runTransaction = db.transaction((items) => {
    for (const r of items) {
      const id = r.id || r.lead_id || `master_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
      
      insertStmt.run(
        id,
        r.name || r.student_name || '—',
        r.phone || r.phone_number || r.mobile || '—',
        r.channel || 'web',
        r.grade || r.grade_level || '—',
        parseInt(r.score) || 80,
        r.status || 'new',
        r.notes || null,
        r.student_nationality || r.nationality || null,
        r.student_passport || r.passport || null,
        r.parent_nationality || null,
        r.parent_passport || null,
        r.birth_date || r.dob || null,
        r.parent_name || r.guardian_name || null,
        r.email || null,
        r.address || r.city || null,
        r.ai_enabled !== undefined ? parseInt(r.ai_enabled) : 1,
        r.follow_up !== undefined ? parseInt(r.follow_up) : 1,
        r.photo_url || null,
        r.files ? (typeof r.files === 'string' ? r.files : JSON.stringify(r.files)) : null,
        r.assigned_to || null
      );
      
      if (existing) updated++;
      else imported++;
    }
  });

  runTransaction(records);
  return { imported, updated, total: records.length };
}

module.exports = {
  parseCSV,
  importMasterData
};
