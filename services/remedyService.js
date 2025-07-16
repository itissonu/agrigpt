const ollamaService = require('./ollamaService.js');

// Static remedy database for common diseases
const REMEDY_DATABASE = {
  'powdery_mildew': {
    organic: 'Spray with baking soda solution (1 tsp per quart water) or neem oil',
    chemical: 'Apply sulfur-based fungicide or potassium bicarbonate',
    prevention: 'Ensure good air circulation, avoid overhead watering, remove infected leaves'
  },
  'leaf_spot': {
    organic: 'Use copper-based organic fungicide or compost tea',
    chemical: 'Apply chlorothalonil or mancozeb fungicide',
    prevention: 'Water at soil level, provide adequate spacing, remove debris'
  },
  'blight': {
    organic: 'Apply copper sulfate or Bacillus subtilis',
    chemical: 'Use chlorothalonil or copper hydroxide',
    prevention: 'Crop rotation, avoid overhead irrigation, resistant varieties'
  },
  'rust': {
    organic: 'Neem oil spray or sulfur dust application',
    chemical: 'Propiconazole or tebuconazole fungicide',
    prevention: 'Good air circulation, avoid wetting leaves, resistant cultivars'
  }
};

const getRemedyInfo = async (diseaseName) => {
  try {
    // Normalize disease name for lookup
    const normalizedName = diseaseName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Check static database first
    for (const [key, remedy] of Object.entries(REMEDY_DATABASE)) {
      if (normalizedName.includes(key) || key.includes(normalizedName.split('_')[0])) {
        return remedy;
      }
    }

    // Fallback to LLM if not found in static database
    const diagnosis = await ollamaService.getDiagnosis('crop', `disease: ${diseaseName}`);
    
    return {
      organic: diagnosis.organic || 'Consult agricultural expert for organic treatment',
      chemical: diagnosis.chemical || 'Consult agricultural expert for chemical treatment',
      prevention: diagnosis.prevention || 'Maintain proper plant hygiene and spacing'
    };
  } catch (error) {
    console.error('Remedy service error:', error);
    
    // Ultimate fallback
    return {
      organic: 'Apply neem oil spray or organic fungicide',
      chemical: 'Consult agricultural expert for appropriate fungicide',
      prevention: 'Maintain proper plant hygiene and good air circulation'
    };
  }
};

module.exports = {
  getRemedyInfo
};