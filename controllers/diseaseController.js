const { DiseaseModel } = require("../models/Disese");


exports.createDisease = async (req, res) => {
  try {
    const newDisease = await DiseaseModel.create(req.body);
    res.status(201).json(newDisease);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllDiseases = async (req, res) => {
  try {
    const diseases = await DiseaseModel.find();
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
