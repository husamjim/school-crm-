const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbModule = require('./db');
const db = dbModule;
const masterDataImporter = require('./services/masterDataImporter');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3001;

const CONFIG_FILE = path.join(__dirname, 'config.json');

function readConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    const rawData = fs.readFileSync(CONFIG_FILE);
    return JSON.parse(rawData);
  }
  return { 
    facebook: { page_access_token: "" },
    instagram: { page_access_token: "" },
    whatsapp: { phone_number_id: "", access_token: "" },
    whatsapp_accounts: []
  };
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// ==========================================
// Security & Rate Limiting Middleware
// ==========================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const rateLimitMap = new Map();
function createRateLimiter(maxRequests = 150, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    record.count++;
    rateLimitMap.set(ip, record);
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Authentication & Authorization Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;
  
  if (!token) {
    if (req.query.userId || req.body?.userId) {
      req.user = { id: req.query.userId || req.body.userId, role: req.query.role || req.body.role || 'agent' };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required. Access token missing.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'gmis_secret_jwt_key_2026', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
}

const authLimiter = createRateLimiter(30, 15 * 60 * 1000);

// ==========================================
// WebSockets Connection
// ==========================================
io.on('connection', (socket) => {
  console.log('🔗 Client connected to Socket.io');
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected');
  });
});

// ==========================================
// Settings API
// ==========================================
app.get('/api/settings/:channel', (req, res) => {
  const channel = req.params.channel;
  const config = readConfig();
  if (channel === 'ai') {
    return res.json(config.ai || { autoReply: false });
  }
  
  if (!config[channel]) config[channel] = {};
  if (channel === 'whatsapp') {
    res.json({
      connected: !!(config.whatsapp.phone_number_id && config.whatsapp.access_token),
      accounts: config.whatsapp_accounts || []
    });
  } else {
    res.json({ connected: !!config[channel].page_access_token });
  }
});

app.post('/api/settings/:channel', (req, res) => {
  const channel = req.params.channel;
  const config = readConfig();

  if (channel === 'ai') {
    config.ai = req.body;
    writeConfig(config);
    return res.json({ success: true, message: 'تم حفظ إعدادات الذكاء الاصطناعي بنجاح' });
  }

  if (!config[channel]) config[channel] = {};
  if (channel === 'whatsapp') {
    if (req.body.is_multi) {
      // Handle multiple accounts
      if (!config.whatsapp_accounts) config.whatsapp_accounts = [];
      const newAcc = { 
        id: req.body.phone_number_id, 
        name: req.body.name || `WhatsApp ${config.whatsapp_accounts.length + 1}`,
        phone_number_id: req.body.phone_number_id,
        access_token: req.body.access_token 
      };
      // Check if exists, update or push
      const idx = config.whatsapp_accounts.findIndex(a => a.id === newAcc.id);
      if (idx > -1) config.whatsapp_accounts[idx] = newAcc;
      else config.whatsapp_accounts.push(newAcc);
    } else {
      config.whatsapp.phone_number_id = req.body.phone_number_id;
      config.whatsapp.access_token = req.body.access_token;
    }
  } else {
    config[channel].page_access_token = req.body.page_access_token;
  }
  
  writeConfig(config);
  res.json({ success: true, message: `تم حفظ الإعدادات بنجاح!` });
});

app.post('/api/settings/:channel/disconnect', (req, res) => {
  const channel = req.params.channel;
  const config = readConfig();
  if (config[channel]) {
    if (channel === 'whatsapp') {
      if (req.body.account_id) {
        config.whatsapp_accounts = (config.whatsapp_accounts || []).filter(a => a.id !== req.body.account_id);
      } else {
        config.whatsapp = { phone_number_id: "", access_token: "" };
      }
    } else {
      config[channel].page_access_token = "";
    }
  }
  writeConfig(config);
  res.json({ success: true, message: 'تم إلغاء الربط بنجاح!' });
});

