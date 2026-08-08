require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Firebase credentials:
// - Locally: read from firebase-admin-key.json (gitignored, stays on your machine)
// - On Vercel: read from the FIREBASE_SERVICE_ACCOUNT env var, since the JSON
//   file never gets deployed (it's not in git)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('./firebase-admin-key.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vicarte-website.firebasestorage.app'
});

const db = admin.firestore();
const app = express();

// Email transporter — set EMAIL_USER and EMAIL_PASS in .env locally,
// and in Vercel's Environment Variables settings for the deployed site.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Admin key — set ADMIN_KEY in .env locally and in Vercel's Environment
// Variables for the deployed site. Falls back to your old hardcoded value
// so nothing breaks if you haven't set it yet.
const ADMIN_KEY = process.env.ADMIN_KEY || 'vicarte_admin_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function requireAdmin(req, res, next) {
  const adminKey = req.headers['admin-key'];
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Vicarte API is working!' });
});

// Contact form route with Firebase
app.post('/api/contact/submit', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, service, message } = req.body;

    console.log('Contact form received:', req.body);

    const contactData = {
      firstName,
      lastName,
      email,
      phone: phone || '',
      service: service || 'General Inquiry',
      message,
      status: 'new',
      reply: '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('contacts').add(contactData);
    console.log('Saved to Firebase with ID:', docRef.id);

    res.json({
      success: true,
      message: 'Inquiry submitted successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Error saving to Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit inquiry',
      error: error.message
    });
  }
});

// Get all contacts (admin only)
app.get('/api/contacts/all', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('contacts')
      .orderBy('createdAt', 'desc')
      .get();

    const contacts = [];
    snapshot.forEach(doc => {
      contacts.push({ id: doc.id, ...doc.data() });
    });

    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Save a reply, email the customer, and mark as replied (admin only)
app.patch('/api/contacts/:id/reply', requireAdmin, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const docRef = db.collection('contacts').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Inquiry not found' });
    const contact = doc.data();

    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"Vicarte Interior Concept" <${process.env.EMAIL_USER}>`,
          to: contact.email,
          subject: 'Re: Your inquiry to Vicarte Interior Concept',
          text: reply,
          html: reply.replace(/\n/g, '<br>')
        });
        emailSent = true;
      } catch (mailErr) {
        console.error('Email send failed:', mailErr);
      }
    } else {
      console.error('EMAIL_USER or EMAIL_PASS is missing — check your env vars.');
    }

    await docRef.update({
      reply,
      status: 'replied',
      repliedAt: new Date().toISOString()
    });

    res.json({ success: true, emailSent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// Update status only — e.g. archive, mark unread (admin only)
app.patch('/api/contacts/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db.collection('contacts').doc(req.params.id).update({ status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Vicarte Server running on http://localhost:${PORT}`);
  console.log(`📝 Frontend available at http://localhost:${PORT}`);
  console.log(`✅ Firebase connected to project: vicarte-website`);
  console.log(process.env.EMAIL_USER ? `✅ Email configured for: ${process.env.EMAIL_USER}` : '⚠️  EMAIL_USER not set — replies will save but not email');
});

module.exports = app;