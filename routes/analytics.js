const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateJWT } = require('../middleware/authMiddleware.js');

// All routes require authentication
router.use(authenticateJWT);


router.get('/overview', AnalyticsController.getOverviewAnalytics);
router.get('/crop/financial-summary',AnalyticsController.getCropFinancialSummary);
router.get('/monthly-revenue', AnalyticsController.getMonthlyRevenue);

// Crop Profitability Analysis
router.get('/crop-profitability', AnalyticsController.getCropProfitability);

// Sales Distribution
router.get('/sales-distribution', AnalyticsController.getSalesDistribution);

// Seasonal Performance
router.get('/seasonal-performance', AnalyticsController.getSeasonalPerformance);

// Expenditure Analysis
router.get('/expenditure-analysis', AnalyticsController.getExpenditureAnalysis);

// Diagnosis Statistics
router.get('/diagnosis-stats', AnalyticsController.getDiagnosisStats);

module.exports = router;