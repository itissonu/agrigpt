const roboflowService = require('../services/roboflowService.js');
const remedyService = require('../services/remedyService.js');
const historyService = require('../services/historyService.js');
const diagnosisService = require('../services/diagnose.js');

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

   
   const diagnosisRecord = await diagnosisService.saveDiagnosis(userId, {
        type: 'image',
        crop: prediction.crop || 'unknown',
        diagnosis: {
          disease: prediction.disease,
          cause: remedy.cause,
          organic: remedy.organic,
          chemical: remedy.chemical,
          prevention: remedy.prevention,
          confidence: prediction.confidence,
        },
        imageUrl: req.file.path,
        sessionId,
      });

      logger.info('Image diagnosis completed', { crop: prediction.crop, sessionId, diagnosisId: diagnosisRecord._id, userId });

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