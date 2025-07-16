const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/diagnosis_history.json');

const ensureDataDirectory = async () => {
  const dataDir = path.dirname(HISTORY_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

const loadHistory = async () => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { textDiagnoses: [], imageDiagnoses: [] };
  }
};

const saveHistory = async (history) => {
  await ensureDataDirectory();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
};

const saveTextDiagnosis = async (diagnosis) => {
  try {
    const history = await loadHistory();
    history.textDiagnoses.push(diagnosis);
    await saveHistory(history);
  } catch (error) {
    console.error('Failed to save text diagnosis history:', error);
  }
};

const saveImageDiagnosis = async (diagnosis) => {
  try {
    const history = await loadHistory();
    history.imageDiagnoses.push(diagnosis);
    await saveHistory(history);
  } catch (error) {
    console.error('Failed to save image diagnosis history:', error);
  }
};

const getHistory = async () => {
  return await loadHistory();
};

module.exports = {
  saveTextDiagnosis,
  saveImageDiagnosis,
  getHistory
};