const express = require('express');
const router = express.Router();
const expenditureController = require('../controllers/expenditureController');
const { authenticateJWT } = require('../middleware/authMiddleware');




router.post('/expenditures',authenticateJWT, expenditureController.createExpenditure);
router.put('/expenditures/:id',authenticateJWT, expenditureController.updateExpenditure);
router.delete('/expenditures/:id',authenticateJWT, expenditureController.deleteExpenditure);
router.get('/expenditures', authenticateJWT,expenditureController.getExpenditures);
router.get('/expenditures/categories',authenticateJWT, expenditureController.getExpenditureCategories);

module.exports = router;