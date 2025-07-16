const Sale = require('../models/sales.js');
const logger = require('../logger');

// Create
const createSale = async (saleData) => {
  try {
    const sale = await Sale.create(saleData);
    logger.info(`Created sale for vegetable: ${saleData.vegetable}`);
    return sale;
  } catch (error) {
    logger.error(`Failed to create sale: ${error.message}`, { error });
    throw error;
  }
};

// Read
const getSales = async ({ filterMonth = 'all', filterVegetable = 'all', limit = 10, skip = 0 }) => {
  try {
    const query = {};
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
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    logger.info(`Retrieved ${sales.length} sales`);
    return sales;
  } catch (error) {
    logger.error(`Failed to retrieve sales: ${error.message}`, { error });
    throw error;
  }
};

// Update
const updateSale = async (id, updateData) => {
  try {
    const sale = await Sale.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!sale) throw new Error('Sale not found');
    logger.info(`Updated sale ID: ${id}`);
    return sale;
  } catch (error) {
    logger.error(`Failed to update sale: ${error.message}`, { error });
    throw error;
  }
};

// Delete
const deleteSale = async (id) => {
  try {
    const sale = await Sale.findByIdAndDelete(id);
    if (!sale) throw new Error('Sale not found');
    logger.info(`Deleted sale ID: ${id}`);
    return sale;
  } catch (error) {
    logger.error(`Failed to delete sale: ${error.message}`, { error });
    throw error;
  }
};

module.exports = { createSale, getSales, updateSale, deleteSale };