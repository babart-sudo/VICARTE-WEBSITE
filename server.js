const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vicarte-website.firebasestorage.app'
});

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Vicarte API is working!' });
});

// Contact form route with Firebase
app.post('/api/contact/submit', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, service, message } = req.body;
    
    console.log('Contact form received:', req.body);
    
    // Save to Firebase Firestore
    const contactData = {
      firstName,
      lastName,
      email,
      phone: phone || '',
      service: service || 'General Inquiry',
      message,
      status: 'new',
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
app.get('/api/contacts/all', async (req, res) => {
  try {
    const adminKey = req.headers['admin-key'];
    
    if (adminKey !== 'vicarte_admin_2024') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
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

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Vicarte Server running on http://localhost:${PORT}`);
  console.log(`📝 Frontend available at http://localhost:${PORT}`);
  console.log(`✅ Firebase connected to project: vicarte-website`);
});