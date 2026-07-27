const Database = require('better-sqlite3');
const path = require('path');
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_BUILDER;
const dbPath = isServerless ? path.join('/tmp', 'database.sqlite') : path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);



db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    channel TEXT,
    grade TEXT,
    score INTEGER,
    status TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    name TEXT,
    phone TEXT,
    grade TEXT,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_psid TEXT,
    text TEXT,
    channel TEXT,
    time TEXT,
    receiver_id TEXT,
    receiver_name TEXT,
    is_story_reply INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS story_reactions (
    id TEXT PRIMARY KEY,
    sender_psid TEXT,
    emoji TEXT,
    channel TEXT,
    story_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    status TEXT,
    permissions TEXT,
    needs_password_change INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auto_replies (
    id TEXT PRIMARY KEY,
    keyword TEXT,
    response TEXT,
    channel TEXT DEFAULT 'all',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    type TEXT,
    words INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Dynamic column migrations for leads table
try { db.exec("ALTER TABLE leads ADD COLUMN student_nationality TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN student_passport TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN parent_nationality TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN parent_passport TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN birth_date TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN parent_name TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN email TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN address TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN photo_url TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN files TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN ai_enabled INTEGER DEFAULT 1;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN follow_up INTEGER DEFAULT 1;"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN permissions TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN needs_password_change INTEGER DEFAULT 1;"); } catch(e){}
try { db.exec("ALTER TABLE messages ADD COLUMN image TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE messages ADD COLUMN is_story_reply INTEGER DEFAULT 0;"); } catch(e){}
try { db.exec("ALTER TABLE leads ADD COLUMN assigned_to TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN assigned_whatsapp TEXT;"); } catch(e){}

// Performance indexes
try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_psid);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);"); } catch(e){}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_visits_phone ON visits(phone);"); } catch(e){}

// Create default admin if not exists
const adminEmail = 'admin@gmis.edu';
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!adminExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('123456', 10);
  db.prepare('INSERT INTO users (id, name, email, password, role, status, needs_password_change) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    '1', 'المدير العام', adminEmail, hash, 'admin', 'active', 0
  );
}

