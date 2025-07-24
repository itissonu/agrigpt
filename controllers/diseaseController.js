const Disease = require("../models/Disese");

const getDiseases = async (req, res) => {
  try {
    const {
      search = "",
      crop,
      category,
      severity,
      state,
      season,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = {};



 if (search) {
  const searchWords = search.trim().split(/\s+/).map((word) => new RegExp(word, "i"));

  filters.$or = searchWords.flatMap((regex) => [
    { crop: { $regex: regex } },
    { disease_name: { $regex: regex } },
    { pathogen_name: { $regex: regex } },
    { disease_category: { $regex: regex } }, 
  ]);
}




    if (crop) filters.crop = crop;
    if (category) filters.disease_category = category;
    if (severity) filters.severity = severity;
    if (season) filters.season = season;
    if (state) filters.major_states = state;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [diseases, total] = await Promise.all([
      Disease.find(filters).skip(skip).limit(parseInt(limit)),
      Disease.countDocuments(filters),
    ]);

    res.json({
      data: diseases,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching diseases", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getDiseaseById = async (req, res) => {
  const param = req.params.id;

  try {
    let disease = null;

    
    if (mongoose.Types.ObjectId.isValid(param)) {
      disease = await Disease.findById(param);
    }

   
    if (!disease && !isNaN(param)) {
      disease = await Disease.findOne({ id: Number(param) });
    }

   
    if (!disease) {
      return res.status(404).json({ error: "Disease not found" });
    }


    res.json(disease);
  } catch (err) {
    console.error("Error fetching disease:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const [crops, categories, severities, states, seasons] = await Promise.all([
      Disease.distinct("crop"),
      Disease.distinct("disease_category"),
      Disease.distinct("severity"),
      Disease.distinct("major_states"),
      Disease.distinct("season"),
    ]);

    res.json({
      crops,
      categories,
      severities,
      states,
      seasons,
    });
  } catch (err) {
    console.error("Error fetching filter options", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getDiseases,
  getDiseaseById,
  getFilterOptions,
};