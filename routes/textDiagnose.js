const express = require('express');
const router = express.Router();
const textDiagnoseController = require('../controllers/textDiagnoseController.js');
const { authenticateJWT } = require('../middleware/authMiddleware');
router.post('/text-diagnose',authenticateJWT, textDiagnoseController.diagnoseText);

module.exports = router;