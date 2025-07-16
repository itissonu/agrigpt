const ollamaService = require('../services/ollamaService.js');
const historyService = require('../services/historyService.js');

const diagnoseText = async (req, res) => {
  try {
    const { crop, symptoms,language } = req.body;

  
    if (!crop || !symptoms) {
      return res.status(400).json({
        error: 'Missing required fields: crop and symptoms'
      });
    }

    
    const diagnosis = await ollamaService.getDiagnosis(crop, symptoms,language);

  
    await historyService.saveTextDiagnosis({
      crop,
      symptoms,
      diagnosis,
      timestamp: new Date().toISOString()
    });

    res.json({diagnosis});
  } catch (error) {
    console.error('Text diagnosis error:', error);
    res.status(500).json({
      error: 'Failed to diagnose crop disease',
      details: error.message
    });
  }
};

module.exports = {
  diagnoseText
};
