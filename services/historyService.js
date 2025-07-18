const mongoose = require('mongoose');
const { logger } = require('../logger');

const Diagnosis = require('../models/Diagnosis');

const saveTextDiagnosis = async (userId, { crop, symptoms, diagnosis, sessionId, language }) => {
  try {
    const record = await Diagnosis.create({ userId, crop, symptoms, diagnosis, sessionId, language });
    logger.info('Saved diagnosis to MongoDB', { crop, sessionId, diagnosisId: record._id, userId });
    return record;
  } catch (error) {
    logger.error('Failed to save diagnosis', { error: error.message, stack: error.stack, crop, sessionId, userId });
    throw error;
  }
};

const getDiagnoses = async (userId, { sessionId, limit = 10, skip = 0 }) => {
  try {
    const query = { userId };
    if (sessionId) query.sessionId = sessionId;
    const diagnoses = await Diagnosis.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    logger.info('Retrieved diagnoses from MongoDB', { count: diagnoses.length, sessionId, userId });
    return diagnoses;
  } catch (error) {
    logger.error('Failed to retrieve diagnoses', { error: error.message, stack: error.stack, sessionId, userId });
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
  saveTextDiagnosis,
  getDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
};




































// const fs = require('fs').promises;
// const path = require('path');

// const HISTORY_FILE = path.join(__dirname, '../data/diagnosis_history.json');

// const ensureDataDirectory = async () => {
//   const dataDir = path.dirname(HISTORY_FILE);
//   try {
//     await fs.access(dataDir);
//   } catch {
//     await fs.mkdir(dataDir, { recursive: true });
//   }
// };

// const loadHistory = async () => {
//   try {
//     await ensureDataDirectory();
//     const data = await fs.readFile(HISTORY_FILE, 'utf8');
//     return JSON.parse(data);
//   } catch {
//     return { textDiagnoses: [], imageDiagnoses: [] };
//   }
// };

// const saveHistory = async (history) => {
//   await ensureDataDirectory();
//   await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
// };

// const saveTextDiagnosis = async (diagnosis) => {
//   try {
//     const history = await loadHistory();
//     history.textDiagnoses.push(diagnosis);
//     await saveHistory(history);
//   } catch (error) {
//     console.error('Failed to save text diagnosis history:', error);
//   }
// };

// const saveImageDiagnosis = async (diagnosis) => {
//   try {
//     const history = await loadHistory();
//     history.imageDiagnoses.push(diagnosis);
//     await saveHistory(history);
//   } catch (error) {
//     console.error('Failed to save image diagnosis history:', error);
//   }
// };

// const getHistory = async () => {
//   return await loadHistory();
// };

// module.exports = {
//   saveTextDiagnosis,
//   saveImageDiagnosis,
//   getHistory
// };