// ==========================================
// Send API (From React to Meta)
// ==========================================
app.post('/api/messages/send', async (req, res) => {
  const { recipient_id, text, channel } = req.body || {};
  const config = readConfig();

  // Save outgoing message to DB and emit to socket clients first!
  const msgId = req.body.id || `agent_${Date.now()}`;
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const msgObj = {
    id: msgId,
    sender_psid: recipient_id,
    text: text,
    channel: channel,
    time: timeStr,
    receiver_id: 'agent',
    receiver_name: 'Agent',
    from: 'agent'
  };

  try {
    db.addMessage(msgObj);
    io.emit('new_message', msgObj);
  } catch(e) {
    console.error("Error saving outgoing message to SQLite:", e.message);
  }

  try {
    if (channel === 'whatsapp') {
      let token = config.whatsapp?.access_token || process.env.WA_ACCESS_TOKEN;
      let phone_id = config.whatsapp?.phone_number_id || process.env.WA_PHONE_ID;
      
      // If a specific receiver_id is provided, find its token
      if (req.body.receiver_id) {
        const acc = (config.whatsapp_accounts || []).find(a => a.phone_number_id === req.body.receiver_id);
        if (acc) {
          token = acc.access_token;
          phone_id = acc.phone_number_id;
        }
      }

      if (token && phone_id) {
        await axios.post(`https://graph.facebook.com/v19.0/${phone_id}/messages`, {
          messaging_product: "whatsapp",
          to: recipient_id,
          type: "text",
          text: { body: text }
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        console.warn("WhatsApp tokens missing, skipping external API call.");
      }
      
    } else {
      // Facebook & Instagram
      const token = config[channel]?.page_access_token || process.env.PAGE_ACCESS_TOKEN;
      if (token) {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
          recipient: { id: recipient_id },
          message: { text: text }
        });
      } else {
        console.warn(`${channel} token missing, skipping external API call.`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(`Failed to send via ${channel} externally:`, err.response?.data || err.message);
    // Return success true anyway since the message was successfully saved to DB and emitted to the front-end
    res.json({ success: true, warning: `Saved locally, but failed to dispatch to Meta: ${err.message}` });
  }
});

// ==========================================
// Database API Endpoints
// ==========================================
app.get('/api/leads', (req, res) => {
  const { userId, role } = req.query;
  if (role === 'agent' && userId) {
    res.json(db.db.prepare('SELECT * FROM leads WHERE assigned_to = ? ORDER BY created_at DESC').all(userId));
  } else {
    res.json(db.getLeads());
  }
});

app.post('/api/leads/:id/assign', (req, res) => {
  const { assigned_to } = req.body || {};
  try {
    db.db.prepare('UPDATE leads SET assigned_to = ? WHERE id = ?').run(assigned_to || null, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', (req, res) => {
  try {
    db.addLead(req.body);
    // Mock Email Notification
    const config = readConfig();
    const adminEmail = config.admin_email || 'admin@gmis.edu';
    console.log(`📧 Notification: New lead registered: ${req.body.name}. Sending alert to ${adminEmail}...`);
    
    // Auto upload to Google Drive asynchronously
    if (req.body.id) {
      uploadLeadToDrive(req.body.id).catch(err => {
        console.error('Failed auto upload to Drive inside POST /api/leads:', err.message);
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/import', (req, res) => {
  try {
    const { format, data, csvText } = req.body || {};
    let records = [];
    if (format === 'csv' || typeof csvText === 'string') {
      records = masterDataImporter.parseCSV(csvText || data);
    } else if (Array.isArray(data)) {
      records = data;
    } else if (typeof data === 'string') {
      try {
        records = JSON.parse(data);
      } catch (e) {
        records = masterDataImporter.parseCSV(data);
      }
    }
    
    const result = masterDataImporter.importMasterData(records);
    res.json({
      success: true,
      message: `Master data imported successfully: ${result.imported} new records added, ${result.updated} records updated.`,
      result
    });
  } catch (err) {
    console.error("Master data import error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/visits', (req, res) => {
  const { userId, role } = req.query;
  if (role === 'agent' && userId) {
    res.json(db.db.prepare(`
      SELECT v.* FROM visits v
      JOIN leads l ON v.phone = l.phone OR v.name = l.name
      WHERE l.assigned_to = ?
      ORDER BY v.date ASC, v.time ASC
    `).all(userId));
  } else {
    res.json(db.getVisits());
  }
});

app.post('/api/visits', (req, res) => {
  try {
    const visit = { ...req.body, id: Date.now().toString() };
    db.addVisit(visit);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/visits/:id/status', (req, res) => {
  try {
    db.updateVisitStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/visits/:id', (req, res) => {
  try {
    db.deleteVisit(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/:id/status', (req, res) => {
  try {
    db.updateLeadStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/:id/settings', (req, res) => {
  const { ai_enabled, follow_up } = req.body || {};
  try {
    const current = db.db.prepare('SELECT ai_enabled, follow_up FROM leads WHERE id = ?').get(req.params.id);
    const existingAi = current ? current.ai_enabled : 1;
    const existingFollow = current ? current.follow_up : 1;

    const final_ai = ai_enabled !== undefined ? (ai_enabled ? 1 : 0) : existingAi;
    const final_follow = follow_up !== undefined ? (follow_up ? 1 : 0) : existingFollow;

    db.updateLeadSettings(req.params.id, final_ai, final_follow);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// General file uploader (base64)
app.post('/api/upload', (req, res) => {
  const { fileName, fileData } = req.body || {};
  if (!fileData) return res.status(400).json({ error: 'No file data provided' });
  try {
    const base64Data = fileData.replace(/^data:.*;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);
    
    fs.writeFileSync(filePath, fileBuffer);
    const fileUrl = `/uploads/${uniqueFileName}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error("General upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Specific lead photo or document uploader (base64)
app.post('/api/leads/:id/upload', (req, res) => {
  const { id } = req.params;
  const { fileName, fileType, fileData, category } = req.body || {}; // category = 'photo' | 'document'
  
  if (!fileData) {
    return res.status(400).json({ error: 'No file data provided' });
  }
  
  try {
    const base64Data = fileData.replace(/^data:.*;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const uniqueFileName = `${Date.now()}-${id}-${fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);
    
    fs.writeFileSync(filePath, fileBuffer);
    const fileUrl = `/uploads/${uniqueFileName}`;
    
    if (category === 'photo') {
      db.db.prepare('UPDATE leads SET photo_url = ? WHERE id = ?').run(fileUrl, id);
      res.json({ success: true, url: fileUrl });
    } else {
      const lead = db.db.prepare('SELECT files FROM leads WHERE id = ?').get(id);
      let files = [];
      if (lead && lead.files) {
        try {
          files = JSON.parse(lead.files);
        } catch(e) {
          files = [];
        }
      }
      files.push({ name: fileName, url: fileUrl, type: fileType || 'image' });
      db.db.prepare('UPDATE leads SET files = ? WHERE id = ?').run(JSON.stringify(files), id);
      res.json({ success: true, files });
    }
  } catch (err) {
    console.error("Lead upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete lead file
app.post('/api/leads/:id/delete-file', (req, res) => {
  const { id } = req.params;
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'No file url provided' });
  
  try {
    const lead = db.db.prepare('SELECT files FROM leads WHERE id = ?').get(id);
    if (lead && lead.files) {
      let files = [];
      try {
        files = JSON.parse(lead.files);
      } catch(e) {
        files = [];
      }
      
      const filtered = files.filter(f => f.url !== url);
      db.db.prepare('UPDATE leads SET files = ? WHERE id = ?').run(JSON.stringify(filtered), id);
      
      // Attempt to delete actual file on disk
      const fileName = path.basename(url);
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true, files: filtered });
    } else {
      res.json({ success: true });
    }
  } catch(err) {
    console.error("Delete file error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, grade, notes, student_nationality, student_passport, parent_nationality, parent_passport, birth_date, parent_name, email, address } = req.body || {};
  try {
    db.db.prepare(`
      UPDATE leads 
      SET name = ?, phone = ?, grade = ?, notes = ?, student_nationality = ?, student_passport = ?, parent_nationality = ?, parent_passport = ?, birth_date = ?, parent_name = ?, email = ?, address = ?
      WHERE id = ?
    `).run(name, phone, grade, notes, student_nationality || null, student_passport || null, parent_nationality || null, parent_passport || null, birth_date || null, parent_name || null, email || null, address || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads/:id', (req, res) => {
  try {
    db.deleteLead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages', (req, res) => {
  const { userId, role } = req.query;
  if (role === 'agent' && userId) {
    const user = db.db.prepare('SELECT assigned_whatsapp FROM users WHERE id = ?').get(userId);
    const assignedWa = user ? user.assigned_whatsapp : null;
    if (assignedWa) {
      res.json(db.db.prepare(`
        SELECT m.* FROM messages m
        JOIN leads l ON m.sender_psid = l.phone OR m.sender_psid = l.id
        WHERE l.assigned_to = ? AND (m.channel != 'whatsapp' OR m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `).all(userId, assignedWa));
    } else {
      res.json(db.db.prepare(`
        SELECT m.* FROM messages m
        JOIN leads l ON m.sender_psid = l.phone OR m.sender_psid = l.id
        WHERE l.assigned_to = ?
        ORDER BY m.created_at ASC
      `).all(userId));
    }
  } else {
    res.json(db.getMessages());
  }
});

app.get('/api/social-stats', (req, res) => {
  try {
    const reactions = db.getStoryReactions();
    const storyRepliesCount = db.getStoryRepliesCount();
    
    const fbMsgs = db.db.prepare("SELECT COUNT(*) as c FROM messages WHERE channel = 'facebook'").get().c || 0;
    const igMsgs = db.db.prepare("SELECT COUNT(*) as c FROM messages WHERE channel = 'instagram'").get().c || 0;
    const waMsgs = db.db.prepare("SELECT COUNT(*) as c FROM messages WHERE channel = 'whatsapp'").get().c || 0;
    
    const fbLeads = db.db.prepare("SELECT COUNT(*) as c FROM leads WHERE channel = 'facebook'").get().c || 0;
    const igLeads = db.db.prepare("SELECT COUNT(*) as c FROM leads WHERE channel = 'instagram'").get().c || 0;
    const waLeads = db.db.prepare("SELECT COUNT(*) as c FROM leads WHERE channel = 'whatsapp'").get().c || 0;
    const webLeads = db.db.prepare("SELECT COUNT(*) as c FROM leads WHERE channel = 'web' OR channel IS NULL OR channel = ''").get().c || 0;
    const totalLeads = db.db.prepare("SELECT COUNT(*) as c FROM leads").get().c || 0;
    
    const fbReactions = db.db.prepare("SELECT COUNT(*) as c FROM story_reactions WHERE channel = 'facebook'").get().c || 0;
    const igReactions = db.db.prepare("SELECT COUNT(*) as c FROM story_reactions WHERE channel = 'instagram'").get().c || 0;

    // 1. Location Data from DB (Address breakdown of real leads)
    const rawLocations = db.db.prepare(`
      SELECT address as name, COUNT(*) as value 
      FROM leads 
      WHERE address IS NOT NULL AND address != ''
      GROUP BY address 
      ORDER BY value DESC 
      LIMIT 6
    `).all();
    
    // Fallbacks if DB is empty of addresses
    const locationData = rawLocations.length > 0 ? rawLocations : [
      { name: 'الرياض / Riyadh', value: 12 },
      { name: 'جدة / Jeddah', value: 8 },
      { name: 'الدمام / Dammam', value: 5 }
    ];

    // 2. Timeline growth data (messages + reactions over last 6 days)
    const timelineData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const fbMsgsOnDate = db.db.prepare("SELECT COUNT(*) as c FROM messages WHERE channel = 'facebook' AND date(created_at) = ?").get(dateStr)?.c || 0;
      const igMsgsOnDate = db.db.prepare("SELECT COUNT(*) as c FROM messages WHERE channel = 'instagram' AND date(created_at) = ?").get(dateStr)?.c || 0;
      const fbReactsOnDate = db.db.prepare("SELECT COUNT(*) as c FROM story_reactions WHERE channel = 'facebook' AND date(created_at) = ?").get(dateStr)?.c || 0;
      const igReactsOnDate = db.db.prepare("SELECT COUNT(*) as c FROM story_reactions WHERE channel = 'instagram' AND date(created_at) = ?").get(dateStr)?.c || 0;

      const label = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      
      timelineData.push({
        date: label,
        fbLikes: fbReactsOnDate,
        fbViews: fbMsgsOnDate * 10 + fbReactsOnDate * 5 + 50, // Base level reach
        igLikes: igReactsOnDate,
        igViews: igMsgsOnDate * 12 + igReactsOnDate * 6 + 80
      });
    }

    // 3. Traffic channel data
    const channelData = [
      { name: 'Facebook', value: fbMsgs + fbLeads + fbReactions },
      { name: 'Instagram', value: igMsgs + igLeads + igReactions },
      { name: 'WhatsApp', value: waMsgs + waLeads },
      { name: 'Web Portal', value: webLeads }
    ].filter(ch => ch.value > 0);

    if (channelData.length === 0) {
      channelData.push({ name: 'Web Portal', value: 1 });
    }

    res.json({
      success: true,
      storyRepliesCount,
      reactionsCount: reactions.length,
      reactionsList: reactions,
      facebookMessagesCount: fbMsgs,
      instagramMessagesCount: igMsgs,
      fbLeads,
      igLeads,
      waLeads,
      webLeads,
      totalLeads,
      fbReactions,
      igReactions,
      locationData,
      timelineData,
      channelData
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stats', (req, res) => {
  const { userId, role } = req.query;
  const dStats = db.getDetailedStats(userId, role);
  
  const channelColors = {
    whatsapp: '#14C35D',
    facebook: '#1a4fa8',
    instagram: '#f59e0b',
    web: '#64748b'
  };
  
  const channelData = dStats.channelDistribution.map(c => {
    const ch = c.channel || 'web';
    return {
      name: ch.charAt(0).toUpperCase() + ch.slice(1),
      value: c.count,
      color: channelColors[ch] || '#cbd5e1'
    };
  });

  const weekData = dStats.weeklyFlow;

  const totalLeads = dStats.totalLeads;
  const scheduledRate = totalLeads > 0 ? Math.round((dStats.scheduledLeadsCount / totalLeads) * 100) + '%' : '0%';
  const registeredRate = totalLeads > 0 ? Math.round((dStats.registeredLeadsCount / totalLeads) * 100) + '%' : '0%';
  const activeRate = totalLeads > 0 ? Math.round((dStats.engagedLeadsCount / totalLeads) * 100) + '%' : '0%';

  res.json({
    totalLeads: dStats.totalLeads,
    newToday: dStats.newToday,
    upcomingVisits: dStats.upcomingVisits,
    hotLeads: dStats.hotLeads,
    totalSent: dStats.totalSent,
    weekData,
    channelData,
    gradeDistribution: dStats.gradeDistribution,
    conversionMetrics: {
      scheduledRate,
      registeredRate,
      activeRate
    },
    recentLeads: dStats.recentLeads,
    funnel: dStats.funnel,
    nationalityDistribution: dStats.nationalityDistribution,
    addressDistribution: dStats.addressDistribution
  });
});

app.get('/api/users', (req, res) => {
  res.json(db.getUsers());
});

app.post('/api/users', (req, res) => {
  try {
    const user = { ...req.body, id: Date.now().toString(), password: bcrypt.hashSync(req.body.password || '123456', 10) };
    db.addUser(user);
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const user = db.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'gmis_secret_jwt_key_2026', { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions, assigned_whatsapp: user.assigned_whatsapp, needs_password_change: user.needs_password_change } });
});

app.post('/api/auth/change-password', (req, res) => {
  const { userId, newPassword } = req.body || {};
  try {
    const hash = bcrypt.hashSync(newPassword, 10);
    db.updatePassword(userId, hash);
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    db.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/status', (req, res) => {
  try {
    db.updateUserStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/permissions', (req, res) => {
  const { permissions, assigned_whatsapp } = req.body || {};
  try {
    db.db.prepare('UPDATE users SET permissions = ?, assigned_whatsapp = ? WHERE id = ?').run(permissions, assigned_whatsapp || null, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Auto-Replies API
// ==========================================
app.get('/api/auto-replies', (req, res) => {
  res.json(db.getAutoReplies());
});

app.post('/api/auto-replies', (req, res) => {
  try {
    const id = Date.now().toString();
    db.addAutoReply({ id, ...req.body });
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// Knowledge Base API
// ==========================================
app.get('/api/kb', (req, res) => {
  res.json(db.getKBItems());
});

app.post('/api/kb', (req, res) => {
  try {
    const item = { ...req.body, id: Date.now().toString() };
    db.addKBItem(item);
    res.json({ success: true, item });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/kb/:id/status', (req, res) => {
  try {
    db.updateKBItemStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/kb/:id', (req, res) => {
  try {
    db.deleteKBItem(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/auto-replies/:id', (req, res) => {
  try {
    db.deleteAutoReply(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// Meta Webhooks Verification
// ==========================================
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
    
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing mode or token');
  }
});

// ==========================================
// Receiving Webhooks (from Meta to React)
// ==========================================
app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('📩 Incoming Webhook:', JSON.stringify(body, null, 2));
  res.status(200).send('EVENT_RECEIVED'); // Always respond 200 OK immediately

  // AI Schedule Check
  const config = readConfig();
  
  // Helper to check and send auto-reply
  const handleAutoReply = async (sender_psid, text, channel, receiver_id = null) => {
    const lead = db.prepare("SELECT ai_enabled FROM leads WHERE phone = ? OR id = ?").get(sender_psid, sender_psid);
    if (lead && lead.ai_enabled === 0) {
      console.log(`🤖 AI auto-reply is disabled for contact: ${sender_psid}. Skipping.`);
      return false;
    }

    const replies = db.getAutoReplies();
    const match = replies.find(r => 
      (r.channel === 'all' || r.channel === channel) && 
      text.toLowerCase().includes(r.keyword.toLowerCase())
    );

    if (match) {
      console.log(`🤖 Auto-reply triggered by keyword "${match.keyword}" on ${channel}`);
      // Send message via our send API logic (internal call)
      try {
        let token, phone_id;
        if (channel === 'whatsapp') {
          const acc = (config.whatsapp_accounts || []).find(a => a.phone_number_id === receiver_id) || config.whatsapp;
          token = acc.access_token;
          phone_id = acc.phone_number_id;
          
          await axios.post(`https://graph.facebook.com/v19.0/${phone_id}/messages`, {
            messaging_product: "whatsapp",
            to: sender_psid,
            type: "text",
            text: { body: match.response }
          }, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          token = config[channel]?.page_access_token;
          await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
            recipient: { id: sender_psid },
            message: { text: match.response }
          });
        }
        
        // Save outgoing message to DB
        db.addMessage({
          id: `auto_${Date.now()}`,
          sender_psid: sender_psid,
          text: match.response,
          channel: channel,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          receiver_id: 'system',
          receiver_name: 'Auto-Reply'
        });
        io.emit('new_message', { sender_psid, text: match.response, channel, from: 'ai' });
      } catch (err) {
        console.error('Failed to send auto-reply:', err.message);
      }
      return true;
    }
    return false;
  };

  if (config.ai?.scheduled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = config.ai.startTime || "00:00";
    const end = config.ai.endTime || "23:59";
    
    if (currentTime < start || currentTime > end) {
      console.log(`🤖 AI is outside scheduled hours (${start}-${end}). Current: ${currentTime}. Ignoring auto-reply.`);
      // We still log the message to DB but don't trigger AI auto-reply
      // (The auto-reply logic would be inside the processing block below)
    }
  }

  const QUICK_REACTIONS = ['❤️', '🙌', '🔥', '👏', '😂', '😮', '😢', '🎉', '👍', '😢', '😍', '🔥'];

  if (body.object === 'page' || body.object === 'instagram') {
    body.entry.forEach(entry => {
      const webhook_event = entry.messaging[0];
      if (!webhook_event) return;

      // Check if it's a reaction
      let isStoryReaction = false;
      let isStoryReply = 0;
      let storyId = null;
      let emoji = '❤️';

      if (webhook_event.reaction) {
        isStoryReaction = true;
        emoji = webhook_event.reaction.emoji || '❤️';
      }

      if (webhook_event.message) {
        let text = webhook_event.message.text;
        let image = null;

        if (webhook_event.message.reply_to && webhook_event.message.reply_to.story) {
          storyId = webhook_event.message.reply_to.story.id;
          const textTrim = (text || '').trim();
          if (QUICK_REACTIONS.includes(textTrim) || textTrim.length <= 2) {
            isStoryReaction = true;
            emoji = textTrim || '❤️';
          } else {
            isStoryReply = 1;
          }
        }

        if (isStoryReaction) {
          const reactionObj = {
            id: webhook_event.message.mid || `react_${Date.now()}_${Math.random()}`,
            sender_psid: webhook_event.sender.id,
            emoji: emoji,
            channel: body.object === 'instagram' ? 'instagram' : 'facebook',
            story_id: storyId
          };
          try {
            db.addStoryReaction(reactionObj);
            io.emit('new_story_reaction', reactionObj);
            console.log(`✨ Saved story reaction (${emoji}) from PSID: ${reactionObj.sender_psid}`);
          } catch(e) { console.error("Error saving story reaction:", e.message); }
        } else {
          // Normal message or story reply
          const isEcho = webhook_event.message.is_echo || webhook_event.sender.id === entry.id;
          if (webhook_event.message.attachments) {
            const att = webhook_event.message.attachments[0];
            if (att.type === 'image') {
              image = att.payload.url;
              if (!text) text = "[صورة / ملصق]";
            } else {
              if (!text) text = "[ملف وسائط]";
            }
          }

          if (isEcho) {
            const msgObj = {
              id: webhook_event.message.mid || Date.now().toString(),
              sender_psid: webhook_event.recipient.id, // Store under the lead's ID
              text: text || "[رسالة غير معروفة]",
              image: image,
              channel: body.object === 'instagram' ? 'instagram' : 'facebook',
              is_story_reply: 0,
              receiver_id: 'agent', // Mark as outgoing agent message
              receiver_name: 'Agent',
              from: 'agent',
              time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            };
            try {
              db.addMessage(msgObj);
              io.emit('new_message', msgObj);
              console.log(`ℹ️ Received echo webhook for outgoing message: ${msgObj.text}`);
            } catch (err) {
              console.error('❌ Error saving FB/IG echo message:', err.message);
            }
          } else {
            const msgObj = {
              id: webhook_event.message.mid || Date.now().toString(),
              sender_psid: webhook_event.sender.id,
              text: text || "[رسالة غير معروفة]",
              image: image,
              channel: body.object === 'instagram' ? 'instagram' : 'facebook',
              is_story_reply: isStoryReply,
              time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            };
            try {
              db.addMessage(msgObj);
              io.emit('new_message', msgObj);
              if (webhook_event.message.text) {
                handleAutoReply(msgObj.sender_psid, msgObj.text, msgObj.channel);
              }
            } catch (err) {
              console.error('❌ Error saving FB/IG message:', err.message);
            }
          }
        }
      } else if (isStoryReaction) {
        // Reaction event without message body
        const reactionObj = {
          id: `react_${Date.now()}_${Math.random()}`,
          sender_psid: webhook_event.sender.id,
          emoji: emoji,
          channel: body.object === 'instagram' ? 'instagram' : 'facebook',
          story_id: null
        };
        try {
          db.addStoryReaction(reactionObj);
          io.emit('new_story_reaction', reactionObj);
          console.log(`✨ Saved standalone message reaction (${emoji})`);
        } catch(e) { console.error("Error saving standalone reaction:", e.message); }
      }
    });
  } else if (body.object === 'whatsapp_business_account') {
    body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.value.messages) {
          const msg = change.value.messages[0];
          if (msg.type === 'text' || msg.type === 'image' || msg.type === 'sticker') {
            const receiver_id = change.value.metadata.phone_number_id;
            const account = (config.whatsapp_accounts || []).find(a => a.phone_number_id === receiver_id);
            const receiver_name = account ? account.name : `WhatsApp (${receiver_id})`;

            const msgObj = {
              id: msg.id,
              sender_psid: change.value.contacts[0].wa_id,
              text: msg.text?.body || (msg.type === 'image' ? '[صورة]' : '[ملصق]'),
              image: msg.image?.url || null, // Note: WhatsApp images usually need a separate fetch for the URL via ID
              channel: 'whatsapp',
              receiver_id: receiver_id,
              receiver_name: receiver_name,
              time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            };
            db.addMessage(msgObj);
            io.emit('new_message', msgObj);
            handleAutoReply(msgObj.sender_psid, msgObj.text, msgObj.channel, msgObj.receiver_id);
          }
        }
      });
    });
  }
});

// ==========================================
// Google Drive Integration API
// ==========================================
async function getGoogleDriveAccessToken(creds) {
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  };

  const signedJwt = jwt.sign(payload, creds.private_key, { algorithm: 'RS256' });

  const response = await axios.post('https://oauth2.googleapis.com/token', 
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data.access_token;
}

async function createGoogleDriveFolder(name, token, parentId = null) {
  const data = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    data.parents = [parentId];
  }
  const response = await axios.post('https://www.googleapis.com/drive/v3/files', 
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.id;
}

async function getOrCreateRootFolder(token) {
  const query = encodeURIComponent("name='CRM GMIS' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const res = await axios.get(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return await createGoogleDriveFolder('CRM GMIS', token);
}

async function findStudentFolder(studentId, parentFolderId, token) {
  const query = encodeURIComponent(`name contains '${studentId}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`);
  const res = await axios.get(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0];
  }
  return null;
}

async function renameFolder(folderId, newName, token) {
  await axios.patch(`https://www.googleapis.com/drive/v3/files/${folderId}`, 
    { name: newName },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function findFileInFolder(name, folderId, token) {
  const query = encodeURIComponent(`name = '${name}' and '${folderId}' in parents and trashed=false`);
  const res = await axios.get(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return null;
}

async function uploadGoogleDriveTextFile(name, content, folderId, token) {
  const existingFileId = await findFileInFolder(name, folderId, token);
  if (existingFileId) {
    await axios.patch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, 
      content,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain; charset=UTF-8'
        }
      }
    );
    return;
  }

  const boundary = 'foo_bar_boundary';
  const metadata = JSON.stringify({
    name,
    parents: [folderId]
  });

  const body = 
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', 
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      }
    }
  );
}

async function uploadGoogleDriveBinaryFile(name, buffer, mimeType, folderId, token) {
  const existingFileId = await findFileInFolder(name, folderId, token);
  if (existingFileId) {
    await axios.patch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, 
      buffer,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType
        }
      }
    );
    return;
  }

  const boundary = 'foo_bar_boundary';
  const metadata = JSON.stringify({
    name,
    parents: [folderId]
  });

  const headerPart = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );

  const footerPart = Buffer.from(`\r\n--${boundary}--`);
  const bodyBuffer = Buffer.concat([headerPart, buffer, footerPart]);

  await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', 
    bodyBuffer,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      }
    }
  );
}

async function uploadLeadToDrive(id) {
  const googleDriveCredsPath = path.join(__dirname, 'google_drive_credentials.json');

  if (!fs.existsSync(googleDriveCredsPath)) {
    throw new Error('Google Drive credentials file not found. Please upload it via Settings.');
  }

  const creds = JSON.parse(fs.readFileSync(googleDriveCredsPath, 'utf8'));
  const token = await getGoogleDriveAccessToken(creds);

  const lead = db.db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) {
    throw new Error('Student not found in database');
  }

  const parentFolderId = await getOrCreateRootFolder(token);

  const existingFolder = await findStudentFolder(lead.id, parentFolderId, token);
  let folderId;
  const folderName = `${lead.name} - ${lead.grade || 'General'} - ${lead.id}`;
  
  if (existingFolder) {
    folderId = existingFolder.id;
    if (existingFolder.name !== folderName) {
      await renameFolder(folderId, folderName, token);
    }
  } else {
    folderId = await createGoogleDriveFolder(folderName, token, parentFolderId);
  }

  const infoContent = `================================================
GMIS School - Student Enrollment Application File
================================================
Student ID: ${lead.id}
Student Name: ${lead.name}
Grade Level: ${lead.grade || '—'}
Date of Birth: ${lead.birth_date || '—'}
Nationality: ${lead.student_nationality || '—'}
Passport/ID: ${lead.student_passport || '—'}

PARENT / GUARDIAN INFORMATION:
Name: ${lead.parent_name || '—'}
Phone: ${lead.phone || '—'}
Email: ${lead.email || '—'}
Address: ${lead.address || '—'}
Parent Nationality: ${lead.parent_nationality || '—'}
Parent Passport/ID: ${lead.parent_passport || '—'}

STATUS & CHANNELS:
Pipeline Status: ${lead.status}
Source Channel: ${lead.channel}
Lead Interest Score: ${lead.score}%
Created At: ${lead.created_at}

ADMINISTRATIVE NOTES:
${lead.notes || 'No administrative notes.'}
================================================
Generated and Uploaded: ${new Date().toLocaleString()}
`;

  await uploadGoogleDriveTextFile('student_application_details.txt', infoContent, folderId, token);

  let files = [];
  if (lead.files) {
    try {
      files = JSON.parse(lead.files);
    } catch (e) {
      files = [];
    }
  }

  if (lead.photo_url) {
    files.push({
      name: 'student_profile_photo' + path.extname(lead.photo_url),
      url: lead.photo_url,
      type: 'image'
    });
  }

  let uploadedCount = 0;
  for (const f of files) {
    const fileName = path.basename(f.url);
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      let mimeType = 'application/octet-stream';
      if (f.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
      else if (f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (f.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      
      await uploadGoogleDriveBinaryFile(f.name, fileBuffer, mimeType, folderId, token);
      uploadedCount++;
    }
  }

  return { folderName, uploadedCount };
}

app.post('/api/leads/:id/upload-to-drive', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await uploadLeadToDrive(id);
    res.json({
      success: true,
      message: 'Successfully uploaded student details and files to Google Drive.',
      folderName: result.folderName,
      uploadedCount: result.uploadedCount
    });
  } catch (err) {
    console.error('Google Drive Integration Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/sync-all-drive', async (req, res) => {
  try {
    const leads = db.getLeads();
    let successCount = 0;
    let failCount = 0;
    for (const lead of leads) {
      try {
        await uploadLeadToDrive(lead.id);
        successCount++;
      } catch (err) {
        console.error(`Error uploading lead ${lead.id} to Drive during bulk sync:`, err.message);
        failCount++;
      }
    }
    res.json({
      success: true,
      message: `تمت عملية المزامنة بنجاح: تم رفع وتحديث ${successCount} ملفات طلاب، وفشل ${failCount}.`,
      successCount,
      failCount
    });
  } catch (err) {
    console.error('Google Drive Bulk Sync Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings/google-drive-credentials', (req, res) => {
  const { fileData } = req.body || {};
  if (!fileData) return res.status(400).json({ error: 'No credentials file data provided' });
  try {
    const base64Data = fileData.replace(/^data:.*;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const googleDriveCredsPath = path.join(__dirname, 'google_drive_credentials.json');
    fs.writeFileSync(googleDriveCredsPath, fileBuffer);
    res.json({ success: true, message: 'Google Drive credentials file uploaded successfully.' });
  } catch (err) {
    console.error("Credentials file save error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// Serve Static Files & SPA Routing
// ==========================================
// 1. Serve static files from the React dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// 2. Catch-all route to serve index.html for any request that doesn't match an API route
// This is critical for React Router to handle refreshes on sub-pages like /crm or /booking
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/webhook')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    next();
  }
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 الخادم يعمل على البورت: ${PORT}`);
  console.log(`🔗 رابط الـ Webhook الخاص بك: http://localhost:${PORT}/webhook`);
  console.log(`=========================================`);
});
