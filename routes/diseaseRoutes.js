const express = require('express');
const router = express.Router();
const { createDisease, getAllDiseases } = require('../controllers/diseaseController');

router.post('/diseases', createDisease);
router.get('/diseases', getAllDiseases);

module.exports = router;
