// controllers/productController.js
const { Product } = require('../models');
const { getCache, setCache } = require('../services/cache');

exports.getAllProducts = async (req, res) => {
  try {
    const cachedProducts = await getCache('all_products');
    if (cachedProducts) {
      return res.json(JSON.parse(cachedProducts));
    }

    const products = await Product.findAll();
    await setCache('all_products', JSON.stringify(products), 600); // 缓存10分钟
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: '服务器错误', error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  const { name, price, url, source, category, image, external_id } = req.body;
  try {
    const product = await Product.create({ name, price, url, source, category, image, external_id });
    res.status(201).json({ message: '商品创建成功', product });
  } catch (err) {
    res.status(400).json({ message: '创建商品失败', error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, url, source, category, image } = req.body;
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: '商品未找到' });
    }

    await product.update({ name, price, url, source, category, image });
    res.json({ message: '商品更新成功', product });
  } catch (err) {
    res.status(400).json({ message: '更新商品失败', error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: '商品未找到' });
    }

    await product.destroy();
    res.json({ message: '商品删除成功' });
  } catch (err) {
    res.status(500).json({ message: '删除商品失败', error: err.message });
  }
};
