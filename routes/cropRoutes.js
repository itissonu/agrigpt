const express = require('express');
const router = express.Router();
const { createCrop, getCrops, updateCrop, deleteCrop } = require('../controllers/cropController.js');
const { authenticateJWT } = require('../middleware/authMiddleware.js');

router.post('/crops',authenticateJWT, createCrop);
router.post('/crops/list',authenticateJWT, getCrops);
router.put('/crops/:id', authenticateJWT,updateCrop);
router.delete('/crops/:id',authenticateJWT, deleteCrop);

module.exports = router;