const express = require("express");
const { getDiseases, getDiseaseById, getFilterOptions } = require("../controllers/diseaseController");
const router = express.Router();


router.get("/", getDiseases); 

router.get("/filters", getFilterOptions);

module.exports = router;
