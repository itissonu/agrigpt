const express = require('express');
const router = express.Router();
const { createSale, getSales, updateSale, deleteSale } = require('../controllers/saleController.js');

router.post('/sales', createSale);
router.post('/sales/list', getSales);
router.put('/sales/:id', updateSale);
router.delete('/sales/:id', deleteSale);

module.exports = router;