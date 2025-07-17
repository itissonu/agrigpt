const express = require('express');
const router = express.Router();

const { register, login, logout } = require('../controllers/authController');

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);

module.exports = router;