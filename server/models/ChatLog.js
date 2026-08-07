const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
  userQuery: { type: String, required: true },
  agentResponse: { type: String, required: true },
  caveats: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatLog', ChatLogSchema);