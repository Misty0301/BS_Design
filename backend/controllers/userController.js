// controllers/userController.js
const { Favorite, Product, Alert, User } = require('../models');
const { sendPriceAlertEmail } = require('../services/emailService');

exports.addFavorite = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  try {
    // 检查商品是否存在
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: '商品未找到' });
    }

    // 创建收藏记录
    const [favorite, created] = await Favorite.findOrCreate({
      where: { user_id: userId, product_id: productId },
    });

    if (!created) {
      return res.status(400).json({ message: '商品已收藏' });
    }

    res.status(201).json({ message: '商品已收藏', favorite });
  } catch (error) {
    res.status(500).json({ message: '添加收藏失败', error: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  const userId = req.user.id;

  try {
    const favorites = await Favorite.findAll({
      where: { user_id: userId },
      include: [{
        model: Product,
        as: 'Product',
      }],
    });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: '获取收藏失败', error: error.message });
  }
};

exports.removeFavorite = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  try {
    const favorite = await Favorite.findOne({
      where: { user_id: userId, product_id: productId },
    });

    if (!favorite) {
      return res.status(404).json({ message: '收藏记录未找到' });
    }

    await favorite.destroy();
    res.json({ message: '已取消收藏' });
  } catch (error) {
    res.status(500).json({ message: '取消收藏失败', error: error.message });
  }
};

// 价格提醒相关逻辑

exports.addAlert = async (req, res) => {
  const userId = req.user.id;
  const { productId, targetPrice } = req.body;

  try {
    // 检查商品是否存在
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: '商品未找到' });
    }

    // 创建价格提醒记录
    const alert = await Alert.create({ user_id: userId, product_id: productId, target_price: targetPrice });

    res.status(201).json({ message: '价格提醒已创建', alert });
  } catch (error) {
    res.status(500).json({ message: '添加价格提醒失败', error: error.message });
  }
};

exports.getAlerts = async (req, res) => {
  const userId = req.user.id;

  try {
    const alerts = await Alert.findAll({
      where: { user_id: userId },
      include: [{
        model: Product,
        as: 'Product',
      }],
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: '获取价格提醒失败', error: error.message });
  }
};

exports.removeAlert = async (req, res) => {
  const userId = req.user.id;
  const { alertId } = req.params;

  try {
    const alert = await Alert.findOne({
      where: { id: alertId, user_id: userId },
    });

    if (!alert) {
      return res.status(404).json({ message: '价格提醒未找到' });
    }

    await alert.destroy();
    res.json({ message: '已取消价格提醒' });
  } catch (error) {
    res.status(500).json({ message: '取消价格提醒失败', error: error.message });
  }
};
