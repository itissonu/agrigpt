const { body, query, validationResult } = require('express-validator');
const expenditureService = require('../services/expenditureService.js');
const { logger } = require('../logger');


const createExpenditure = [
  body('category').isString().notEmpty().withMessage('Category is required'),
  body('subCategory').optional().isString().withMessage('Invalid subcategory'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('frequency').isIn(['Monthly', 'Seasonal', 'Yearly', 'One-Time']).withMessage('Invalid frequency'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('paymentMode').optional().isIn(['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit']).withMessage('Invalid payment mode'),
  body('paidTo').optional().isString().withMessage('Invalid paid to'),
  body('invoiceNumber').optional().isString().withMessage('Invalid invoice number'),
  body('farmSection').optional().isString().withMessage('Invalid farm section'),
  body('notes').optional().isString().withMessage('Invalid notes'),
  body('allocationMethod').optional().isIn(['manual', 'fieldSize']).withMessage('Invalid allocation method'),
  body('cropsInvolved').optional().isArray().withMessage('Crops involved must be an array of crop IDs'),
  body('cropsInvolved.*').isMongoId().withMessage('Invalid crop ID in cropsInvolved'),
  body('allocations').optional().isArray().withMessage('Allocations must be an array'),
  body('allocations.*.cropId').isMongoId().withMessage('Invalid crop ID in allocations'),
  body('allocations.*.allocatedAmount').isFloat({ min: 0 }).withMessage('Allocated amount must be positive'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for create expenditure', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const expenditureData = {
        ...req.body,
        recordedBy: req.user.userId, // From auth middleware
      };
      const result = await expenditureService.createExpenditure(expenditureData);
      res.status(201).json({
        expenditure: {
          id: result.expenditure._id,
          category: result.expenditure.category,
          subCategory: result.expenditure.subCategory,
          amount: result.expenditure.amount,
          frequency: result.expenditure.frequency,
          date: result.expenditure.date,
          paymentMode: result.expenditure.paymentMode,
          paidTo: result.expenditure.paidTo,
          invoiceNumber: result.expenditure.invoiceNumber,
          farmSection: result.expenditure.farmSection,
          recordedBy: result.expenditure.recordedBy,
          createdAt: result.expenditure.createdAt,
          updatedAt: result.expenditure.updatedAt,
          notes: result.expenditure.notes,
          allocationMethod: result.expenditure.allocationMethod,
          cropsInvolved: result.expenditure.cropsInvolved,
          allocations: result.expenditure.allocations,
        },
      });
    } catch (error) {
      logger.error('Create expenditure error', { error: error.message, stack: error.stack, body: req.body });
      res.status(400).json({ error: error.message });
    }
  },
];

const updateExpenditure = [
  body('category').optional().isString().notEmpty().withMessage('Category cannot be empty'),
  body('subCategory').optional().isString().withMessage('Invalid subcategory'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('frequency').optional().isIn(['Monthly', 'Seasonal', 'Yearly', 'One-Time']).withMessage('Invalid frequency'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('paymentMode').optional().isIn(['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit']).withMessage('Invalid payment mode'),
  body('paidTo').optional().isString().withMessage('Invalid paid to'),
  body('invoiceNumber').optional().isString().withMessage('Invalid invoice number'),
  body('farmSection').optional().isString().withMessage('Invalid farm section'),
  body('notes').optional().isString().withMessage('Invalid notes'),
  body('allocationMethod').optional().isIn(['manual', 'fieldSize']),
  body('cropsInvolved').optional().isArray(),
  body('cropsInvolved.*').optional().isMongoId(),
  body('allocations').optional().isArray(),
  body('allocations.*.cropId').optional().isMongoId(),
  body('allocations.*.allocatedAmount').optional().isFloat({ min: 0 }),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for update expenditure', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await expenditureService.updateExpenditure(req.params.id, req.user.userId, req.body);
      res.json({
        expenditure: {
          id: result.expenditure._id,
          category: result.expenditure.category,
          subCategory: result.expenditure.subCategory,
          amount: result.expenditure.amount,
          frequency: result.expenditure.frequency,
          date: result.expenditure.date,
          paymentMode: result.expenditure.paymentMode,
          paidTo: result.expenditure.paidTo,
          invoiceNumber: result.expenditure.invoiceNumber,
          farmSection: result.expenditure.farmSection,
          recordedBy: result.expenditure.recordedBy,
          createdAt: result.expenditure.createdAt,
          updatedAt: result.expenditure.updatedAt,
          notes: result.expenditure.notes,
          allocationMethod: result.expenditure.allocationMethod,
          cropsInvolved: result.expenditure.cropsInvolved,
          allocations: result.expenditure.allocations,
        },
      });
    } catch (error) {
      logger.error('Update expenditure error', { error: error.message, stack: error.stack, body: req.body });
      res.status(400).json({ error: error.message });
    }
  },
];

