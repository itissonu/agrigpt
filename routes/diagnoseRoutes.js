const express = require('express');
const router = express.Router();
const {  getDiagnoses, updateDiagnosis, deleteDiagnosis } = require('../controllers/diagnosisController');
const { authenticateJWT } = require('../middleware/authMiddleware');


router.post('/history', authenticateJWT, getDiagnoses);
router.put('/history/:id', authenticateJWT, updateDiagnosis);
router.delete('/history/:id', authenticateJWT, deleteDiagnosis);

module.exports = router;