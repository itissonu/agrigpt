const express = require('express');
const router = express.Router();
const { createCrop, getCrops, updateCrop, deleteCrop } = require('../controllers/cropController.js');

router.post('/crops', createCrop);
router.post('/crops/list', getCrops);
router.put('/crops/:id', updateCrop);
router.delete('/crops/:id', deleteCrop);

module.exports = router;