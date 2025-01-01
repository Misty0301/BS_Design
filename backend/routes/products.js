// routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');

// 获取所有商品
router.get('/', productController.getAllProducts);

// 添加新商品（需要认证）
router.post('/', authMiddleware, productController.createProduct);

// 更新商品（需要认证）
router.put('/:id', authMiddleware, productController.updateProduct);

// 删除商品（需要认证）
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
