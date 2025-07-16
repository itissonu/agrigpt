const cropService = require('../services/cropService.js');
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../logger.js');

const createCrop = [
  body('name').notEmpty().withMessage('Crop name is required'),
  body('type').isIn(['Vegetable', 'Grain', 'Fruit', 'Pulse']).withMessage('Invalid crop type'),
  body('variety').notEmpty().withMessage('Variety is required'),
  body('startDate').isISO8601().toDate().withMessage('Invalid start date'),
  body('expectedHarvest').isISO8601().toDate().withMessage('Invalid expected harvest date'),
  body('fieldSize').notEmpty().withMessage('Field size is required'),
  body('currentStage').isIn(['Sowing', 'Growing', 'Flowering', 'Harvesting', 'Harvested']).withMessage('Invalid stage'),
  body('location').notEmpty().withMessage('Location is required'),
  body('whenToPluck').isISO8601().toDate().withMessage('Invalid when to pluck date'),
  body('notes').optional().isString(),
  body('deviceToken').optional().isString().withMessage('Invalid device token'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for create crop', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const cropData = req.body;
      logger.debug('Creating crop', { name: cropData.name, variety: cropData.variety });

      const crop = await cropService.createCrop(cropData);
      logger.info('Crop created', { cropId: crop._id, name: cropData.name });
      res.status(201).json({ crop });
    } catch (error) {
      logger.error('Create crop error', { error: error.message, stack: error.stack, body: req.body });
      res.status(500).json({ error: 'Failed to create crop', details: error.message });
    }
  },
];

const getCrops = [
  body('limit').optional().isInt({ min: 1 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for get crops', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { limit, skip } = req.body;
      logger.debug('Fetching crops', { limit, skip });

      const crops = await cropService.getCrops({ limit, skip });
      logger.info('Retrieved crops', { count: crops.length });
      res.json({ crops });
    } catch (error) {
      logger.error('Get crops error', { error: error.message, stack: error.stack, body: req.body });
      res.status(500).json({ error: 'Failed to retrieve crops', details: error.message });
    }
  },
];

const updateCrop = [
  param('id').isMongoId().withMessage('Invalid crop ID'),
  body('name').optional().notEmpty().withMessage('Crop name cannot be empty'),
  body('type').optional().isIn(['Vegetable', 'Grain', 'Fruit', 'Pulse']).withMessage('Invalid crop type'),
  body('variety').optional().notEmpty().withMessage('Variety cannot be empty'),
  body('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  body('expectedHarvest').optional().isISO8601().toDate().withMessage('Invalid expected harvest date'),
  body('fieldSize').optional().notEmpty().withMessage('Field size cannot be empty'),
  body('currentStage').optional().isIn(['Sowing', 'Growing', 'Flowering', 'Harvesting', 'Harvested']).withMessage('Invalid stage'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty'),
  body('whenToPluck').optional().isISO8601().toDate().withMessage('Invalid when to pluck date'),
  body('notes').optional().isString(),
  body('deviceToken').optional().isString().withMessage('Invalid device token'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for update crop', { errors: errors.array(), params: req.params, body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;
      logger.debug('Updating crop', { id, updateData });

      const crop = await cropService.updateCrop(id, updateData);
      logger.info('Crop updated', { cropId: id, name: crop.name });
      res.json({ crop });
    } catch (error) {
      logger.error('Update crop error', { error: error.message, stack: error.stack, params: req.params });
      res.status(500).json({ error: 'Failed to update crop', details: error.message });
    }
  },
];

const deleteCrop = [
  param('id').isMongoId().withMessage('Invalid crop ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for delete crop', { errors: errors.array(), params: req.params });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      logger.debug('Deleting crop', { id });

      const crop = await cropService.deleteCrop(id);
      logger.info('Crop deleted', { cropId: id, name: crop.name });
      res.json({ message: 'Crop deleted', crop });
    } catch (error) {
      logger.error('Delete crop error', { error: error.message, stack: error.stack, params: req.params });
      res.status(500).json({ error: 'Failed to delete crop', details: error.message });
    }
  },
];

module.exports = { createCrop, getCrops, updateCrop, deleteCrop };