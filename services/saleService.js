const Sale = require('../models/sales.js');
const { logger } = require('../logger');

const createSale = async (userId, saleData) => {
  try {
    const sale = await Sale.create({ userId, ...saleData });
    logger.info('Saved sale to MongoDB', { saleId: sale._id, vegetable: saleData.vegetable, userId });
    return Sale.findById(sale._id).populate('vegetable')
    
    
      
  } catch (error) {
    logger.error('Failed to save sale', { error: error.message, stack: error.stack, saleData, userId });
    throw error;
  }
};

const getSales = async (userId, { filterMonth = 'all', filterVegetable = 'all', limit = 10, skip = 0 }) => {
  try {
    const query = { userId };
    if (filterVegetable !== 'all') query.vegetable = filterVegetable;
    if (filterMonth !== 'all') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      if (filterMonth === 'current') {
        query.createdAt = {
          $gte: new Date(currentYear, currentMonth, 1),
          $lte: new Date(currentYear, currentMonth + 1, 0),
        };
      } else if (filterMonth === 'last') {
        query.createdAt = {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lte: new Date(currentYear, currentMonth, 0),
        };
      }
    }
    const sales = await Sale.find(query).
    populate('vegetable')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      
    logger.info('Retrieved sales from MongoDB', { count: sales.length, filterMonth, filterVegetable, userId });
    return sales;
  } catch (error) {
    logger.error('Failed to retrieve sales', { error: error.message, stack: error.stack, filterMonth, filterVegetable, userId });
    throw error;
  }
};

const updateSale = async (userId, id, updateData) => {
   try {
    const sale = await Sale.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!sale) throw new Error('Sale not found or unauthorized');

    logger.info('Updated sale in MongoDB', { id, userId });

    const populatedSale = await Sale.findById(sale._id).populate('vegetable');
    return populatedSale;
  } catch (error) {
    logger.error('Failed to update sale', {
      error: error.message,
      stack: error.stack,
      id,
      userId,
    });
    throw error;
  }
};

const deleteSale = async (userId, id) => {
  try {
    const sale = await Sale.findOneAndDelete({ _id: id, userId });
    if (!sale) throw new Error('Sale not found or unauthorized');
    logger.info('Deleted sale from MongoDB', { id, userId });
    return sale;
  } catch (error) {
    logger.error('Failed to delete sale', { error: error.message, stack: error.stack, id, userId });
    throw error;
  }
};

module.exports = { createSale, getSales, updateSale, deleteSale };