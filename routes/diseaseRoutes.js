const express = require("express");
const { getDiseases, getDiseaseById, getFilterOptions } = require("../controllers/diseaseController");
const router = express.Router();


router.get("/", getDiseases); // list + filters
// router.get("/:id", getDiseaseById); // detail
router.get("/filters", getFilterOptions);

module.exports = router;
