const express = require('express');
const router = express.Router();
const textDiagnoseController = require('../controllers/textDiagnoseController.js');

router.post('/text-diagnose', textDiagnoseController.diagnoseText);

module.exports = router;