const deleteExpenditure = [
  async (req, res) => {
    try {
      const result = await expenditureService.deleteExpenditure(req.params.id, req.user.userId);
      res.json({
        expenditure: {
          id: result.expenditure._id,
          category: result.expenditure.category,
          subCategory: result.expenditure.subCategory,
          amount: result.expenditure.amount,
          frequency: result.expenditure.frequency,
          date: result.expenditure.date,
          paymentMode: result.expenditure.paymentMode,
          paidTo: result.expenditure.paidTo,
          invoiceNumber: result.expenditure.invoiceNumber,
          farmSection: result.expenditure.farmSection,
          recordedBy: result.expenditure.recordedBy,
          createdAt: result.expenditure.createdAt,
          updatedAt: result.expenditure.updatedAt,
          notes: result.expenditure.notes,
          allocationMethod: result.expenditure.allocationMethod,
          cropsInvolved: result.expenditure.cropsInvolved,
          allocations: result.expenditure.allocations,
        },
      });
    } catch (error) {
      logger.error('Delete expenditure error', { error: error.message, stack: error.stack, params: req.params });
      res.status(400).json({ error: error.message });
    }
  },
];

const getExpenditures = [
  query('category').optional().isString().withMessage('Invalid category'),
  query('frequency').optional().isIn(['Monthly', 'Seasonal', 'Yearly', 'One-Time']).withMessage('Invalid frequency'),
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for get expenditures', { errors: errors.array(), query: req.query });
        return res.status(400).json({ errors: errors.array() });
      }

      const filters = req.query;
      const result = await expenditureService.getExpenditures(req.user.userId, filters);
      res.json({
        expenditures: result.expenditures.map((expenditure) => ({
          id: expenditure._id,
          category: expenditure.category,
          subCategory: expenditure.subCategory,
          amount: expenditure.amount,
          frequency: expenditure.frequency,
          date: expenditure.date,
          paymentMode: expenditure.paymentMode,
          paidTo: expenditure.paidTo,
          invoiceNumber: expenditure.invoiceNumber,
          farmSection: expenditure.farmSection,
          recordedBy: expenditure.recordedBy,
          createdAt: expenditure.createdAt,
          updatedAt: expenditure.updatedAt,
          notes: expenditure.notes,
          allocationMethod: expenditure.allocationMethod,
          cropsInvolved: expenditure.cropsInvolved,
          allocations: expenditure.allocations,
        })),
      });
    } catch (error) {
      logger.error('Get expenditures error', { error: error.message, stack: error.stack, query: req.query });
      res.status(500).json({ error: error.message });
    }
  },
];

const getExpenditureCategories = [
  async (req, res) => {
    try {
      const result = await expenditureService.getExpenditureCategories(req.user.userId);
      res.json({ categories: result.categories });
    } catch (error) {
      logger.error('Get expenditure categories error', { error: error.message, stack: error.stack });
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  createExpenditure,
  updateExpenditure,
  deleteExpenditure,
  getExpenditures,
  getExpenditureCategories,
};