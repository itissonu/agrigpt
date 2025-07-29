const saleService = require('../services/saleService.js');
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../logger.js');

const createSale = [
  body('date').isISO8601().toDate().withMessage('Invalid date'),
  body('vegetable').isMongoId().withMessage('Invalid crop (vegetable) ID'),

  body('quantity').notEmpty().withMessage('Quantity is required'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Invalid selling price'),
  body('buyerName').notEmpty().withMessage('Buyer name is required'),
  body('paymentStatus').isIn(['Paid', 'Pending']).withMessage('Invalid payment status'),
  body('notes').optional().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for create sale', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { date, vegetable, quantity, sellingPrice, buyerName, paymentStatus, notes } = req.body;
      const totalAmount = parseFloat(quantity.split(' ')[0]) * parseFloat(sellingPrice);
      const userId = req.user.userId;
      logger.debug('Creating sale', { vegetable, quantity, buyerName, userId });

      const sale = await saleService.createSale(userId, {
        date,
        vegetable,
        quantity,
        sellingPrice,
        totalAmount,
        buyerName,
        paymentStatus,
        notes,
      });
      logger.info('Sale created', { saleId: sale._id, vegetable, totalAmount, userId });
      console.log({"sale from controller":sale})
      res.status(201).json({ sale });
    } catch (error) {
      logger.error('Create sale error', { error: error.message, stack: error.stack, body: req.body, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to create sale', details: error.message });
    }
  },
];

const getSales = [
  body('filterMonth').optional().isIn(['all', 'current', 'last']).withMessage('Invalid filter month'),
  body('filterVegetable').optional().isString().withMessage('Invalid vegetable filter'),
  body('limit').optional().isInt({ min: 1 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for get sales', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { filterMonth, filterVegetable, limit, skip } = req.body;
      const userId = req.user.userId;
      logger.debug('Fetching sales', { filterMonth, filterVegetable, limit, skip, userId });

      const sales = await saleService.getSales(userId, { filterMonth, filterVegetable, limit, skip });
      logger.info('Retrieved sales', { count: sales.length, filterMonth, filterVegetable, userId });
      console.log({"sales ingetroutercontroller":sales})
      res.json({ sales });
    } catch (error) {
      logger.error('Get sales error', { error: error.message, stack: error.stack, body: req.body, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to retrieve sales', details: error.message });
    }
  },
];

const updateSale = [
  param('id').isMongoId().withMessage('Invalid sale ID'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('Invalid selling price'),
  body('paymentStatus').optional().isIn(['Paid', 'Pending']).withMessage('Invalid payment status'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for update sale', { errors: errors.array(), params: req.params, body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;
      console.log({"updatedata":updateData})
      if (updateData.quantity && updateData.sellingPrice) {
        updateData.totalAmount = parseFloat(updateData.quantity.split(' ')[0]) * parseFloat(updateData.sellingPrice);
      }
      console.log({"after updatedata":updateData})
      const userId = req.user.userId;
      logger.debug('Updating sale', { id, updateData, userId });

      const sale = await saleService.updateSale(userId, id, updateData);
      logger.info('Sale updated', { id, totalAmount: sale.totalAmount, userId });
      res.json({ sale });
    } catch (error) {
      logger.error('Update sale error', { error: error.message, stack: error.stack, params: req.params, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to update sale', details: error.message });
    }
  },
];

const deleteSale = [
  param('id').isMongoId().withMessage('Invalid sale ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for delete sale', { errors: errors.array(), params: req.params });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;
      logger.debug('Deleting sale', { id, userId });

      const sale = await saleService.deleteSale(userId, id);
      logger.info('Sale deleted', { id, userId });
      res.json({ message: 'Sale deleted', sale });
    } catch (error) {
      logger.error('Delete sale error', { error: error.message, stack: error.stack, params: req.params, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to delete sale', details: error.message });
    }
  },
];

module.exports = { createSale, getSales, updateSale, deleteSale };