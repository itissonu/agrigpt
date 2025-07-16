const roboflowService = require('../services/roboflowService.js');
const remedyService = require('../services/remedyService.js');
const historyService = require('../services/historyService.js');

const diagnoseImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

   
    const prediction = await roboflowService.predictDisease(req.file.buffer);

   
    const remedy = await remedyService.getRemedyInfo(prediction.disease);

    const result = {
      imagePrediction: prediction.disease,
      confidence: prediction.confidence,
      remedy: remedy
    };

   
    await historyService.saveImageDiagnosis({
      imagePrediction: prediction.disease,
      confidence: prediction.confidence,
      remedy,
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (error) {
    console.error('Image diagnosis error:', error);
    res.status(500).json({
      error: 'Failed to diagnose image',
      details: error.message
    });
  }
};

module.exports = {
  diagnoseImage
};