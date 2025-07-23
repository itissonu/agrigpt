
const mongoose = require('mongoose');

const DiseaseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  crop: { type: String, required: true },
  crop_category: { type: String },
  disease_name: { type: String, required: true },
  pathogen_type: { type: String },
  pathogen_name: { type: String },
  disease_category: { type: String },
  symptoms: { type: String },
  severity: { type: String },

  major_states: [{ type: String }],
  season: { type: String },
  yield_loss: { type: String },

  chemical_treatments: [{ type: String }],
  biological_treatments: [{ type: String }],
  organic_treatments: [{ type: String }],
  cultural_practices: [{ type: String }],
  prevention_methods: [{ type: String }],

  economic_impact: { type: String },

  affected_plant_parts: [{ type: String }],

  environmental_conditions: {
    temperature: { type: String },
    humidity: { type: String },
    rainfall: { type: String }
  },

  diagnostic_methods: [{ type: String }],
  resistance_sources: { type: String },
  quarantine_significance: { type: String },
  distribution: { type: String },
  host_range: { type: String },
  transmission: { type: String },
  survival_period: { type: String },
  research_priority: { type: String },
  last_updated: { type: String }
});


module.exports = mongoose.model('Disease', DiseaseSchema);

