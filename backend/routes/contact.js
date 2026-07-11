const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const db = admin.firestore();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Submit contact form
router.post('/submit', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, service, message } = req.body;
    
    // Save to Firestore
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
    
    // Send email notification (optional - will work when you add real email)
    if (process.env.EMAIL_USER !== 'your_gmail@gmail.com') {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New Inquiry from ${firstName} ${lastName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Service:</strong> ${service || 'Not specified'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
    }
    
    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// Get all contacts (admin only)
router.get('/all', async (req, res) => {
  try {
    const adminKey = req.headers['admin-key'];
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
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

module.exports = router;