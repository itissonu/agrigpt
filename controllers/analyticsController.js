// controllers/analyticsController.js
const Crop = require('../models/Crop');
const Sale = require('../models/sales.js');
const Expenditure = require('../models/expenses');
const Diagnosis = require('../models/Diagnosis');
const { default: mongoose } = require('mongoose');

class AnalyticsController {

    static async getOverviewAnalytics(req, res) {
        try {
            const userId = req.user.userId;
             const userObjectId = new mongoose.Types.ObjectId(userId);
            const { startDate, endDate } = req.query;

            console.log("User ID:", req.user?.userId);

            console.log({ " query": { startDate, endDate } })
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }


            const salesData = await Sale.aggregate([
                { $match: { userId: userObjectId, ...dateFilter } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        totalSales: { $sum: 1 }
                    }
                }
            ]);
            console.log({ "sales data": salesData })
            // Get total expenditure
            const expenditureData = await Expenditure.aggregate([
                { $match: { recordedBy:  userObjectId, ...dateFilter } },
                {
                    $group: {
                        _id: null,
                        totalExpenditure: { $sum: '$amount' },
                        totalExpenses: { $sum: 1 }
                    }
                }
            ]);

            // Get crop statistics
            const cropStats = await Crop.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: null,
                        totalCrops: { $sum: 1 },
                        averageProgress: { $avg: '$progress' },
                        totalFieldSize: { $sum: { $toDouble: '$fieldSize' } }
                    }
                }
            ]);

            // Get crops by stage
            const cropsByStage = await Crop.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: '$currentStage',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalRevenue = salesData[0]?.totalRevenue || 0;
            const totalExpenditure = expenditureData[0]?.totalExpenditure || 0;
            const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenditure) / totalRevenue * 100) : 0;

            res.json({
                success: true,
                data: {
                    totalRevenue,
                    totalExpenditure,
                    netProfit: totalRevenue - totalExpenditure,
                    profitMargin: Math.round(profitMargin * 100) / 100,
                    totalCrops: cropStats[0]?.totalCrops || 0,
                    averageProgress: Math.round((cropStats[0]?.averageProgress || 0) * 100) / 100,
                    totalFieldSize: cropStats[0]?.totalFieldSize || 0,
                    cropsByStage: cropsByStage.reduce((acc, stage) => {
                        acc[stage._id] = stage.count;
                        return acc;
                    }, {}),
                    cropsReadyToHarvest: cropsByStage.find(s => s._id === 'Harvesting')?.count || 0
                }
            });
        } catch (error) {
            console.error('Error in getOverviewAnalytics:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get monthly revenue trend
    static async getMonthlyRevenue(req, res) {
        try {
            const userId = req.user.userId;
              const userObjectId = new mongoose.Types.ObjectId(userId);
            const { year = new Date().getFullYear() } = req.query;

            const monthlyData = await Sale.aggregate([
                {
                    $match: {
                        userId:  userObjectId,
                        createdAt: {
                            $gte: new Date(`${year}-01-01`),
                            $lte: new Date(`${year}-12-31`)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        revenue: { $sum: '$totalAmount' },
                        sales: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id.month': 1 }
                }
            ]);

            // Get crop count per month
            const monthlyCrops = await Crop.aggregate([
                {
                    $match: {
                        userId:  userObjectId,
                        createdAt: {
                            $gte: new Date(`${year}-01-01`),
                            $lte: new Date(`${year}-12-31`)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        crops: { $sum: 1 }
                    }
                }
            ]);

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const result = months.map((month, index) => {
                const monthNum = index + 1;
                const revenueData = monthlyData.find(d => d._id.month === monthNum);
                const cropData = monthlyCrops.find(d => d._id.month === monthNum);

                return {
                    month,
                    revenue: revenueData?.revenue || 0,
                    sales: revenueData?.sales || 0,
                    crops: cropData?.crops || 0
                };
            });

            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Error in getMonthlyRevenue:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get crop profitability analysis
    static async getCropProfitability(req, res) {
        try {
            const userId = req.user.userId;
  const userObjectId = new mongoose.Types.ObjectId(userId);
            // Get revenue by vegetable/crop
            const revenueByVegetable = await Sale.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: '$vegetable',
                        revenue: { $sum: '$totalAmount' },
                        quantity: { $sum: { $toDouble: '$quantity' } },
                        sales: { $sum: 1 }
                    }
                }
            ]);

            // Get expenditure by category (assuming crop-related expenses)
            const expenditureByCategory = await Expenditure.aggregate([
                { $match: { recordedBy:  userObjectId } },
                {
                    $group: {
                        _id: '$category',
                        expenditure: { $sum: '$amount' }
                    }
                }
            ]);

            // Calculate profitability for each crop
            const profitabilityData = revenueByVegetable.map(crop => {
                // Estimate crop expenses (this is a simplified calculation)
                const estimatedExpenses = crop.revenue * 0.6; // Assume 60% of revenue as expenses
                const profit = crop.revenue - estimatedExpenses;
                const margin = crop.revenue > 0 ? (profit / crop.revenue * 100) : 0;

                return {
                    crop: crop._id,
                    revenue: crop.revenue,
                    profit: Math.round(profit),
                    margin: Math.round(margin * 100) / 100,
                    quantity: crop.quantity,
                    sales: crop.sales
                };
            }).sort((a, b) => b.profit - a.profit);

            res.json({ success: true, data: profitabilityData });
        } catch (error) {
            console.error('Error in getCropProfitability:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get sales distribution
    static async getSalesDistribution(req, res) {
        try {
            const userId = req.user.userId;
              const userObjectId = new mongoose.Types.ObjectId(userId);

            const salesByVegetable = await Sale.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: '$vegetable',
                        totalAmount: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { totalAmount: -1 }
                }
            ]);

            const totalRevenue = salesByVegetable.reduce((sum, item) => sum + item.totalAmount, 0);

            const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899'];

            const distributionData = salesByVegetable.map((item, index) => ({
                name: item._id,
                value: totalRevenue > 0 ? Math.round((item.totalAmount / totalRevenue) * 100) : 0,
                amount: item.totalAmount,
                count: item.count,
                color: colors[index % colors.length]
            }));

            res.json({ success: true, data: distributionData });
        } catch (error) {
            console.error('Error in getSalesDistribution:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get seasonal performance
    static async getSeasonalPerformance(req, res) {
        try {
            const userId = req.user.userId;
              const userObjectId = new mongoose.Types.ObjectId(userId);

            // Define seasons (you can adjust these based on your region)
            const seasons = {
                'Kharif': { start: '06-01', end: '10-31' }, // June to October
                'Rabi': { start: '11-01', end: '04-30' },   // November to April
                'Zaid': { start: '03-01', end: '06-30' }    // March to June
            };

            const currentYear = new Date().getFullYear();
            const seasonalData = [];

            for (const [seasonName, period] of Object.entries(seasons)) {
                // Get sales data for the season
                const seasonSales = await Sale.aggregate([
                    {
                        $match: {
                            userId:  userObjectId,
                            $expr: {
                                $and: [
                                    { $gte: [{ $dayOfYear: '$createdAt' }, { $dayOfYear: new Date(`${currentYear}-${period.start}`) }] },
                                    { $lte: [{ $dayOfYear: '$createdAt' }, { $dayOfYear: new Date(`${currentYear}-${period.end}`) }] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: '$totalAmount' },
                            sales: { $sum: 1 }
                        }
                    }
                ]);

                // Get crop data for the season
                const seasonCrops = await Crop.aggregate([
                    {
                        $match: {
                            userId:  userObjectId,
                            $expr: {
                                $and: [
                                    { $gte: [{ $dayOfYear: '$createdAt' }, { $dayOfYear: new Date(`${currentYear}-${period.start}`) }] },
                                    { $lte: [{ $dayOfYear: '$createdAt' }, { $dayOfYear: new Date(`${currentYear}-${period.end}`) }] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgProgress: { $avg: '$progress' },
                            totalCrops: { $sum: 1 }
                        }
                    }
                ]);

                seasonalData.push({
                    season: seasonName,
                    yield: Math.round(seasonCrops[0]?.avgProgress || 0),
                    revenue: seasonSales[0]?.revenue || 0,
                    sales: seasonSales[0]?.sales || 0,
                    crops: seasonCrops[0]?.totalCrops || 0
                });
            }

            res.json({ success: true, data: seasonalData });
        } catch (error) {
            console.error('Error in getSeasonalPerformance:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get expenditure analysis
    static async getExpenditureAnalysis(req, res) {
        try {
            const userId = req.user.userId;
              const userObjectId = new mongoose.Types.ObjectId(userId);
            const { startDate, endDate } = req.query;

            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            // Expenditure by category
            const expenditureByCategory = await Expenditure.aggregate([
                { $match: { recordedBy:  userObjectId, ...dateFilter } },
                {
                    $group: {
                        _id: '$category',
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]);

            // Monthly expenditure trend
            const monthlyExpenditure = await Expenditure.aggregate([
                { $match: { recordedBy:  userObjectId, ...dateFilter } },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            res.json({
                success: true,
                data: {
                    byCategory: expenditureByCategory,
                    monthlyTrend: monthlyExpenditure
                }
            });
        } catch (error) {
            console.error('Error in getExpenditureAnalysis:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get diagnosis statistics
    static async getDiagnosisStats(req, res) {
        try {
            const userId = req.user.userId;
              const userObjectId = new mongoose.Types.ObjectId(userId);

            // Get diagnosis by severity
            const diagnosisBySeverity = await Diagnosis.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get diagnosis by crop
            const diagnosisByCrop = await Diagnosis.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: '$crop',
                        count: { $sum: 1 },
                        avgConfidence: { $avg: '$diagnosis.confidence' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            // Get diagnosis by status
            const diagnosisByStatus = await Diagnosis.aggregate([
                { $match: { userId:  userObjectId } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    bySeverity: diagnosisBySeverity,
                    byCrop: diagnosisByCrop,
                    byStatus: diagnosisByStatus
                }
            });
        } catch (error) {
            console.error('Error in getDiagnosisStats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = AnalyticsController;


