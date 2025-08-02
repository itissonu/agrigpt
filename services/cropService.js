const Crop = require('../models/Crop.js');
const { logger } = require('../logger');
const notificationService = require('./notificationService');
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

     if (updateData.whenToPluck) {
      const harvestDate = new Date(updateData.whenToPluck);
      const today = new Date();
      const daysUntilHarvest = Math.ceil((harvestDate - today) / (1000 * 60 * 60 * 24));
      
      // If harvest is due within 3 days, send immediate notification
      if (daysUntilHarvest <= 3 && daysUntilHarvest >= 0) {
        try {
          await notificationService.sendHarvestReminder(id, userId);
          logger.info('Immediate harvest reminder sent for updated crop', { cropId: id, daysUntilHarvest });
        } catch (notificationError) {
          logger.warn('Failed to send immediate harvest reminder', { 
            cropId: id, 
            error: notificationError.message 
          });
        }
      }
    }
    

    // if (updateData.whenToPluck && crop.deviceToken) {
    //   scheduleHarvestNotification(crop);
    // }

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
const getCropsDueForHarvest = async (userId, daysAhead = 7) => {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    const crops = await Crop.find({
      userId,
      currentStage: { $nin: ['Harvested'] }, // Exclude already harvested crops
      whenToPluck: {
        $gte: today.toISOString().split('T')[0],
        $lte: futureDate.toISOString().split('T')[0]
      }
    }).lean();
    
    logger.info('Retrieved crops due for harvest', { count: crops.length, userId, daysAhead });
    return crops;
  } catch (error) {
    logger.error('Failed to retrieve crops due for harvest', { 
      error: error.message, 
      stack: error.stack, 
      userId, 
      daysAhead 
    });
    throw error;
  }
};

// Get harvest calendar data
const getHarvestCalendar = async (userId, month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1); // month is 0-indexed
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const crops = await Crop.find({
      userId,
      $or: [
        {
          startDate: {
            $gte: startDate.toISOString().split('T')[0],
            $lte: endDate.toISOString().split('T')[0]
          }
        },
        {
          whenToPluck: {
            $gte: startDate.toISOString().split('T')[0],
            $lte: endDate.toISOString().split('T')[0]
          }
        },
        {
          expectedHarvest: {
            $gte: startDate.toISOString().split('T')[0],
            $lte: endDate.toISOString().split('T')[0]
          }
        }
      ]
    }).lean();
    
    // Organize crops by date
    const calendar = {};
    
    crops.forEach(crop => {
      // Add start date
      if (crop.startDate >= startDate.toISOString().split('T')[0] && 
          crop.startDate <= endDate.toISOString().split('T')[0]) {
        if (!calendar[crop.startDate]) calendar[crop.startDate] = [];
        calendar[crop.startDate].push({
          ...crop,
          eventType: 'planted',
          description: `Planted ${crop.name} (${crop.variety})`
        });
      }
      
      // Add harvest date
      if (crop.whenToPluck >= startDate.toISOString().split('T')[0] && 
          crop.whenToPluck <= endDate.toISOString().split('T')[0]) {
        if (!calendar[crop.whenToPluck]) calendar[crop.whenToPluck] = [];
        calendar[crop.whenToPluck].push({
          ...crop,
          eventType: 'harvest',
          description: `Harvest ${crop.name} (${crop.variety})`
        });
      }
    });
    
    logger.info('Generated harvest calendar', { userId, month, year, eventCount: Object.keys(calendar).length });
    return calendar;
  } catch (error) {
    logger.error('Failed to generate harvest calendar', { 
      error: error.message, 
      stack: error.stack, 
      userId, 
      month, 
      year 
    });
    throw error;
  }
};


module.exports = { createCrop, getCrops, updateCrop, deleteCrop ,  getCropsDueForHarvest,
  getHarvestCalendar};