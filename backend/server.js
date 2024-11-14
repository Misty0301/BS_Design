// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt'); // 用于密码哈希
const bodyParser = require('body-parser');
const cors = require('cors'); // 处理跨域请求
const AmazonSpider = require('./spider/amazon/amazonSpider');
const amazonSpider = new AmazonSpider();

require('dotenv').config();
// const config = require('./config/config.js'); // 暂时注释掉，确保不会干扰

const app = express();
const PORT = process.env.PORT || 5000;
// 使用中间件
app.use(bodyParser.json());
app.use(cors({
  origin: '*', // 根据需要调整前端地址
  methods: 'GET,POST,PUT,DELETE',
  credentials: true
}));

// 数据库连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456', // 请替换为您的 MySQL 密码
  database: 'jd_data',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    console.log('成功连接到数据库');
    connection.release();
  })
  .catch(err => {
    console.error('数据库连接失败：', err.message);
  });

/**
 * 将商品信息插入/更新到数据库
 */
async function saveProduct(data) {
  const sql = `
    INSERT INTO products (product_name, source_platform, price, link, created_at, updated_at)
    VALUES (?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      product_name = VALUES(product_name),
      source_platform = VALUES(source_platform),
      price = VALUES(price),
      link = VALUES(link),
      updated_at = NOW()
  `;

  const [result] = await pool.query(sql, [
    data.product_name,
    data.source_platform,
    data.price,
    data.link
  ]);

  return result;
}


/**
 * 从商品页面解析所需信息（示例，仅适用于简单场景）
 * 注意：京东很多信息是通过 JS 动态加载，可能需要进一步分析
 */
async function parseProductDetail(productUrl) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    };
    const response = await axios.get(productUrl, { headers, timeout: 10000 });
    const html = response.data;
    const $ = cheerio.load(html);

    const product_name = $('div.sku-name').text().trim() || 'Unknown Product';
    const source_platform = 'JD'; // 示例：可以通过传参或解析确定平台
    const price = parseFloat($('#price .price').text().replace('¥', '').trim()) || 0.0;
    const link = productUrl;

    const productData = {
      product_name,
      source_platform,
      price,
      link
    };

    return productData;
  } catch (error) {
    console.error('爬取或解析出现错误：', error.message);
    return null;
  }
}

/**
 * 对外提供接口：?url=https://item.jd.com/100016521224.html
 * 1. 爬取商品页面
 * 2. 解析数据
 * 3. 入库
 */
app.get('/crawl', async (req, res) => {
  const { url } = req.query;
  console.log('收到 /crawl 请求，url:', url);

  if (!url) {
    console.log('未提供商品链接');
    return res.status(400).json({ error: '请提供商品链接，如 /crawl?url=...' });
  }

  const productData = await parseProductDetail(url);
  if (!productData) {
    console.log('爬取或解析失败');
    return res.status(500).json({ error: '爬取或解析失败' });
  }

  try {
    await saveProduct(productData);
    console.log('商品信息保存成功', productData);
    res.json({
      message: '商品信息爬取并保存成功',
      data: productData
    });
  } catch (dbErr) {
    console.error('数据库操作失败：', dbErr.message);
    res.status(500).json({ error: '数据库操作失败', details: dbErr.message });
  }
});

app.post('/crawl/:keyword', async (req, res) => {
  const { keyword, pages } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: '关键词不能为空' });
  }

  if (!pages || isNaN(pages) || pages <= 0) {
    return res.status(400).json({ error: '页数必须是正整数' });
  }

  try {
    console.log(`开始爬取关键词 "${keyword}"，共 ${pages} 页的商品信息`);

    // 调用爬虫方法，获取商品信息
    const items = await amazonSpider.getAmazonSpider(keyword, pages);

    if (items.length === 0) {
      return res.status(404).json({ message: `未找到关键词 "${keyword}" 的商品` });
    }

    // 保存商品信息到数据库
    for (const item of items) {
      const productData = {
        product_name: item.item_name,
        source_platform: item.platform,
        price: item.price,
        link: item.link
      };

      await saveProduct(productData); // 使用之前定义的 saveProduct 方法
    }

    res.json({
      message: `成功爬取关键词 "${keyword}" 的商品信息`,
      data: items
    });
  } catch (error) {
    console.error('爬取失败:', error.message);
    res.status(500).json({ error: '爬取失败，请稍后再试', details: error.message });
  }
});

/**
 * 根路由
 */
app.get('/', (req, res) => {
  console.log('收到根路由请求');
  res.send('后端服务器运行正常');
});

/**
 * 注册路由
 */
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // 简单的输入验证
  if (!username || !email || !password) {
    return res.status(400).json({ error: '请提供用户名、邮箱和密码' });
  }

  try {
    // 检查用户是否已存在
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }
    
    // 检查用户名是否已存在
    const [rows2] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows2.length > 0) {
      return res.status(400).json({ error: '该用户名已被使用' });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用户
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: '注册成功', userId: result.insertId });
  } catch (error) {
    console.error('注册错误：', error);
    res.status(500).json({ error: '注册失败，请稍后再试' });
  }
});

// ========== 登录路由 ==========
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`收到登录请求，邮箱：${email}`);

  // 检查字段
  if (!email || !password) {
    return res.status(400).json({ error: '请提供邮箱和密码' });
  }

  try {
    // 1. 根据邮箱查找用户
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.log('该邮箱未注册');
      return res.status(400).json({ error: '该邮箱未注册' });
    }

    const user = rows[0];
    // 2. 比较密码
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('密码不正确');
      return res.status(400).json({ error: '邮箱或密码不正确' });
    }

    console.log(`用户登录成功，用户ID: ${user.id}`);
    // 返回成功消息和可选 Token
    return res.json({
      message: '登录成功',
      userId: user.id,
      username: user.username,
      // token
    });
  } catch (error) {
    console.error('登录错误：', error);
    return res.status(500).json({ error: '登录失败，请稍后再试' });
  }
});

app.get('/api/search', async (req, res) => {
  const { keyword } = req.params;
  if (!keyword) {
    // 若无关键词，则返回空数组或全部商品
    // return res.json([]);
    return res.json({ products: [] });
  }

  try {
    const sql = `
      SELECT * FROM products
      WHERE product_name LIKE ?
      ORDER BY id DESC
    `;
    const [rows] = await pool.query(sql, [`%${keyword}%`]);

    res.json({ products: rows });
  } catch (error) {
    console.error('搜索出错:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const sql = 'SELECT * FROM products ORDER BY id DESC';
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error('获取所有产品失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sql = 'SELECT * FROM products WHERE id = ?';
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '产品不存在' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('获取产品失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/crawl', async (req, res) => {
  const { query, pages } = req.body; // 从请求中获取关键词和页数
  if (!query || !pages) {
    return res.status(400).json({ error: '请提供查询关键词和页数' });
  }

  try {
    console.log(`开始爬取亚马逊数据，关键词: "${query}", 页数: ${pages}`);
    await amazonspider.run(query, pages);
    res.json({ message: `爬取完成: "${query}"，页数: ${pages}` });
  } catch (error) {
    console.error('爬取失败:', error);
    res.status(500).json({ error: '爬取失败，请稍后再试' });
  }
});


app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
