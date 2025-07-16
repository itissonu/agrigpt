const saleService = require('../services/saleService.js');
const { body, param, validationResult } = require('express-validator');
const logger = require('../logger');

const createSale = [
  body('date').isISO8601().toDate().withMessage('Invalid date'),
  body('vegetable').notEmpty().withMessage('Vegetable is required'),
  body('quantity').notEmpty().withMessage('Quantity is required'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Invalid selling price'),
  body('buyerName').notEmpty().withMessage('Buyer name is required'),
  body('paymentStatus').isIn(['Paid', 'Pending']).withMessage('Invalid payment status'),
  body('notes').optional().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { date, vegetable, quantity, sellingPrice, buyerName, paymentStatus, notes } = req.body;
      const totalAmount = parseFloat(quantity.split(' ')[0]) * parseFloat(sellingPrice);
      const sale = await saleService.createSale({
        date,
        vegetable,
        quantity,
        sellingPrice,
        totalAmount,
        buyerName,
        paymentStatus,
        notes,
      });
      res.status(201).json({ sale });
    } catch (error) {
      logger.error(`Create sale error: ${error.message}`, { error });
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
        return res.status(400).json({ errors: errors.array() });
      }

      const { filterMonth, filterVegetable, limit, skip } = req.body;
      const sales = await saleService.getSales({ filterMonth, filterVegetable, limit, skip });
      res.json({ sales });
    } catch (error) {
      logger.error(`Get sales error: ${error.message}`, { error });
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
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;
      if (updateData.quantity && updateData.sellingPrice) {
        updateData.totalAmount = parseFloat(updateData.quantity.split(' ')[0]) * parseFloat(updateData.sellingPrice);
      }
      const sale = await saleService.updateSale(id, updateData);
      res.json({ sale });
    } catch (error) {
      logger.error(`Update sale error: ${error.message}`, { error });
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
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const sale = await saleService.deleteSale(id);
      res.json({ message: 'Sale deleted', sale });
    } catch (error) {
      logger.error(`Delete sale error: ${error.message}`, { error });
      res.status(500).json({ error: 'Failed to delete sale', details: error.message });
    }
  },
];

module.exports = { createSale, getSales, updateSale, deleteSale };