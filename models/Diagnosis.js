const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image'], required: true },
  crop: { type: String, required: true },
  symptoms: { type: String }, 
  diagnosis: {
    disease: String,
    cause: String,
    organic: String,
    chemical: String,
    prevention: String,
    confidence: Number,
  },
  imageUrl: { type: String }, 
  sessionId: { type: String, index: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  language: { type: String, default: 'en' },
   severity: { type: String, enum: ['Mild', 'Moderate', 'High'], default: 'Moderate' },
  status: { type: String, enum: ['Resolved', 'Treated', 'In Progress'], default: 'In Progress' },
});

module.exports = mongoose.model('Diagnosis', diagnosisSchema);