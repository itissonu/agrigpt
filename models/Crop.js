const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Vegetable', 'Grain', 'Fruit', 'Pulse'], required: true },
  variety: { type: String, required: true },
  startDate: { type: String, required: true },
  expectedHarvest: { type: String, required: true },
  fieldSize: { type: String, required: true },
  currentStage: { type: String, enum: ['Sowing', 'Growing', 'Flowering', 'Harvesting', 'Harvested'], default: 'Sowing' },
  progress: { type: Number, default: 5 },
  notes: { type: String, default: '' },
  location: { type: String, required: true },
  whenToPluck: { type: String, required: true },
  deviceToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Crop', cropSchema);