const express = require('express');
const router = express.Router();
const expenditureController = require('../controllers/expenditureController');
const authMiddleware = require('../middleware/authMiddleware');



router.post('/expenditures', expenditureController.createExpenditure);
router.put('/expenditures/:id', expenditureController.updateExpenditure);
router.delete('/expenditures/:id', expenditureController.deleteExpenditure);
router.get('/expenditures', expenditureController.getExpenditures);
router.get('/expenditures/categories', expenditureController.getExpenditureCategories);

module.exports = router;