const Crop = require('../models/Crop.js');
const { logger } = require('../logger');
const { sendPushNotification } = require('./notificationService.js');
const cron = require('node-cron');

// Create
const createCrop = async (cropData) => {
  try {
    const { currentStage, quantity, sellingPrice, ...rest } = cropData;
    const progress = calculateProgress(currentStage);
    const crop = await Crop.create({ ...rest, currentStage, progress });
    logger.info('Created crop', { cropId: crop._id, name: cropData.name });
    
    // Schedule notification if whenToPluck is set
    if (crop.whenToPluck && crop.deviceToken) {
      scheduleHarvestNotification(crop);
    }
    
    return crop;
  } catch (error) {
    logger.error('Failed to create crop', { error: error.message, stack: error.stack, cropData });
    throw error;
  }
};

// Read
const getCrops = async ({ limit = 10, skip = 0 }) => {
  try {
    const crops = await Crop.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    logger.info('Retrieved crops', { count: crops.length });
    return crops;
  } catch (error) {
    logger.error('Failed to retrieve crops', { error: error.message, stack: error.stack });
    throw error;
  }
};

// Update
const updateCrop = async (id, updateData) => {
  try {
    const { currentStage, quantity, sellingPrice, ...rest } = updateData;
    if (currentStage) {
      rest.progress = calculateProgress(currentStage);
    }
    const crop = await Crop.findByIdAndUpdate(id, { $set: rest }, { new: true, runValidators: true });
    if (!crop) throw new Error('Crop not found');
    logger.info('Updated crop', { cropId: id, name: crop.name });

    // Reschedule notification if whenToPluck is updated
    if (updateData.whenToPluck && crop.deviceToken) {
      scheduleHarvestNotification(crop);
    }

    return crop;
  } catch (error) {
    logger.error('Failed to update crop', { error: error.message, stack: error.stack, id });
    throw error;
  }
};

// Delete
const deleteCrop = async (id) => {
  try {
    const crop = await Crop.findByIdAndDelete(id);
    if (!crop) throw new Error('Crop not found');
    logger.info('Deleted crop', { cropId: id, name: crop.name });
    return crop;
  } catch (error) {
    logger.error('Failed to delete crop', { error: error.message, stack: error.stack, id });
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