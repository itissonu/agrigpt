const ollamaService = require('../services/ollamaService.js');
const historyService = require('../services/historyService.js');
const diagnosisService = require('../services/diagnose.js');

const diagnoseText = async (req, res) => {
  try {
    const { crop, symptoms, language } = req.body;
     const userId =await  req.user.userId;
     const   sessionId = await req.user.userId ;// Replace with actual session ID logic if needed
     console.log(userId+" userId");


    if (!crop || !symptoms) {
      return res.status(400).json({
        error: 'Missing required fields: crop and symptoms'
      });
    }


    const diagnosis = await ollamaService.getDiagnosis(crop, symptoms, language);

    const diagnosisRecord = await diagnosisService.saveDiagnosis(userId, {
      type: 'text',
      crop,
      symptoms,
      diagnosis,
      sessionId,
      language,
    });

   // logger.info('Text diagnosis completed', { crop, symptoms, sessionId, diagnosisId: diagnosisRecord._id, userId });

    // await historyService.saveTextDiagnosis({
    //   crop,
    //   symptoms,
    //   diagnosis,
    //   timestamp: new Date().toISOString()
    // });

    res.json({ diagnosis });
  } catch (error) {
    console.error('Text diagnosis error:', error);
    res.status(500).json({
      error: 'Failed to diagnose crop disease',
      details: error.message
    });
  }
};


module.exports = {
  diagnoseText,

};
