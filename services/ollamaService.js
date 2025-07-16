const axios = require('axios');
const translate = require('@vitalets/google-translate-api');




const getDiagnosis = async (crop, symptoms,language) => {
    try {
        const diagnosis = await getGeminiDiagnosis(crop, symptoms,language);

        return { diagnosis };
    } catch (error) {
        console.warn('Gemini API failed, trying fallback:', error.message);
        const fallbackDiagnosis = getRuleBasedDiagnosis(crop, symptoms);

        return { diagnosis: fallbackDiagnosis };
    }
};

const getGeminiDiagnosis = async (crop, symptoms,language) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const model = 'gemini-1.5-flash';

    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    const prompt = `
You are a crop disease expert.

Crop: ${crop}
Symptoms: ${symptoms}
Language: ${language}

Provide this information in ${language}:

{
  "disease": "...",
  "cause": "...",
  "organic": "...",
  "chemical": "...",
  "prevention": "..."
}
Only return JSON.
`;


    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        },
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse Gemini API response');
};

const getRuleBasedDiagnosis = (crop, symptoms) => {
    const symptomsLower = symptoms.toLowerCase();
    const cropLower = crop.toLowerCase();

    let disease = 'Unknown Disease';
    let cause = 'Unknown cause';
    let organic = 'Neem oil spray';
    let chemical = 'Consult agricultural expert';
    let prevention = 'Maintain proper plant hygiene';

    if (symptomsLower.includes('white') && symptomsLower.includes('powder')) {
        disease = 'Powdery Mildew';
        cause = 'Fungal infection in humid conditions';
        organic = 'Baking soda spray (1 tsp per quart water)';
        chemical = 'Sulfur-based fungicide';
        prevention = 'Improve air circulation, avoid overhead watering';
    } else if (symptomsLower.includes('spot') && symptomsLower.includes('brown')) {
        disease = 'Leaf Spot';
        cause = 'Fungal or bacterial infection';
        organic = 'Copper-based organic fungicide';
        chemical = 'Chlorothalonil fungicide';
        prevention = 'Water at soil level, remove infected leaves';
    } else if (symptomsLower.includes('yellow') && symptomsLower.includes('wilt')) {
        disease = 'Fusarium Wilt';
        cause = 'Soil-borne fungal infection';
        organic = 'Beneficial microorganisms, compost tea';
        chemical = 'Fungicide drench';
        prevention = 'Crop rotation, well-draining soil';
    } else if (symptomsLower.includes('black') && symptomsLower.includes('rot')) {
        disease = 'Black Rot';
        cause = 'Bacterial infection';
        organic = 'Copper sulfate spray';
        chemical = 'Streptomycin antibiotic';
        prevention = 'Avoid wetting leaves, good sanitation';
    }

    if (cropLower.includes('tomato')) {
        if (symptomsLower.includes('yellow') && symptomsLower.includes('leaf')) {
            disease = 'Tomato Yellow Leaf Curl';
            cause = 'Viral infection transmitted by whiteflies';
            organic = 'Neem oil for whitefly control';
            chemical = 'Imidacloprid for whitefly control';
            prevention = 'Use resistant varieties, control whiteflies';
        }
    }

    return {
        disease,
        cause,
        organic,
        chemical,
        prevention
    };
};

module.exports = {
    getDiagnosis,

};
