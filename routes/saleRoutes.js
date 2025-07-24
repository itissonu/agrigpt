const express = require('express');
const router = express.Router();
const { createSale, getSales, updateSale, deleteSale } = require('../controllers/saleController.js');
const { authenticateJWT } = require('../middleware/authMiddleware.js');

router.post('/sales', authenticateJWT, createSale);
router.post('/sales/list', authenticateJWT, getSales);
router.put('/sales/:id', authenticateJWT, updateSale);
router.delete('/sales/:id', authenticateJWT, deleteSale);

module.exports = router;