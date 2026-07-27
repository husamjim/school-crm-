const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dbModule = require('../db');
const db = dbModule.db;
const masterDataImporter = require('../services/masterDataImporter');

test('Database Setup & Indexes Verification', (t) => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  assert.ok(tables.includes('leads'), 'leads table exists');
  assert.ok(tables.includes('users'), 'users table exists');
  assert.ok(tables.includes('messages'), 'messages table exists');
  assert.ok(tables.includes('visits'), 'visits table exists');

  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name);
  assert.ok(indexes.includes('idx_leads_assigned'), 'idx_leads_assigned exists');
  assert.ok(indexes.includes('idx_leads_status'), 'idx_leads_status exists');
});

test('Master Data Importer - CSV Parsing', (t) => {
  const csvContent = `id,name,phone,grade,status
test_001,"John Doe",+123456789,Grade 5,new
test_002,"Jane Smith",+987654321,KG1,following`;

  const parsed = masterDataImporter.parseCSV(csvContent);
  assert.equal(parsed.length, 2, 'Should parse 2 CSV rows');
  assert.equal(parsed[0].name, 'John Doe');
  assert.equal(parsed[1].grade, 'KG1');
});

test('Master Data Importer - Bulk Database Upsert', (t) => {
  const testData = [
    {
      id: 'test_lead_import_1',
      name: 'Student Alpha',
      phone: '+966500000001',
      channel: 'web',
      grade: 'Grade 1',
      score: 95,
      status: 'new',
      student_nationality: 'Saudi'
    },
    {
      id: 'test_lead_import_2',
      name: 'Student Beta',
      phone: '+966500000002',
      channel: 'whatsapp',
      grade: 'KG2',
      score: 88,
      status: 'interested',
      student_nationality: 'Egyptian'
    }
  ];

  const result = masterDataImporter.importMasterData(testData);
  assert.ok(result.total === 2, 'Total items processed should be 2');

  const lead1 = db.prepare('SELECT * FROM leads WHERE id = ?').get('test_lead_import_1');
  assert.ok(lead1, 'Imported lead 1 should exist in DB');
  assert.equal(lead1.name, 'Student Alpha');
  assert.equal(lead1.score, 95);

  // Clean up test data
  db.prepare("DELETE FROM leads WHERE id LIKE 'test_lead_import_%'").run();
});

test('Detailed Stats Aggregation Accuracy', (t) => {
  const stats = dbModule.getDetailedStats(null, 'admin');
  assert.ok(typeof stats.totalLeads === 'number', 'totalLeads is numeric');
  assert.ok(Array.isArray(stats.weeklyFlow), 'weeklyFlow is array');
  assert.equal(stats.weeklyFlow.length, 7, 'weeklyFlow contains 7 days');
});
