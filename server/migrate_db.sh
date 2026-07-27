#!/bin/bash
# Fix database schema - add missing columns
NODE_SCRIPT="
const Database = require('better-sqlite3');
const db = new Database('/var/www/gmis/backend/database.sqlite');

// Check existing columns
const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
console.log('Existing columns:', cols.join(', '));

// Add missing columns
if (!cols.includes('permissions')) {
  db.exec('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT \"\"');
  console.log('✅ Added: permissions');
}
if (!cols.includes('needs_password_change')) {
  db.exec('ALTER TABLE users ADD COLUMN needs_password_change INTEGER DEFAULT 1');
  console.log('✅ Added: needs_password_change');
}
if (!cols.includes('lastLogin')) {
  db.exec('ALTER TABLE users ADD COLUMN lastLogin TEXT DEFAULT \"—\"');
  console.log('✅ Added: lastLogin');
}

// Add image column to messages if missing
const msgCols = db.prepare('PRAGMA table_info(messages)').all().map(c => c.name);
if (!msgCols.includes('image')) {
  db.exec('ALTER TABLE messages ADD COLUMN image TEXT');
  console.log('✅ Added: messages.image');
}

console.log('✅ Database migration complete!');
"

node -e "$NODE_SCRIPT"
