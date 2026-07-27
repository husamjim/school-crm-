const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;
let useMemoryStore = false;

// Pre-populated memory database for Vercel / serverless environments when better-sqlite3 is unavailable
const memoryData = {
  users: [
    {
      id: '1',
      name: 'المدير العام',
      email: 'admin@gmis.edu',
      password: bcrypt.hashSync('123456', 10),
      role: 'admin',
      status: 'active',
      permissions: null,
      assigned_whatsapp: null,
      needs_password_change: 0,
      created_at: new Date().toISOString()
    }
  ],
  leads: [],
  visits: [],
  messages: [],
  story_reactions: [],
  auto_replies: [],
  knowledge_base: []
};

try {
  const Database = require('better-sqlite3');
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_BUILDER;
  const dbPath = isServerless ? path.join('/tmp', 'database.sqlite') : path.join(__dirname, 'database.sqlite');
  db = new Database(dbPath);

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

  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_psid);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_visits_phone ON visits(phone);"); } catch(e){}

  const adminEmail = 'admin@gmis.edu';
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!adminExists) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare('INSERT INTO users (id, name, email, password, role, status, needs_password_change) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      '1', 'المدير العام', adminEmail, hash, 'admin', 'active', 0
    );
  }
} catch (err) {
  console.warn("⚠️ Native better-sqlite3 driver unavailable (using Memory DB fallback):", err.message);
  useMemoryStore = true;
}

// Memory Store Proxy Object to emulate db.prepare() interface for serverless environments
const dbProxy = useMemoryStore ? {
  prepare: (sql) => {
    return {
      get: (...args) => {
        const flatArgs = args.flat();
        if (sql.includes('WHERE email =')) {
          const email = flatArgs[0];
          return memoryData.users.find(u => u.email === email) || null;
        }
        if (sql.includes('WHERE id =') && sql.includes('FROM users')) {
          const id = flatArgs[0];
          return memoryData.users.find(u => u.id === id) || null;
        }
        if (sql.includes('WHERE id =') && sql.includes('FROM leads')) {
          const id = flatArgs[0];
          return memoryData.leads.find(l => l.id === id) || null;
        }
        if (sql.includes('COUNT(*)')) {
          if (sql.includes('FROM leads')) return { c: memoryData.leads.length };
          if (sql.includes('FROM visits')) return { c: memoryData.visits.length };
          if (sql.includes('FROM messages')) return { c: memoryData.messages.length };
          return { c: 0 };
        }
        return null;
      },
      all: (...args) => {
        if (sql.includes('FROM leads')) return memoryData.leads;
        if (sql.includes('FROM users')) return memoryData.users;
        if (sql.includes('FROM visits')) return memoryData.visits;
        if (sql.includes('FROM messages')) return memoryData.messages;
        if (sql.includes('FROM auto_replies')) return memoryData.auto_replies;
        if (sql.includes('FROM knowledge_base')) return memoryData.knowledge_base;
        return [];
      },
      run: (...args) => {
        const flatArgs = args.flat();
        if (sql.includes('INSERT INTO users')) {
          const [id, name, email, password, role, status, perms, needsCh] = flatArgs;
          memoryData.users.push({ id, name, email, password, role, status, permissions: perms || '', needs_password_change: needsCh || 0, created_at: new Date().toISOString() });
        }
        if (sql.includes('UPDATE users SET password =')) {
          const [hash, id] = flatArgs;
          const u = memoryData.users.find(x => x.id === id);
          if (u) { u.password = hash; u.needs_password_change = 0; }
        }
        if (sql.includes('INSERT INTO leads')) {
          const [id, name, phone, channel, grade, score, status, notes] = flatArgs;
          memoryData.leads.unshift({ id, name, phone, channel, grade, score, status, notes, created_at: new Date().toISOString() });
        }
        return { changes: 1 };
      }
    };
  }
} : db;

