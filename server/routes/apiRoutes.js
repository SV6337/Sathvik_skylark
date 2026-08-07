const express = require('express');
const router = express.Router();
const { processQuery } = require('../services/agentService');
const ChatLog = require('../models/ChatLog');

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const result = await processQuery(message);

    // Save history to MongoDB if connected
    try {
      await ChatLog.create({
        userQuery: message,
        agentResponse: result.answer,
        caveats: result.caveats,
      });
    } catch (dbErr) {
      console.warn('MongoDB log save warning:', dbErr.message);
    }

    res.json(result);
  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const logs = await ChatLog.find().sort({ timestamp: -1 }).limit(10);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;