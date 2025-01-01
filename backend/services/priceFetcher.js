// services/priceFetcher.js
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const fetchTaobaoProducts = async (searchTerm) => {
  const browser = await puppeteer.launch({
    headless: true, // 设置为 false 可见浏览器操作
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 设置用户代理，模拟真实用户
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/89.0.4389.82 Safari/537.36');

  // 设置视窗大小
  await page.setViewport({ width: 1366, height: 768 });

  // 如果使用代理
  if (process.env.PROXY_SERVER) {
    await page.authenticate({
      username: process.env.PROXY_USERNAME || '',
      password: process.env.PROXY_PASSWORD || '',
    });
  }

  try {
    const searchUrl = `https://s.taobao.com/search?q=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // 等待商品列表加载完成，可以根据具体情况调整选择器
    await page.waitForSelector('.m-itemlist .items .item', { timeout: 10000 });

    // 获取页面内容
    const content = await page.content();

    // 使用 Cheerio 解析 HTML
    const $ = cheerio.load(content);

    // 提取商品数据
    const products = [];
    $('.m-itemlist .items .item').each((index, element) => {
      const title = $(element).find('.title').text().trim();
      const price = $(element).find('.price').text().trim();
      const deal = $(element).find('.deal-cnt').text().trim();
      const shop = $(element).find('.shop').text().trim();
      const location = $(element).find('.location').text().trim();
      const link = $(element).find('.pic-link').attr('href');
      const image = $(element).find('.pic img').attr('src') || $(element).find('.pic img').attr('data-src');

      // 处理相对链接
      const productUrl = link.startsWith('http') ? link : `https:${link}`;

      // 提取商品ID（假设链接中包含 id 参数）
      const urlParams = new URL(productUrl).searchParams;
      const externalId = urlParams.get('id') || '';

      products.push({
        name: title,
        price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
        url: productUrl,
        source: 'Taobao',
        category: searchTerm,
        image: image.startsWith('http') ? image : `https:${image}`,
        external_id: externalId,
      });
    });

    console.log(`抓取到 ${products.length} 个淘宝商品`);

    await browser.close();
    return products;
  } catch (error) {
    console.error('抓取淘宝数据时出错:', error);
    await browser.close();
    throw error;
  }
};

module.exports = {
  fetchTaobaoProducts,
};
