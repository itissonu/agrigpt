const Crop = require('../models/Crop');
const Sale = require('../models/sales.js');
const Expenditure = require('../models/expenses');
const Diagnosis = require('../models/Diagnosis');
const { default: mongoose } = require('mongoose');



class CropAnalyticsController {

 static buildDateFilter(startDate, endDate) {
        const dateFilter = {};
        
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            
            if (startDate) {
                const start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    throw new Error('Invalid start date format');
                }
                dateFilter.createdAt.$gte = start;
            }
            
            if (endDate) {
                const end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    throw new Error('Invalid end date format');
                }
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.$lte = end;
            }
        }
        
        return dateFilter;
    }

      static async getCropPerformance(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const { startDate, endDate, sortBy = 'progress', sortOrder = 'desc' } = req.query;

            const dateFilter = CropAnalyticsController.buildDateFilter(startDate, endDate);

            // Get comprehensive crop data with calculated metrics
            const cropPerformance = await Crop.aggregate([
                { 
                    $match: { 
                        userId: userObjectId,
                        ...dateFilter
                    } 
                },
                {
                    $addFields: {
                        startDateObj: { $dateFromString: { dateString: '$startDate' } },
                        expectedHarvestObj: { $dateFromString: { dateString: '$expectedHarvest' } },
                        currentDate: new Date()
                    }
                },
                {
                    $addFields: {
                        daysFromStart: {
                            $divide: [
                                { $subtract: ['$currentDate', '$startDateObj'] },
                                1000 * 60 * 60 * 24
                            ]
                        },
                        daysToHarvest: {
                            $divide: [
                                { $subtract: ['$expectedHarvestObj', '$currentDate'] },
                                1000 * 60 * 60 * 24
                            ]
                        },
                        totalCycleDays: {
                            $divide: [
                                { $subtract: ['$expectedHarvestObj', '$startDateObj'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        expectedProgress: {
                            $cond: [
                                { $gt: ['$totalCycleDays', 0] },
                                { 
                                    $multiply: [
                                        { $divide: ['$daysFromStart', '$totalCycleDays'] },
                                        100
                                    ]
                                },
                                0
                            ]
                        },
                        progressVariance: {
                            $subtract: [
                                '$progress',
                                {
                                    $cond: [
                                        { $gt: ['$totalCycleDays', 0] },
                                        { 
                                            $multiply: [
                                                { $divide: ['$daysFromStart', '$totalCycleDays'] },
                                                100
                                            ]
                                        },
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'sales',
                        localField: '_id',
                        foreignField: 'vegetable',
                        as: 'sales'
                    }
                },
                {
                    $lookup: {
                        from: 'expenditures',
                        let: { cropId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$$cropId', '$allocations.cropId']
                                    }
                                }
                            },
                            {
                                $unwind: '$allocations'
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$$cropId', '$allocations.cropId']
                                    }
                                }
                            }
                        ],
                        as: 'expenses'
                    }
                },
                {
                    $addFields: {
                        totalRevenue: { $sum: '$sales.totalAmount' },
                        totalSales: { $size: '$sales' },
                        totalExpenses: { $sum: '$expenses.allocations.allocatedAmount' },
                        netProfit: {
                            $subtract: [
                                { $sum: '$sales.totalAmount' },
                                { $sum: '$expenses.allocations.allocatedAmount' }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        profitMargin: {
                            $cond: [
                                { $gt: ['$totalRevenue', 0] },
                                {
                                    $multiply: [
                                        { $divide: ['$netProfit', '$totalRevenue'] },
                                        100
                                    ]
                                },
                                0
                            ]
                        },
                        roi: {
                            $cond: [
                                { $gt: ['$totalExpenses', 0] },
                                {
                                    $multiply: [
                                        { $divide: ['$netProfit', '$totalExpenses'] },
                                        100
                                    ]
                                },
                                0
                            ]
                        },
                        performanceScore: {
                            $add: [
                                { $multiply: ['$progress', 0.4] },
                                { 
                                    $multiply: [
                                        {
                                            $cond: [
                                                { $gte: ['$progressVariance', 0] },
                                                { $min: [{ $multiply: ['$progressVariance', 2] }, 30] },
                                                { $max: [{ $multiply: ['$progressVariance', 2] }, -30] }
                                            ]
                                        },
                                        0.3
                                    ]
                                },
                                {
                                    $multiply: [
                                        {
                                            $cond: [
                                                { $gte: ['$daysToHarvest', 0] },
                                                30,
                                                { $max: [{ $add: [30, '$daysToHarvest'] }, 0] }
                                            ]
                                        },
                                        0.3
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        type: 1,
                        variety: 1,
                        currentStage: 1,
                        progress: 1,
                        fieldSize: 1,
                        location: 1,
                        startDate: 1,
                        expectedHarvest: 1,
                        whenToPluck: 1,
                        notes: 1,
                        daysFromStart: { $round: ['$daysFromStart', 0] },
                        daysToHarvest: { $round: ['$daysToHarvest', 0] },
                        totalCycleDays: { $round: ['$totalCycleDays', 0] },
                        expectedProgress: { $round: ['$expectedProgress', 2] },
                        progressVariance: { $round: ['$progressVariance', 2] },
                        performanceScore: { $round: ['$performanceScore', 2] },
                        totalRevenue: 1,
                        totalExpenses: 1,
                        netProfit: { $round: ['$netProfit', 2] },
                        profitMargin: { $round: ['$profitMargin', 2] },
                        roi: { $round: ['$roi', 2] },
                        totalSales: 1,
                        salesData: '$sales',
                        expenseData: '$expenses',
                        status: {
                            $cond: [
                                { $lt: ['$daysToHarvest', 0] }, 'Overdue',
                                { $and: [{ $lte: ['$daysToHarvest', 7] }, { $gte: ['$daysToHarvest', 0] }] }, 'Due Soon',
                                { $eq: ['$currentStage', 'Harvested'] }, 'Completed',
                                { $eq: ['$currentStage', 'Harvesting'] }, 'Ready',
                                'In Progress'
                            ]
                        }
                    }
                }
            ]);

            // Sort data based on request parameters
            const sortField = sortBy;
            const order = sortOrder === 'asc' ? 1 : -1;
            cropPerformance.sort((a, b) => {
                if (a[sortField] < b[sortField]) return -1 * order;
                if (a[sortField] > b[sortField]) return 1 * order;
                return 0;
            });

            // Calculate summary statistics
            const summary = {
                totalCrops: cropPerformance.length,
                avgProgress: cropPerformance.reduce((sum, crop) => sum + crop.progress, 0) / cropPerformance.length,
                avgPerformanceScore: cropPerformance.reduce((sum, crop) => sum + crop.performanceScore, 0) / cropPerformance.length,
                totalRevenue: cropPerformance.reduce((sum, crop) => sum + crop.totalRevenue, 0),
                totalExpenses: cropPerformance.reduce((sum, crop) => sum + crop.totalExpenses, 0),
                avgROI: cropPerformance.filter(crop => crop.roi > 0).reduce((sum, crop) => sum + crop.roi, 0) / Math.max(cropPerformance.filter(crop => crop.roi > 0).length, 1),
                cropsOverdue: cropPerformance.filter(crop => crop.status === 'Overdue').length,
                cropsDueSoon: cropPerformance.filter(crop => crop.status === 'Due Soon').length,
                cropsReady: cropPerformance.filter(crop => crop.status === 'Ready').length,
                cropsCompleted: cropPerformance.filter(crop => crop.status === 'Completed').length,
                topPerformer: cropPerformance.length > 0 ? cropPerformance.reduce((best, crop) => 
                    crop.performanceScore > best.performanceScore ? crop : best
                ) : null
            };

            res.json({
                success: true,
                data: {
                    crops: cropPerformance,
                    summary: {
                        ...summary,
                        avgProgress: Math.round((summary.avgProgress || 0) * 100) / 100,
                        avgPerformanceScore: Math.round((summary.avgPerformanceScore || 0) * 100) / 100,
                        avgROI: Math.round((summary.avgROI || 0) * 100) / 100,
                        totalProfit: summary.totalRevenue - summary.totalExpenses,
                        avgProfitMargin: summary.totalRevenue > 0 ? 
                            Math.round(((summary.totalRevenue - summary.totalExpenses) / summary.totalRevenue * 100) * 100) / 100 : 0
                    }
                }
            });
        } catch (error) {
            console.error('Error in getCropPerformance:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                details: 'Failed to fetch crop performance data'
            });
        }
    }




}