const express = require('express');
const router = express.Router();
const textDiagnoseController = require('../controllers/textDiagnoseController.js');
const {  getDiagnoses, updateDiagnosis, deleteDiagnosis } = require('../controllers/diagnosisController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { getFertilizerAdvice } = require('../services/ollamaService.js');



router.post('/text-diagnose',authenticateJWT, textDiagnoseController.diagnoseText);
router.post('/history', authenticateJWT, getDiagnoses);
router.put('/history/:id', authenticateJWT, updateDiagnosis);
router.delete('/history/:id', authenticateJWT, deleteDiagnosis);

router.post("/fertilizer", async (req, res) => {
  const { crop, diseaseOrPathogen, soilType, language } = req.body;
  console.log(crop,diseaseOrPathogen)

  if (!crop || !diseaseOrPathogen) {
    return res.status(400).json({ success: false, message: "Crop and disease/pathogen are required." });
  }

  const result = await getFertilizerAdvice(crop, diseaseOrPathogen, soilType, language || "English");
  res.status(result.success ? 200 : 500).json(result);
});


module.exports = router;