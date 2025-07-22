const Crop = require('../models/Crop.js');
const { logger } = require('../logger');
const { sendPushNotification } = require('./notificationService.js');
const cron = require('node-cron');

const createCrop = async (userId, cropData) => {
  try {
    const { currentStage, ...rest } = cropData;
    const progress = calculateProgress(currentStage);
    const crop = await Crop.create({ userId, ...rest, currentStage, progress });
    logger.info('Created crop', { cropId: crop._id, name: cropData.name, userId });

    if (crop.whenToPluck && crop.deviceToken) {
      scheduleHarvestNotification(crop);
    }

    return crop;
  } catch (error) {
    logger.error('Failed to create crop', { error: error.message, stack: error.stack, cropData, userId });
    throw error;
  }
};

const getCrops = async (userId, { limit = 10, skip = 0 }) => {
  try {
    const crops = await Crop.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    logger.info('Retrieved crops', { count: crops.length, userId });
    return crops;
  } catch (error) {
    logger.error('Failed to retrieve crops', { error: error.message, stack: error.stack, userId });
    throw error;
  }
};

const updateCrop = async (userId, id, updateData) => {
  try {
    const { currentStage, ...rest } = updateData;
    if (currentStage) {
      rest.progress = calculateProgress(currentStage);
        rest.currentStage = currentStage;
    }
    const crop = await Crop.findOneAndUpdate(
      { _id: id, userId },
      { $set: rest },
      { new: true, runValidators: true }
    );
    if (!crop) throw new Error('Crop not found or unauthorized');
    logger.info('Updated crop', { cropId: id, name: crop.name, userId });

    if (updateData.whenToPluck && crop.deviceToken) {
      scheduleHarvestNotification(crop);
    }

    return crop;
  } catch (error) {
    logger.error('Failed to update crop', { error: error.message, stack: error.stack, id, userId });
    throw error;
  }
};

const deleteCrop = async (userId, id) => {
  try {
    const crop = await Crop.findOneAndDelete({ _id: id, userId });
    if (!crop) throw new Error('Crop not found or unauthorized');
    logger.info('Deleted crop', { cropId: id, name: crop.name, userId });
    return crop;
  } catch (error) {
    logger.error('Failed to delete crop', { error: error.message, stack: error.stack, id, userId });
    throw error;
  }
};

const calculateProgress = (stage) => {
  const stages = {
    Sowing: 5,
    Growing: 40,
    Flowering: 70,
    Harvesting: 95,
    Harvested: 100,
  };
  return stages[stage] || 5;
};

const scheduleHarvestNotification = (crop) => {
  const pluckDate = new Date(crop.whenToPluck);
  const now = new Date();
  if (pluckDate <= now) return;

  const schedule = `${pluckDate.getMinutes()} ${pluckDate.getHours()} ${pluckDate.getDate()} ${pluckDate.getMonth() + 1} *`;
  cron.schedule(schedule, async () => {
    try {
      await sendPushNotification(
        crop.deviceToken,
        `Harvest Reminder: ${crop.name}`,
        `Your ${crop.name} (${crop.variety}) is ready to harvest in ${crop.location}!`
      );
    } catch (error) {
      logger.error('Failed to send scheduled notification', { cropId: crop._id, error: error.message });
    }
  }, { timezone: 'Asia/Kolkata' });
  logger.info('Scheduled harvest notification', { cropId: crop._id, whenToPluck: crop.whenToPluck });
};

module.exports = { createCrop, getCrops, updateCrop, deleteCrop };