const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateJWT } = require('../middleware/authMiddleware.js');

// All routes require authentication
router.use(authenticateJWT);


router.get('/overview', AnalyticsController.getOverviewAnalytics);


router.get('/revenue/monthly', AnalyticsController.getMonthlyRevenue);

// Crop analytics
router.get('/crops/profitability', AnalyticsController.getCropProfitability);
router.get('/sales/distribution', AnalyticsController.getSalesDistribution);

// Seasonal performance
router.get('/seasonal', AnalyticsController.getSeasonalPerformance);

// Expenditure analytics
router.get('/expenditure', AnalyticsController.getExpenditureAnalysis);

// Diagnosis statistics
router.get('/diagnosis', AnalyticsController.getDiagnosisStats);

module.exports = router;