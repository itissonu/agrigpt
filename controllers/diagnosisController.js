
const diagnosisService = require('../services/diagnose.js');
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../logger');

const getDiagnoses = [
  body('type').optional().isIn(['text', 'image']).withMessage('Invalid diagnosis type'),
  body('crop').optional().isString().withMessage('Invalid crop name'),
  body('sessionId').optional().isString().withMessage('Invalid session ID'),
  body('limit').optional().isInt({ min: 1 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for get diagnoses', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, crop, sessionId, limit = 10, skip = 0 } = req.body;
      const userId = req.user.userId;
      logger.debug('Fetching diagnoses', { type, crop, sessionId, limit, skip, userId });

      const diagnoses = await diagnosisService.getDiagnoses(userId, { type, crop, sessionId, limit, skip });
      logger.info('Retrieved diagnoses', { count: diagnoses.length, type, crop, sessionId, userId });
      res.json({ diagnoses });
    } catch (error) {
      logger.error('Get diagnoses error', { error: error.message, stack: error.stack, body: req.body, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to retrieve diagnoses', details: error.message });
    }
  },
];

const updateDiagnosis = [
  param('id').isMongoId().withMessage('Invalid diagnosis ID'),
  body('diagnosis').optional().isObject().withMessage('Invalid diagnosis object'),
  body('severity').optional().isIn(['Mild', 'Moderate', 'High']).withMessage('Invalid severity'),
  body('status').optional().isIn(['Resolved', 'Treated', 'In Progress']).withMessage('Invalid status'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for update diagnosis', { errors: errors.array(), params: req.params, body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.userId;
      logger.debug('Updating diagnosis', { id, updateData, userId });

      const record = await diagnosisService.updateDiagnosis(userId, id, updateData);
      logger.info('Diagnosis updated', { id, userId });
      res.json({ diagnosis: record });
    } catch (error) {
      logger.error('Update diagnosis error', { error: error.message, stack: error.stack, params: req.params, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to update diagnosis', details: error.message });
    }
  },
];

const deleteDiagnosis = [
  param('id').isMongoId().withMessage('Invalid diagnosis ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for delete diagnosis', { errors: errors.array(), params: req.params });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;
      logger.debug('Deleting diagnosis', { id, userId });

      const record = await diagnosisService.deleteDiagnosis(userId, id);
      logger.info('Diagnosis deleted', { id, userId });
      res.json({ message: 'Diagnosis deleted', diagnosis: record });
    } catch (error) {
      logger.error('Delete diagnosis error', { error: error.message, stack: error.stack, params: req.params, userId: req.user.userId });
      res.status(500).json({ error: 'Failed to delete diagnosis', details: error.message });
    }
  },
];

module.exports = {
  getDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
};