module.exports = {
  db: dbProxy,
  getLeads: () => useMemoryStore ? memoryData.leads : db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all(),
  addLead: (lead) => {
    if (useMemoryStore) {
      memoryData.leads.unshift({ ...lead, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO leads (id, name, phone, channel, grade, score, status, notes, student_nationality, student_passport, parent_nationality, parent_passport, birth_date, parent_name, email, address, ai_enabled, follow_up, photo_url, files, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      lead.id, lead.name, lead.phone, lead.channel, lead.grade, lead.score, lead.status, lead.notes,
      lead.student_nationality || null, lead.student_passport || null, lead.parent_nationality || null, lead.parent_passport || null,
      lead.birth_date || null, lead.parent_name || null, lead.email || null, lead.address || null,
      lead.ai_enabled !== undefined ? lead.ai_enabled : 1,
      lead.follow_up !== undefined ? lead.follow_up : 1,
      lead.photo_url || null,
      lead.files || null,
      lead.assigned_to || null
    );
  },
  updateLeadSettings: (id, aiEnabled, followUp) => {
    if (useMemoryStore) {
      const l = memoryData.leads.find(x => x.id === id);
      if (l) { l.ai_enabled = aiEnabled; l.follow_up = followUp; }
      return { changes: 1 };
    }
    return db.prepare('UPDATE leads SET ai_enabled = ?, follow_up = ? WHERE id = ?').run(aiEnabled, followUp, id);
  },
  getKBItems: () => useMemoryStore ? memoryData.knowledge_base : db.prepare('SELECT * FROM knowledge_base ORDER BY created_at DESC').all(),
  addKBItem: (item) => {
    if (useMemoryStore) {
      memoryData.knowledge_base.unshift({ ...item, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO knowledge_base (id, title, content, type, words, status) VALUES (?, ?, ?, ?, ?, ?)').run(item.id, item.title, item.content, item.type, item.words, item.status || 'active');
  },
  updateKBItemStatus: (id, status) => {
    if (useMemoryStore) {
      const k = memoryData.knowledge_base.find(x => x.id === id);
      if (k) k.status = status;
      return { changes: 1 };
    }
    return db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run(status, id);
  },
  deleteKBItem: (id) => {
    if (useMemoryStore) {
      memoryData.knowledge_base = memoryData.knowledge_base.filter(x => x.id !== id);
      return { changes: 1 };
    }
    return db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(id);
  },
  updateLeadStatus: (id, status) => {
    if (useMemoryStore) {
      const l = memoryData.leads.find(x => x.id === id);
      if (l) l.status = status;
      return { changes: 1 };
    }
    return db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  },
  deleteLead: (id) => {
    if (useMemoryStore) {
      memoryData.leads = memoryData.leads.filter(x => x.id !== id);
      return { changes: 1 };
    }
    return db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  },
  getMessages: () => useMemoryStore ? memoryData.messages : db.prepare('SELECT * FROM messages ORDER BY created_at ASC').all(),
  addMessage: (msg) => {
    if (useMemoryStore) {
      memoryData.messages.push({ ...msg, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO messages (id, sender_psid, text, image, channel, time, receiver_id, receiver_name, is_story_reply) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').run(msg.id, msg.sender_psid, msg.text, msg.image || null, msg.channel, msg.time, msg.receiver_id || null, msg.receiver_name || null, msg.is_story_reply || 0);
  },
  addStoryReaction: (reaction) => {
    if (useMemoryStore) {
      memoryData.story_reactions.push({ ...reaction, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO story_reactions (id, sender_psid, emoji, channel, story_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').run(reaction.id, reaction.sender_psid, reaction.emoji, reaction.channel, reaction.story_id || null);
  },
  getStoryReactions: () => useMemoryStore ? memoryData.story_reactions : db.prepare('SELECT * FROM story_reactions ORDER BY created_at DESC').all(),
  getStoryRepliesCount: () => useMemoryStore ? memoryData.messages.filter(m => m.is_story_reply).length : (db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_story_reply = 1').get()?.count || 0),
  getVisits: () => useMemoryStore ? memoryData.visits : db.prepare('SELECT * FROM visits ORDER BY date ASC, time ASC').all(),
  addVisit: (v) => {
    if (useMemoryStore) {
      memoryData.visits.push({ ...v, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO visits (id, lead_id, name, phone, grade, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(v.id, v.lead_id, v.name, v.phone, v.grade, v.date, v.time, v.status || 'pending');
  },
  updateVisitStatus: (id, status) => {
    if (useMemoryStore) {
      const v = memoryData.visits.find(x => x.id === id);
      if (v) v.status = status;
      return { changes: 1 };
    }
    return db.prepare('UPDATE visits SET status = ? WHERE id = ?').run(status, id);
  },
  deleteVisit: (id) => {
    if (useMemoryStore) {
      memoryData.visits = memoryData.visits.filter(x => x.id !== id);
      return { changes: 1 };
    }
    return db.prepare('DELETE FROM visits WHERE id = ?').run(id);
  },
  getUsers: () => useMemoryStore ? memoryData.users.map(({password, ...u}) => u) : db.prepare('SELECT id, name, email, role, status, permissions, assigned_whatsapp, needs_password_change, created_at FROM users').all(),
  addUser: (user) => {
    if (useMemoryStore) {
      memoryData.users.push({ ...user, permissions: user.permissions || '', needs_password_change: 1, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO users (id, name, email, password, role, status, permissions, needs_password_change) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(user.id, user.name, user.email, user.password, user.role, user.status, user.permissions || '', 1);
  },
  deleteUser: (id) => {
    if (useMemoryStore) {
      memoryData.users = memoryData.users.filter(x => x.id !== id);
      return { changes: 1 };
    }
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },
  updateUserStatus: (id, status) => {
    if (useMemoryStore) {
      const u = memoryData.users.find(x => x.id === id);
      if (u) u.status = status;
      return { changes: 1 };
    }
    return db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  },
  updateUserPermissions: (id, perms) => {
    if (useMemoryStore) {
      const u = memoryData.users.find(x => x.id === id);
      if (u) u.permissions = perms;
      return { changes: 1 };
    }
    return db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(perms, id);
  },
  getUserByEmail: (email) => {
    if (useMemoryStore) {
      return memoryData.users.find(u => u.email === email) || null;
    }
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },
  updatePassword: (id, newHash) => {
    if (useMemoryStore) {
      const u = memoryData.users.find(x => x.id === id);
      if (u) { u.password = newHash; u.needs_password_change = 0; }
      return { changes: 1 };
    }
    return db.prepare('UPDATE users SET password = ?, needs_password_change = 0 WHERE id = ?').run(newHash, id);
  },
  getStats: () => {
    if (useMemoryStore) {
      return {
        totalLeads: memoryData.leads.length,
        newToday: memoryData.leads.length,
        activeCampaigns: 0,
        totalSent: memoryData.messages.length,
        upcomingVisits: memoryData.visits.length
      };
    }
    const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
    const newToday = db.prepare("SELECT COUNT(*) as c FROM leads WHERE date(created_at) = date('now')").get().c;
    const activeCampaigns = 0;
    const totalSent = db.prepare("SELECT COUNT(*) as c FROM messages WHERE sender_psid = 'system'").get().c || 0;
    const upcomingVisits = db.prepare("SELECT COUNT(*) as c FROM visits WHERE date >= date('now')").get().c;
    return { totalLeads, newToday, activeCampaigns, totalSent, upcomingVisits };
  },
  getAutoReplies: () => useMemoryStore ? memoryData.auto_replies : db.prepare('SELECT * FROM auto_replies ORDER BY created_at DESC').all(),
  addAutoReply: (r) => {
    if (useMemoryStore) {
      memoryData.auto_replies.push({ ...r, created_at: new Date().toISOString() });
      return { changes: 1 };
    }
    return db.prepare('INSERT INTO auto_replies (id, keyword, response, channel) VALUES (?, ?, ?, ?)').run(r.id, r.keyword, r.response, r.channel || 'all');
  },
  deleteAutoReply: (id) => {
    if (useMemoryStore) {
      memoryData.auto_replies = memoryData.auto_replies.filter(x => x.id !== id);
      return { changes: 1 };
    }
    return db.prepare('DELETE FROM auto_replies WHERE id = ?').run(id);
  },
  getWeeklyStats: () => {
    if (useMemoryStore) return [];
    return db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count 
      FROM leads 
      WHERE created_at >= date('now', '-7 days') 
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all();
  },
  getChannelStats: () => {
    if (useMemoryStore) return [];
    return db.prepare(`
      SELECT channel, COUNT(*) as value 
      FROM messages 
      GROUP BY channel
    `).all();
  },
  getHotLeadsCount: () => {
    if (useMemoryStore) return memoryData.leads.filter(l => ['following', 'interested', 'Hot', 'مهتم'].includes(l.status)).length;
    return db.prepare("SELECT COUNT(*) as c FROM leads WHERE status IN ('following', 'interested', 'Hot', 'مهتم')").get()?.c || 0;
  },
  getDetailedStats: (userId, role) => {
    if (useMemoryStore) {
      return {
        totalLeads: memoryData.leads.length,
        newToday: memoryData.leads.length,
        hotLeads: memoryData.leads.filter(l => ['following', 'interested', 'Hot', 'مهتم'].includes(l.status)).length,
        upcomingVisits: memoryData.visits.length,
        totalSent: memoryData.messages.length,
        gradeDistribution: [],
        channelDistribution: [],
        scheduledLeadsCount: 0,
        registeredLeadsCount: 0,
        engagedLeadsCount: 0,
        weeklyFlow: [],
        recentLeads: memoryData.leads.slice(0, 5),
        funnel: { newLeads: memoryData.leads.length, followingLeads: 0, interestedLeads: 0, registeredLeads: 0, coldLeads: 0 },
        nationalityDistribution: [],
        addressDistribution: []
      };
    }

    const isAgent = role === 'agent' && userId;
    const totalLeads = db.prepare(`SELECT COUNT(*) as c FROM leads ${isAgent ? 'WHERE assigned_to = ?' : ''}`).get(isAgent ? [userId] : [])?.c || 0;
    const newToday = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE date(created_at) = date('now') ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : [])?.c || 0;
    const hotLeads = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status IN ('following', 'interested', 'Hot', 'مهتم') ${isAgent ? 'AND assigned_to = ?' : ''}`).get(isAgent ? [userId] : [])?.c || 0;
    
    let upcomingVisits = db.prepare("SELECT COUNT(*) as c FROM visits WHERE date >= date('now')").get()?.c || 0;
    let totalSent = db.prepare("SELECT COUNT(*) as c FROM messages").get()?.c || 0;

    const gradeDistribution = db.prepare(`SELECT grade, COUNT(*) as count FROM leads WHERE grade IS NOT NULL AND grade != '' GROUP BY grade ORDER BY count DESC`).all();
    const channelDistribution = db.prepare(`SELECT channel, COUNT(*) as count FROM leads GROUP BY channel`).all();
    const scheduledLeadsCount = 0;
    const registeredLeadsCount = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'registered'`).get()?.c || 0;
    const engagedLeadsCount = 0;

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
      SELECT date(created_at) as day, COUNT(*) as leads_count, SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as conv_count
      FROM leads WHERE created_at >= date('now', '-7 days') GROUP BY date(created_at)
    `).all();

    for (const r of aggregatedRows) {
      if (dateMap[r.day]) {
        dateMap[r.day].leads = r.leads_count || 0;
        dateMap[r.day].conv = r.conv_count || 0;
      }
    }

    for (const key of dateKeys) {
      weeklyFlow.push(dateMap[key]);
    }

    const recentLeads = db.prepare(`SELECT * FROM leads ORDER BY created_at DESC LIMIT 5`).all();
    const nationalityDistribution = db.prepare(`SELECT student_nationality as nationality, COUNT(*) as count FROM leads WHERE student_nationality IS NOT NULL AND student_nationality != '' GROUP BY student_nationality ORDER BY count DESC`).all();
    const addressDistribution = db.prepare(`SELECT address, COUNT(*) as count FROM leads WHERE address IS NOT NULL AND address != '' GROUP BY address ORDER BY count DESC`).all();

    const funnel = {
      newLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'new'`).get()?.c || 0,
      followingLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'following'`).get()?.c || 0,
      interestedLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'interested'`).get()?.c || 0,
      registeredLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'registered'`).get()?.c || 0,
      coldLeads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'cold'`).get()?.c || 0,
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