module.exports = {
  db,
  getLeads: () => db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all(),
  addLead: (lead) => db.prepare('INSERT INTO leads (id, name, phone, channel, grade, score, status, notes, student_nationality, student_passport, parent_nationality, parent_passport, birth_date, parent_name, email, address, ai_enabled, follow_up, photo_url, files, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    lead.id, lead.name, lead.phone, lead.channel, lead.grade, lead.score, lead.status, lead.notes,
    lead.student_nationality || null, lead.student_passport || null, lead.parent_nationality || null, lead.parent_passport || null,
    lead.birth_date || null, lead.parent_name || null, lead.email || null, lead.address || null,
    lead.ai_enabled !== undefined ? lead.ai_enabled : 1,
    lead.follow_up !== undefined ? lead.follow_up : 1,
    lead.photo_url || null,
    lead.files || null,
    lead.assigned_to || null
  ),
  updateLeadSettings: (id, aiEnabled, followUp) => db.prepare('UPDATE leads SET ai_enabled = ?, follow_up = ? WHERE id = ?').run(aiEnabled, followUp, id),
  getKBItems: () => db.prepare('SELECT * FROM knowledge_base ORDER BY created_at DESC').all(),
  addKBItem: (item) => db.prepare('INSERT INTO knowledge_base (id, title, content, type, words, status) VALUES (?, ?, ?, ?, ?, ?)').run(item.id, item.title, item.content, item.type, item.words, item.status || 'active'),
  updateKBItemStatus: (id, status) => db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run(status, id),
  deleteKBItem: (id) => db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(id),
  updateLeadStatus: (id, status) => db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id),
  deleteLead: (id) => db.prepare('DELETE FROM leads WHERE id = ?').run(id),
  getMessages: () => db.prepare('SELECT * FROM messages ORDER BY created_at ASC').all(),
  addMessage: (msg) => db.prepare('INSERT INTO messages (id, sender_psid, text, image, channel, time, receiver_id, receiver_name, is_story_reply) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').run(msg.id, msg.sender_psid, msg.text, msg.image || null, msg.channel, msg.time, msg.receiver_id || null, msg.receiver_name || null, msg.is_story_reply || 0),
  addStoryReaction: (reaction) => db.prepare('INSERT INTO story_reactions (id, sender_psid, emoji, channel, story_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').run(reaction.id, reaction.sender_psid, reaction.emoji, reaction.channel, reaction.story_id || null),
  getStoryReactions: () => db.prepare('SELECT * FROM story_reactions ORDER BY created_at DESC').all(),
  getStoryRepliesCount: () => db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_story_reply = 1').get()?.count || 0,
  getVisits: () => db.prepare('SELECT * FROM visits ORDER BY date ASC, time ASC').all(),
  addVisit: (v) => db.prepare('INSERT INTO visits (id, lead_id, name, phone, grade, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(v.id, v.lead_id, v.name, v.phone, v.grade, v.date, v.time, v.status || 'pending'),
  updateVisitStatus: (id, status) => db.prepare('UPDATE visits SET status = ? WHERE id = ?').run(status, id),
  deleteVisit: (id) => db.prepare('DELETE FROM visits WHERE id = ?').run(id),
  getUsers: () => db.prepare('SELECT id, name, email, role, status, permissions, assigned_whatsapp, needs_password_change, created_at FROM users').all(),
  addUser: (user) => db.prepare('INSERT INTO users (id, name, email, password, role, status, permissions, needs_password_change) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(user.id, user.name, user.email, user.password, user.role, user.status, user.permissions || '', 1),
  deleteUser: (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id),
  updateUserStatus: (id, status) => db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id),
  updateUserPermissions: (id, perms) => db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(perms, id),
  getUserByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  updatePassword: (id, newHash) => db.prepare('UPDATE users SET password = ?, needs_password_change = 0 WHERE id = ?').run(newHash, id),
  getStats: () => {
    const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
    const newToday = db.prepare("SELECT COUNT(*) as c FROM leads WHERE date(created_at) = date('now')").get().c;
    const activeCampaigns = 0;
    const totalSent = db.prepare("SELECT COUNT(*) as c FROM messages WHERE sender_psid = 'system'").get().c || 0;
    const upcomingVisits = db.prepare("SELECT COUNT(*) as c FROM visits WHERE date >= date('now')").get().c;
    return { totalLeads, newToday, activeCampaigns, totalSent, upcomingVisits };
  },
  getAutoReplies: () => db.prepare('SELECT * FROM auto_replies ORDER BY created_at DESC').all(),
  addAutoReply: (r) => db.prepare('INSERT INTO auto_replies (id, keyword, response, channel) VALUES (?, ?, ?, ?)').run(r.id, r.keyword, r.response, r.channel || 'all'),
  deleteAutoReply: (id) => db.prepare('DELETE FROM auto_replies WHERE id = ?').run(id),
  
  getWeeklyStats: () => {
    return db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count 
      FROM leads 
      WHERE created_at >= date('now', '-7 days') 
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all();
  },
  
  getChannelStats: () => {
    return db.prepare(`
      SELECT channel, COUNT(*) as value 
      FROM messages 
      GROUP BY channel
    `).all();
  },

   getHotLeadsCount: () => {
    return db.prepare("SELECT COUNT(*) as c FROM leads WHERE status IN ('following', 'interested', 'Hot', 'مهتم')").get()?.c || 0;
  },

  getDetailedStats: (userId, role) => {
    const isAgent = role === 'agent' && userId;
    const totalLeads = db.prepare(`SELECT COUNT(*) as c FROM leads ${isAgent ? 'WHERE assigned_to = ?' : ''}`).get(isAgent ? [userId] : [])?.c || 0;
    const newToday = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE date(created_at) = date('now') ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : [])?.c || 0;
    const hotLeads = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status IN ('following', 'interested', 'Hot', 'مهتم') ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : [])?.c || 0;
    
    let upcomingVisits;
    if (isAgent) {
      upcomingVisits = db.prepare(`
        SELECT COUNT(*) as c FROM visits v
        JOIN leads l ON v.phone = l.phone OR v.name = l.name
        WHERE v.date >= date('now') AND l.assigned_to = ?
      `).get(userId)?.c || 0;
    } else {
      upcomingVisits = db.prepare("SELECT COUNT(*) as c FROM visits WHERE date >= date('now')").get()?.c || 0;
    }

    let totalSent;
    if (isAgent) {
      totalSent = db.prepare(`
        SELECT COUNT(*) as c FROM messages m
        JOIN leads l ON m.sender_psid = l.phone OR m.sender_psid = l.id
        WHERE l.assigned_to = ?
      `).get(userId)?.c || 0;
    } else {
      totalSent = db.prepare("SELECT COUNT(*) as c FROM messages").get()?.c || 0;
    }

    // Grade distribution from actual database
    const gradeDistribution = db.prepare(`
      SELECT grade, COUNT(*) as count 
      FROM leads 
      WHERE grade IS NOT NULL AND grade != '' ${isAgent ? 'AND assigned_to = ?' : ''}
      GROUP BY grade
      ORDER BY count DESC
    `).all(isAgent ? [userId] : []);

    // Channel distribution from actual database
    const channelDistribution = db.prepare(`
      SELECT channel, COUNT(*) as count 
      FROM leads 
      ${isAgent ? 'WHERE assigned_to = ?' : ''}
      GROUP BY channel
    `).all(isAgent ? [userId] : []);

    // Conversion numbers based on unique leads
    let scheduledLeadsCount;
    if (isAgent) {
      scheduledLeadsCount = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as c 
        FROM leads l
        JOIN visits v ON l.phone = v.phone OR l.name = v.name
        WHERE l.assigned_to = ?
      `).get(userId).c || 0;
    } else {
      scheduledLeadsCount = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as c 
        FROM leads l
        JOIN visits v ON l.phone = v.phone OR l.name = v.name
      `).get().c || 0;
    }

    const registeredLeadsCount = db.prepare(`
      SELECT COUNT(*) as c 
      FROM leads 
      WHERE status = 'registered' ${isAgent ? 'AND assigned_to = ?' : ''}
    `).get(isAgent ? [userId] : []).c || 0;

    // Engaged count: leads who have sent messages
    let engagedLeadsCount;
    if (isAgent) {
      engagedLeadsCount = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as c
        FROM leads l
        JOIN messages m ON l.phone = m.sender_psid OR l.id = m.sender_psid
        WHERE l.assigned_to = ?
      `).get(userId).c || 0;
    } else {
      engagedLeadsCount = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as c
        FROM leads l
        JOIN messages m ON l.phone = m.sender_psid OR l.id = m.sender_psid
      `).get().c || 0;
    }

    const weeklyFlow = [];
    const dateMap = {};
    const dateKeys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dateKeys.push(dateStr);
      dateMap[dateStr] = {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        leads: 0,
        conv: 0
      };
    }

    const aggregatedRows = db.prepare(`
      SELECT 
        date(created_at) as day, 
        COUNT(*) as leads_count,
        SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as conv_count
      FROM leads 
      WHERE created_at >= date('now', '-7 days') ${isAgent ? 'AND assigned_to = ?' : ''}
      GROUP BY date(created_at)
    `).all(isAgent ? [userId] : []);

    for (const r of aggregatedRows) {
      if (dateMap[r.day]) {
        dateMap[r.day].leads = r.leads_count || 0;
        dateMap[r.day].conv = r.conv_count || 0;
      }
    }

    for (const key of dateKeys) {
      weeklyFlow.push(dateMap[key]);
    }

    // Recent leads
    const recentLeads = db.prepare(`SELECT * FROM leads ${isAgent ? 'WHERE assigned_to = ?' : ''} ORDER BY created_at DESC LIMIT 5`).all(isAgent ? [userId] : []);

    // Nationality breakdown
    const nationalityDistribution = db.prepare(`
      SELECT student_nationality as nationality, COUNT(*) as count 
      FROM leads 
      WHERE student_nationality IS NOT NULL AND student_nationality != '' ${isAgent ? 'AND assigned_to = ?' : ''}
      GROUP BY student_nationality
      ORDER BY count DESC
    `).all(isAgent ? [userId] : []);

    // Address breakdown
    const addressDistribution = db.prepare(`
      SELECT address, COUNT(*) as count 
      FROM leads 
      WHERE address IS NOT NULL AND address != '' ${isAgent ? 'AND assigned_to = ?' : ''}
      GROUP BY address
      ORDER BY count DESC
    `).all(isAgent ? [userId] : []);

    // Funnel breakdown
    const funnel = {
      newLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'new' ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : []).c || 0,
      followingLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'following' ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : []).c || 0,
      interestedLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'interested' ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : []).c || 0,
      registeredLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'registered' ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : []).c || 0,
      coldLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'cold' ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : []).c || 0,
    };

    return {
      totalLeads,
      newToday,
      hotLeads,
      upcomingVisits,
      totalSent,
      gradeDistribution,
      channelDistribution,
      scheduledLeadsCount,
      registeredLeadsCount,
      engagedLeadsCount,
      weeklyFlow,
      recentLeads,
      funnel,
      nationalityDistribution,
      addressDistribution
    };
  }
};
