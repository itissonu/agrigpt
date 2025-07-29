const { logger } = require('../logger');
const Expenditure = require('../models/expenses');


const createExpenditure = async (expenditureData) => {
  try {
    const expenditure = new Expenditure(expenditureData);
    await expenditure.save();
    logger.debug('Expenditure created', { expenditureId: expenditure._id, recordedBy: expenditure.recordedBy });
    return { expenditure };
  } catch (error) {
    logger.error('Error creating expenditure', { error: error.message, stack: error.stack });
    throw error;
  }
};

const updateExpenditure = async (id, userId, updateData) => {
  try {
    const expenditure = await Expenditure.findOneAndUpdate(
      { _id: id, recordedBy: userId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!expenditure) {
      throw new Error('Expenditure not found or unauthorized');
    }
    logger.debug('Expenditure updated', { expenditureId: id, recordedBy: userId });
    return { expenditure };
  } catch (error) {
    logger.error('Error updating expenditure', { error: error.message, stack: error.stack });
    throw error;
  }
};

const deleteExpenditure = async (id, userId) => {
  try {
    const expenditure = await Expenditure.findOneAndDelete({ _id: id, recordedBy: userId });
    if (!expenditure) {
      throw new Error('Expenditure not found or unauthorized');
    }
    logger.debug('Expenditure deleted', { expenditureId: id, recordedBy: userId });
    return { expenditure };
  } catch (error) {
    logger.error('Error deleting expenditure', { error: error.message, stack: error.stack });
    throw error;
  }
};

const getExpenditures = async (userId, filters = {}) => {
  try {
    console.log(filters)
    const query = { recordedBy: userId, ...filters };
    const expenditures = await Expenditure.find(query)
      .populate('recordedBy', 'email phone')
      .populate('cropsInvolved', ' area')
      .populate('allocations.cropId', 'name area');

    logger.debug('Expenditures fetched', { recordedBy: userId, count: expenditures.length });
    return { expenditures };
  } catch (error) {
    logger.error('Error fetching expenditures', { error: error.message, stack: error.stack });
    throw error;
  }
};

const getExpenditureCategories = async (userId) => {
  try {
    let filter = { recordedBy: userId };
    // if (cropId) {
    //   filter.cropsInvolved = cropId;
    // }

    const categories = await Expenditure.distinct('category', filter);
    logger.debug('Expenditure categories fetched', { recordedBy: userId, count: categories.length });
    return { categories };
  } catch (error) {
    logger.error('Error fetching expenditure categories', { error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = {
  createExpenditure,
  updateExpenditure,
  deleteExpenditure,
  getExpenditures,
  getExpenditureCategories,
};