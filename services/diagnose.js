
const { logger } = require('../logger');

const Diagnosis = require('../models/Diagnosis');


const saveDiagnosis = async (userId, { type, crop, symptoms, diagnosis, imageUrl, sessionId, language, severity = 'Moderate', status = 'In Progress' }) => {
  try {
    const record = await Diagnosis.create({ userId, type, crop, symptoms, diagnosis, imageUrl, sessionId, language, severity, status });
    logger.info('Saved diagnosis to MongoDB', { type, crop, sessionId, diagnosisId: record._id, userId });
    return record;
  } catch (error) {
    logger.error('Failed to save diagnosis', { error: error.message, stack: error.stack, type, crop, sessionId, userId });
    throw error;
  }
};

const getDiagnoses = async (userId, { type, crop, sessionId, limit = 10, skip = 0 }) => {
  try {
    const query = { userId };
    if (type) query.type = type;
    if (crop) query.crop = crop;
    if (sessionId) query.sessionId = sessionId;
    const diagnoses = await Diagnosis.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    logger.info('Retrieved diagnoses from MongoDB', { count: diagnoses.length, type, crop, sessionId, userId });
    return diagnoses;
  } catch (error) {
    logger.error('Failed to retrieve diagnoses', { error: error.message, stack: error.stack, type, crop, sessionId, userId });
    throw error;
  }
};

const updateDiagnosis = async (userId, id, updateData) => {
  try {
    const record = await Diagnosis.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!record) throw new Error('Diagnosis not found or unauthorized');
    logger.info('Updated diagnosis in MongoDB', { id, userId });
    return record;
  } catch (error) {
    logger.error('Failed to update diagnosis', { error: error.message, stack: error.stack, id, userId });
    throw error;
  }
};

const deleteDiagnosis = async (userId, id) => {
  try {
    const record = await Diagnosis.findOneAndDelete({ _id: id, userId });
    if (!record) throw new Error('Diagnosis not found or unauthorized');
    logger.info('Deleted diagnosis from MongoDB', { id, userId });
    return record;
  } catch (error) {
    logger.error('Failed to delete diagnosis', { error: error.message, stack: error.stack, id, userId });
    throw error;
  }
};

module.exports = {
  saveDiagnosis,
  getDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
};