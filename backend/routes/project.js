const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('projects')
      .orderBy('createdAt', 'desc')
      .get();
    
    const projects = [];
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project (admin only)
router.post('/', async (req, res) => {
  try {
    const adminKey = req.headers['admin-key'];
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { title, category, description, imageUrl } = req.body;
    
    const projectData = {
      title,
      category,
      description,
      imageUrl: imageUrl || '/logo.jpg',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('projects').add(projectData);
    
    res.status(201).json({
      message: 'Project created successfully',
      id: docRef.id,
      ...projectData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

module.exports = router;