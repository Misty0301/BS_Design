// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// 收藏商品
router.post('/favorites', authMiddleware, userController.addFavorite);
router.get('/favorites', authMiddleware, userController.getFavorites);
router.delete('/favorites/:productId', authMiddleware, userController.removeFavorite);

// 价格提醒
router.post('/alerts', authMiddleware, userController.addAlert);
router.get('/alerts', authMiddleware, userController.getAlerts);
router.delete('/alerts/:alertId', authMiddleware, userController.removeAlert);

module.exports = router;
