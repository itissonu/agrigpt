const axios = require('axios');

const predictDisease = async (imageBuffer) => {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const version = process.env.ROBOFLOW_VERSION;

    if (!apiKey || !modelId) {
      throw new Error('Roboflow API configuration missing');
    }

    const base64Image = imageBuffer.toString('base64');
    console.log(`Calling Roboflow at: https://detect.roboflow.com/${modelId}/${version}?api_key=${apiKey}`);

    const response = await axios({
      method: 'POST',
      url: `https://detect.roboflow.com/${modelId}/${version}`,
      params: {
        api_key: apiKey,
        format: 'json'
      },
      data: base64Image,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const predictions = response.data.predictions;
    
    if (predictions && predictions.length > 0) {
      const topPrediction = predictions[0];
      return {
        disease: topPrediction.class,
        confidence: topPrediction.confidence
      };
    } else {
      return {
        disease: 'No disease detected',
        confidence: 0
      };
    }
  } catch (error) {
    console.error('Roboflow API error:', error.response?.data || error.message);
    throw new Error('Failed to get prediction from Roboflow');
  }
};

module.exports = {
  predictDisease
};
