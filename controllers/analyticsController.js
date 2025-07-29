// controllers/analyticsController.js
const Crop = require('../models/Crop');
const Sale = require('../models/sales.js');
const Expenditure = require('../models/expenses');
const Diagnosis = require('../models/Diagnosis');
const { default: mongoose } = require('mongoose');

class AnalyticsController {
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
                // Set to end of day
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.$lte = end;
            }
        }

        return dateFilter;
    }
    static getDateRangePreset(preset) {
        const now = new Date();
        const ranges = {
            'today': {
                startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
            },
            'yesterday': {
                startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
            },
            'thisWeek': {
                startDate: new Date(now.setDate(now.getDate() - now.getDay())),
                endDate: new Date()
            },
            'lastWeek': {
                startDate: new Date(now.setDate(now.getDate() - now.getDay() - 7)),
                endDate: new Date(now.setDate(now.getDate() - now.getDay() - 1))
            },
            'thisMonth': {
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
            },
            'lastMonth': {
                startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
            },
            'thisQuarter': {
                startDate: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
                endDate: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999)
            },
            'thisYear': {
                startDate: new Date(now.getFullYear(), 0, 1),
                endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
            },
            'lastYear': {
                startDate: new Date(now.getFullYear() - 1, 0, 1),
                endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
            }
        };

        return ranges[preset] || null;
    }
    static async getOverviewAnalytics(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const { startDate, endDate, preset } = req.query;

            console.log("User ID:", req.user?.userId);
            console.log({ "query": { startDate, endDate, preset } });

            const dateFilter = {};
            if (preset) {
                const presetRange = AnalyticsController.getDateRangePreset(preset);
                if (presetRange) {
                    dateFilter.createdAt = {
                        $gte: presetRange.startDate,
                        $lte: presetRange.endDate
                    };
                }
            } else {
                // Handle custom date range
                dateFilter = AnalyticsController.buildDateFilter(startDate, endDate);
            }


            const salesData = await Sale.aggregate([
                { $match: { userId: userObjectId, ...dateFilter } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        totalSales: { $sum: 1 },
                        avgSaleAmount: { $avg: '$totalAmount' },
                        totalQuantitySold: { $sum: { $toDouble: '$quantity' } }
                    }
                }
            ]);
            console.log({ "sales data": salesData })
            // Get total expenditure
            const expenditureData = await Expenditure.aggregate([
                { $match: { recordedBy: userObjectId, ...dateFilter } },
                {
                    $group: {
                        _id: null,
                        totalExpenditure: { $sum: '$amount' },
                        totalExpenses: { $sum: 1 },
                        avgExpenseAmount: { $avg: '$amount' }
                    }
                }
            ]);

            // Get crop statistics
            const cropStats = await Crop.aggregate([
                { $match: { userId: userObjectId } },
                {
                    $group: {
                        _id: null,
                        totalCrops: { $sum: 1 },
                        averageProgress: { $avg: '$progress' },
                        totalFieldSize: { $sum: { $toDouble: '$fieldSize' } },
                        avgFieldSize: { $avg: { $toDouble: '$fieldSize' } }
                    }
                }
            ]);

            // Get crops by stage
            const cropsByStage = await Crop.aggregate([
                { $match: { userId: userObjectId } },
                {
                    $group: {
                        _id: '$currentStage',
                        count: { $sum: 1 }
                    },
                },
                {
                    $project: {
                        _id: 1,
                        count: 1
                    }
                }
            ]);
            const cropsByType = await Crop.aggregate([
                { $match: { userId: userObjectId } },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        totalFieldSize: { $sum: { $toDouble: '$fieldSize' } }
                    }
                }
            ]);
            const totalRevenue = salesData[0]?.totalRevenue || 0;
            const totalExpenditure = expenditureData[0]?.totalExpenditure || 0;
            const netProfit = totalRevenue - totalExpenditure;
            const profitMargin = totalRevenue > 0 ? ((netProfit) / totalRevenue * 100) : 0;
            const totalCrops = cropStats[0]?.totalCrops || 0;

            // Convert crops by stage to object format
            const stageDistribution = cropsByStage.reduce((acc, stage) => {
                acc[stage._id] = {
                    count: stage.count,
                    percentage: totalCrops > 0 ? Math.round((stage.count / totalCrops) * 100) : 0
                };
                return acc;
            }, {});

            // Convert crops by type to object format
            const typeDistribution = cropsByType.reduce((acc, type) => {
                acc[type._id] = {
                    count: type.count,
                    fieldSize: type.totalFieldSize,
                    percentage: totalCrops > 0 ? Math.round((type.count / totalCrops) * 100) : 0
                };
                return acc;
            }, {});

            res.json({
                success: true,
                data: {
                    // Financial metrics
                    totalRevenue,
                    totalExpenditure,
                    netProfit,
                    profitMargin: Math.round(profitMargin * 100) / 100,

                    // Sales metrics
                    totalSales: salesData[0]?.totalSales || 0,
                    avgSaleAmount: Math.round((salesData[0]?.avgSaleAmount || 0) * 100) / 100,
                    totalQuantitySold: salesData[0]?.totalQuantitySold || 0,

                    // Expense metrics
                    totalExpenseTransactions: expenditureData[0]?.totalExpenses || 0,
                    avgExpenseAmount: Math.round((expenditureData[0]?.avgExpenseAmount || 0) * 100) / 100,

                    // Crop metrics
                    totalCrops,
                    averageProgress: Math.round((cropStats[0]?.averageProgress || 0) * 100) / 100,
                    totalFieldSize: cropStats[0]?.totalFieldSize || 0,
                    avgFieldSize: Math.round((cropStats[0]?.avgFieldSize || 0) * 100) / 100,

                    // Distribution data
                    cropsByStage: stageDistribution,
                    cropsByType: typeDistribution,
                    cropsReadyToHarvest: stageDistribution['Harvesting']?.count || 0,

                    // Date range info
                    dateRange: {
                        startDate: dateFilter.createdAt?.$gte || null,
                        endDate: dateFilter.createdAt?.$lte || null,
                        preset: preset || null
                    }
                }
            });
        } catch (error) {
            console.error('Error in getOverviewAnalytics:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async getCropFinancialSummary(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);

            const {
                cropId,
                startDate,
                endDate,
                page = 1,
                limit = 10
            } = req.query;
            console.log({
                "startdate": startDate,
                "endate": endDate
            })

            if (!cropId) {
                return res.status(400).json({ success: false, error: "Crop ID is required" });
            }

            const cropObjectId = new mongoose.Types.ObjectId(cropId);
            const pageInt = parseInt(page);
            const limitInt = parseInt(limit);
            const skip = (pageInt - 1) * limitInt;

            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            // Fetch crop basic info
            const crop = await Crop.findOne({ _id: cropObjectId, userId: userObjectId }).lean();
            if (!crop) {
                return res.status(404).json({ success: false, error: "Crop not found" });
            }

            // Sales filter
            const salesFilter = {
                userId: userObjectId,
                vegetable: cropObjectId,
            };
            if (start || end) {
                salesFilter.createdAt = {};
                if (start) salesFilter.createdAt.$gte = start;
                if (end) salesFilter.createdAt.$lte = end;
            }

            // Expenses filter
            const expenseFilter = {
                'allocations.cropId': cropObjectId,
                recordedBy: userObjectId
            };
            if (start || end) {
                expenseFilter.createdAt = {};
                if (start) expenseFilter.createdAt.$gte = start;
                if (end) expenseFilter.createdAt.$lte = end;
            }

            // Count and fetch sales
            const totalSalesCount = await Sale.countDocuments(salesFilter);
            const sales = await Sale.find(salesFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitInt)
                .lean();

            // Count and fetch expenses
            const totalExpenseCount = await Expenditure.countDocuments(expenseFilter);
            const expenses = await Expenditure.find(expenseFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitInt)
                .lean();

            // Calculate totals
            const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
            const totalExpenses = expenses.reduce((sum, exp) => {
                const alloc = exp.allocations.find(a => a.cropId.toString() === cropId);
                return alloc ? sum + alloc.allocatedAmount : sum;
            }, 0);

            const profit = totalRevenue - totalExpenses;

            res.json({
                success: true,
                data: {
                    crop: {
                        _id: crop._id,
                        name: crop.name,
                        type: crop.type,
                        variety: crop.variety,
                        fieldSize: crop.fieldSize,
                        location: crop.location,
                        startDate: crop.startDate,
                        expectedHarvest: crop.expectedHarvest,
                        currentStage: crop.currentStage,
                    },
                    summary: {
                        totalRevenue,
                        totalExpenses,
                        profit,
                    },
                    sales: {
                        data: sales,
                        totalItems: totalSalesCount,
                        currentPage: pageInt,
                        totalPages: Math.ceil(totalSalesCount / limitInt),
                        pageSize: limitInt,
                    },
                    expenses: {
                        data: expenses,
                        totalItems: totalExpenseCount,
                        currentPage: pageInt,
                        totalPages: Math.ceil(totalExpenseCount / limitInt),
                        pageSize: limitInt,
                    }
                }
            });
        } catch (error) {
            console.error("Error in getCropFinancialSummary:", error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: 'Failed to fetch crop financial summary'
            });
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
                        userId: userObjectId,
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
                        userId: userObjectId,
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
            const { startDate, endDate, preset, sortBy = 'profit', sortOrder = 'desc' } = req.query;

            let dateFilter = {};
            if (preset) {
                const presetRange = AnalyticsController.getDateRangePreset(preset);
                if (presetRange) {
                    dateFilter.createdAt = {
                        $gte: presetRange.startDate,
                        $lte: presetRange.endDate
                    };
                }
            } else {
                dateFilter = AnalyticsController.buildDateFilter(startDate, endDate);
            }

            // Get revenue by crop with detailed breakdown
            const revenueByVegetable = await Sale.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $lookup: {
                        from: 'crops',
                        localField: 'vegetable',
                        foreignField: '_id',
                        as: 'cropDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$cropDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            cropId: '$vegetable',
                            cropName: '$cropDetails.name',
                            cropType: '$cropDetails.type',
                            cropVariety: '$cropDetails.variety'
                        },
                        revenue: { $sum: '$totalAmount' },
                        quantity: { $sum: { $toDouble: '$quantity' } },
                        sales: { $sum: 1 },
                        avgPrice: { $avg: '$sellingPrice' },
                        maxPrice: { $max: '$sellingPrice' },
                        minPrice: { $min: '$sellingPrice' }
                    }
                }
            ]);

            // Get expenditure by crop (using allocations if available)
            const expenditureByVegetable = await Expenditure.aggregate([
                {
                    $match: {
                        recordedBy: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $unwind: {
                        path: '$allocations',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'crops',
                        localField: 'allocations.cropId',
                        foreignField: '_id',
                        as: 'cropDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$cropDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            cropId: '$allocations.cropId',
                            cropName: '$cropDetails.name'
                        },
                        totalExpenses: { $sum: '$allocations.allocatedAmount' },
                        expenseCount: { $sum: 1 }
                    }
                }
            ]);

            // Calculate profitability for each crop
            const profitabilityData = revenueByVegetable.map(crop => {
                const expenseData = expenditureByVegetable.find(exp =>
                    exp._id.cropId?.toString() === crop._id.cropId?.toString()
                );

                const expenses = expenseData?.totalExpenses || 0;
                const profit = crop.revenue - expenses;
                const margin = crop.revenue > 0 ? (profit / crop.revenue * 100) : 0;
                const roi = expenses > 0 ? (profit / expenses * 100) : 0;

                return {
                    cropId: crop._id.cropId,
                    cropName: crop._id.cropName || 'Unknown Crop',
                    cropType: crop._id.cropType,
                    cropVariety: crop._id.cropVariety,
                    revenue: crop.revenue,
                    expenses,
                    profit: Math.round(profit * 100) / 100,
                    margin: Math.round(margin * 100) / 100,
                    roi: Math.round(roi * 100) / 100,
                    quantity: crop.quantity,
                    sales: crop.sales,
                    avgPrice: Math.round((crop.avgPrice || 0) * 100) / 100,
                    priceRange: {
                        min: crop.minPrice || 0,
                        max: crop.maxPrice || 0
                    },
                    revenuePerUnit: crop.quantity > 0 ? Math.round((crop.revenue / crop.quantity) * 100) / 100 : 0,
                    expenseCount: expenseData?.expenseCount || 0
                };
            });

            // Sort data based on request parameters
            const sortField = sortBy;
            const order = sortOrder === 'asc' ? 1 : -1;
            profitabilityData.sort((a, b) => {
                if (a[sortField] < b[sortField]) return -1 * order;
                if (a[sortField] > b[sortField]) return 1 * order;
                return 0;
            });

            // Calculate summary statistics
            const summary = {
                totalCrops: profitabilityData.length,
                totalRevenue: profitabilityData.reduce((sum, crop) => sum + crop.revenue, 0),
                totalExpenses: profitabilityData.reduce((sum, crop) => sum + crop.expenses, 0),
                totalProfit: profitabilityData.reduce((sum, crop) => sum + crop.profit, 0),
                avgMargin: profitabilityData.length > 0 ?
                    profitabilityData.reduce((sum, crop) => sum + crop.margin, 0) / profitabilityData.length : 0,
                profitableCrops: profitabilityData.filter(crop => crop.profit > 0).length,
                lossMakingCrops: profitabilityData.filter(crop => crop.profit < 0).length
            };

            res.json({
                success: true,
                data: {
                    crops: profitabilityData,
                    summary: {
                        ...summary,
                        avgMargin: Math.round(summary.avgMargin * 100) / 100
                    }
                }
            });
        } catch (error) {
            console.error('Error in getCropProfitability:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: 'Failed to fetch crop profitability data'
            });
        }
    }

    static async getSalesDistribution(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const { startDate, endDate, preset, groupBy = 'vegetable' } = req.query;

            let dateFilter = {};
            if (preset) {
                const presetRange = AnalyticsController.getDateRangePreset(preset);
                if (presetRange) {
                    dateFilter.createdAt = {
                        $gte: presetRange.startDate,
                        $lte: presetRange.endDate
                    };
                }
            } else {
                dateFilter = AnalyticsController.buildDateFilter(startDate, endDate);
            }

            // Define grouping field based on request
            let groupField = '$vegetable';
            let lookupField = 'vegetable';

            if (groupBy === 'cropType') {
                groupField = '$cropDetails.type';
            } else if (groupBy === 'cropVariety') {
                groupField = '$cropDetails.variety';
            }

            const salesByCategory = await Sale.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $lookup: {
                        from: 'crops',
                        localField: 'vegetable',
                        foreignField: '_id',
                        as: 'cropDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$cropDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: '$cropDetails.name',
                        totalAmount: { $sum: '$totalAmount' },
                        count: { $sum: 1 },
                        totalQuantity: { $sum: { $toDouble: '$quantity' } },
                        avgPrice: { $avg: '$sellingPrice' }
                    }
                },
                {
                    $sort: { totalAmount: -1 }
                }
            ]);

            const totalRevenue = salesByCategory.reduce((sum, item) => sum + item.totalAmount, 0);
            const totalSales = salesByCategory.reduce((sum, item) => sum + item.count, 0);

            const colors = [
                '#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6',
                '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1',
                '#84cc16', '#f43f5e', '#14b8a6', '#a855f7', '#3b82f6'
            ];

            const distributionData = salesByCategory.map((item, index) => {
                const percentage = totalRevenue > 0 ? Math.round((item.totalAmount / totalRevenue) * 100) : 0;
                const salesPercentage = totalSales > 0 ? Math.round((item.count / totalSales) * 100) : 0;

                return {
                    name: item._id || 'Unknown',
                    value: percentage,
                    amount: item.totalAmount,
                    count: item.count,
                    quantity: item.totalQuantity,
                    avgPrice: Math.round((item.avgPrice || 0) * 100) / 100,
                    salesPercentage,
                    color: colors[index % colors.length],
                    revenuePerSale: item.count > 0 ? Math.round((item.totalAmount / item.count) * 100) / 100 : 0
                };
            });

            // Get top performers
            const topPerformers = {
                byRevenue: distributionData.slice(0, 3),
                bySales: [...distributionData].sort((a, b) => b.count - a.count).slice(0, 3),
                byQuantity: [...distributionData].sort((a, b) => b.quantity - a.quantity).slice(0, 3)
            };

            res.json({
                success: true,
                data: {
                    distribution: distributionData,
                    topPerformers,
                    summary: {
                        totalCategories: distributionData.length,
                        totalRevenue,
                        totalSales,
                        totalQuantity: distributionData.reduce((sum, item) => sum + item.quantity, 0),
                        avgRevenuePerCategory: distributionData.length > 0 ?
                            Math.round((totalRevenue / distributionData.length) * 100) / 100 : 0,
                        groupBy
                    }
                }
            });
        } catch (error) {
            console.error('Error in getSalesDistribution:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: 'Failed to fetch sales distribution data'
            });
        }
    }

    // Get seasonal performance
    static async getSeasonalPerformance(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const { year = new Date().getFullYear() } = req.query;

            const yearNum = parseInt(year);
            if (isNaN(yearNum)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid year parameter'
                });
            }

            // Define seasons with more accurate date ranges for Indian agriculture
            const seasons = {
                'Kharif': {
                    name: 'Kharif (Monsoon)',
                    start: new Date(yearNum, 5, 1), // June 1
                    end: new Date(yearNum, 9, 31, 23, 59, 59, 999), // October 31
                    description: 'Monsoon crops (June-October)'
                },
                'Rabi': {
                    name: 'Rabi (Winter)',
                    start: new Date(yearNum, 10, 1), // November 1
                    end: new Date(yearNum + 1, 3, 30, 23, 59, 59, 999), // April 30 next year
                    description: 'Winter crops (November-April)'
                },
                'Zaid': {
                    name: 'Zaid (Summer)',
                    start: new Date(yearNum, 2, 1), // March 1
                    end: new Date(yearNum, 5, 30, 23, 59, 59, 999), // June 30
                    description: 'Summer crops (March-June)'
                }
            };

            const seasonalData = [];

            for (const [seasonKey, seasonInfo] of Object.entries(seasons)) {
                // Get sales data for the season
                const seasonSales = await Sale.aggregate([
                    {
                        $match: {
                            userId: userObjectId,
                            createdAt: {
                                $gte: seasonInfo.start,
                                $lte: seasonInfo.end
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: '$totalAmount' },
                            sales: { $sum: 1 },
                            totalQuantity: { $sum: { $toDouble: '$quantity' } },
                            avgPrice: { $avg: '$sellingPrice' }
                        }
                    }
                ]);

                // Get expenditure data for the season
                const seasonExpenses = await Expenditure.aggregate([
                    {
                        $match: {
                            recordedBy: userObjectId,
                            createdAt: {
                                $gte: seasonInfo.start,
                                $lte: seasonInfo.end
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            expenses: { $sum: '$amount' },
                            expenseCount: { $sum: 1 }
                        }
                    }
                ]);

                // Get crop data for the season
                const seasonCrops = await Crop.aggregate([
                    {
                        $match: {
                            userId: userObjectId,
                            createdAt: {
                                $gte: seasonInfo.start,
                                $lte: seasonInfo.end
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgProgress: { $avg: '$progress' },
                            totalCrops: { $sum: 1 },
                            totalFieldSize: { $sum: { $toDouble: '$fieldSize' } },
                            cropsByStage: {
                                $push: '$currentStage'
                            }
                        }
                    }
                ]);

                const revenue = seasonSales[0]?.revenue || 0;
                const expenses = seasonExpenses[0]?.expenses || 0;
                const netProfit = revenue - expenses;
                const profitMargin = revenue > 0 ? (netProfit / revenue * 100) : 0;

                seasonalData.push({
                    season: seasonKey,
                    name: seasonInfo.name,
                    description: seasonInfo.description,
                    dateRange: {
                        start: seasonInfo.start,
                        end: seasonInfo.end
                    },
                    yield: Math.round(seasonCrops[0]?.avgProgress || 0),
                    revenue,
                    expenses,
                    netProfit,
                    profitMargin: Math.round(profitMargin * 100) / 100,
                    sales: seasonSales[0]?.sales || 0,
                    totalQuantity: seasonSales[0]?.totalQuantity || 0,
                    avgPrice: Math.round((seasonSales[0]?.avgPrice || 0) * 100) / 100,
                    crops: seasonCrops[0]?.totalCrops || 0,
                    totalFieldSize: seasonCrops[0]?.totalFieldSize || 0,
                    expenseCount: seasonExpenses[0]?.expenseCount || 0
                });
            }

            // Calculate best and worst performing seasons
            const bestRevenueSeason = seasonalData.reduce((best, season) =>
                season.revenue > best.revenue ? season : best, seasonalData[0]
            );
            const bestProfitSeason = seasonalData.reduce((best, season) =>
                season.netProfit > best.netProfit ? season : best, seasonalData[0]
            );

            const summary = {
                year: yearNum,
                totalRevenue: seasonalData.reduce((sum, season) => sum + season.revenue, 0),
                totalExpenses: seasonalData.reduce((sum, season) => sum + season.expenses, 0),
                totalProfit: seasonalData.reduce((sum, season) => sum + season.netProfit, 0),
                totalCrops: seasonalData.reduce((sum, season) => sum + season.crops, 0),
                bestRevenueSeason: bestRevenueSeason?.season,
                bestProfitSeason: bestProfitSeason?.season,
                avgYield: seasonalData.reduce((sum, season) => sum + season.yield, 0) / seasonalData.length
            };

            res.json({
                success: true,
                data: {
                    seasons: seasonalData,
                    summary: {
                        ...summary,
                        avgYield: Math.round(summary.avgYield * 100) / 100
                    }
                }
            });
        } catch (error) {
            console.error('Error in getSeasonalPerformance:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: 'Failed to fetch seasonal performance data'
            });
        }
    }

    static async getExpenditureAnalysis(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const { startDate, endDate, preset, groupBy = 'category' } = req.query;

            let dateFilter = {};
            if (preset) {
                const presetRange = AnalyticsController.getDateRangePreset(preset);
                if (presetRange) {
                    dateFilter.createdAt = {
                        $gte: presetRange.startDate,
                        $lte: presetRange.endDate
                    };
                }
            } else {
                dateFilter = AnalyticsController.buildDateFilter(startDate, endDate);
            }

            // Define grouping field
            const groupField = groupBy === 'subCategory' ? '$subCategory' : '$category';

            // Expenditure by category/subcategory
            const expenditureByCategory = await Expenditure.aggregate([
                {
                    $match: {
                        recordedBy: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: groupField,
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' },
                        maxAmount: { $max: '$amount' },
                        minAmount: { $min: '$amount' },
                        categories: { $addToSet: '$category' },
                        paymentModes: { $addToSet: '$paymentMode' },
                        frequencies: { $addToSet: '$frequency' }
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]);

            // Monthly expenditure trend
            const monthlyExpenditure = await Expenditure.aggregate([
                {
                    $match: {
                        recordedBy: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        amount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' },
                        categories: { $addToSet: '$category' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            // Expenditure by payment mode
            const expenditureByPayment = await Expenditure.aggregate([
                {
                    $match: {
                        recordedBy: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: '$paymentMode',
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]);

            // Expenditure by frequency
            const expenditureByFrequency = await Expenditure.aggregate([
                {
                    $match: {
                        recordedBy: userObjectId,
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: '$frequency',
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]);

            // Calculate summary statistics
            const totalExpenditure = expenditureByCategory.reduce((sum, item) => sum + item.totalAmount, 0);
            const totalTransactions = expenditureByCategory.reduce((sum, item) => sum + item.count, 0);

            const summary = {
                totalExpenditure,
                totalTransactions,
                avgExpenditure: totalTransactions > 0 ? Math.round((totalExpenditure / totalTransactions) * 100) / 100 : 0,
                totalCategories: expenditureByCategory.length,
                highestCategory: expenditureByCategory[0]?._id || null,
                highestCategoryAmount: expenditureByCategory[0]?.totalAmount || 0,
                lowestCategory: expenditureByCategory[expenditureByCategory.length - 1]?._id || null,
                lowestCategoryAmount: expenditureByCategory[expenditureByCategory.length - 1]?.totalAmount || 0
            };

            res.json({
                success: true,
                data: {
                    byCategory: expenditureByCategory,
                    monthlyTrend: monthlyExpenditure,
                    byPaymentMode: expenditureByPayment,
                    byFrequency: expenditureByFrequency,
                    summary,
                    meta: {
                        groupBy,
                        dateFilter: {
                            startDate: dateFilter.createdAt?.$gte || null,
                            endDate: dateFilter.createdAt?.$lte || null
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error in getExpenditureAnalysis:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: 'Failed to fetch expenditure analysis data'
            });
        }
    }

    // Get diagnosis statistics
    static async getDiagnosisStats(req, res) {
        try {
            const userId = req.user.userId;
            const userObjectId = new mongoose.Types.ObjectId(userId);

            // Get diagnosis by severity
            const diagnosisBySeverity = await Diagnosis.aggregate([
                { $match: { userId: userObjectId } },
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get diagnosis by crop
            const diagnosisByCrop = await Diagnosis.aggregate([
                { $match: { userId: userObjectId } },
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
                { $match: { userId: userObjectId } },
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


