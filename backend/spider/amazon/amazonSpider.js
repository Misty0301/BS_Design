// services/amazonSpider.js

const axios = require('axios');
const cheerio = require('cheerio');
const { Product } = require('../../models'); // 导入Product模型

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


class Item {
    constructor(item_id, item_name, price, platform, link) {
        this.item_id = item_id; // ASIN
        this.item_name = item_name;
        this.price = price;
        this.platform = platform;
        this.link = link;
    }
}

class AmazonSpider {
    constructor() {
        this.baseUrl = "https://www.amazon.com/s?language=zh_CN&currency=CNY&k=";
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cookie': 'session-id=xxx; session-id-time=xxx;' // 替换为实际 cookie
        };
        
    }

    /**
     * 获取亚马逊搜索结果
     * @param {string} query - 搜索关键词
     * @param {number} pages - 要抓取的页数
     * @returns {Promise<Item[]>} - 返回包含商品信息的数组
     */
    async getAmazonSpider(query , pages = 1) {
        const items = [];
        for (let page = 1; page <= pages; page++) {
            const searchUrl = `${this.baseUrl}${encodeURIComponent(query)}&page=${page}`;
            try {
                // 发送HTTP GET请求获取页面内容
                const response = await axios.get(searchUrl, { headers: this.headers });
                const html = response.data;

                // 使用cheerio加载HTML
                const $ = cheerio.load(html);
                const currentTime = new Date();

                // 选择所有搜索结果的元素
                $('[data-component-type="s-search-result"]').each((index, element) => {
                    const item_id = $(element).attr('data-asin') || 'unknown';

                    const nameElement = $(element).find('.a-size-medium.a-color-base.a-text-normal').first();
                    const name = nameElement.text().trim() || 'unknown';

                    const priceWhole = $(element).find('.a-price-whole').first().text().replace(/,/g, '').trim();
                    const priceFraction = $(element).find('.a-price-fraction').first().text().trim();
                    const currency = $(element).find('.a-price-symbol').first().text().trim();

                    // 检查是否所有必要的信息都已获取
                    if (!name || !priceWhole || !priceFraction || !currency || !item_id) {
                        return; // 跳过此商品
                    }

                    // 计算价格
                    let price = parseFloat(priceWhole + '.' + priceFraction);
                    if (currency === 'US$') {
                        price *= 7.1023; // 汇率转换（假设1 USD = 7.1023 CNY）
                    }
                    price = Math.round(price * 100) / 100; // 保留两位小数

                    // 构建商品链接
                    const link = `https://www.amazon.com/dp/${item_id}`;

                    // 创建Item对象并添加到结果数组
                    const item = new Item(
                        item_id,
                        name,
                        price,
                        '亚马逊',
                        link
                    );
                    items.push(item);
                });

                console.log(`抓取关键词 "${query}" 第 ${page} 页，抓取到的商品数量: ${items.length}`);
            } catch (error) {
                console.error(`从亚马逊抓取第 ${page} 页数据时出错: ${error.message}`);
            }
            
            if (page < pages) {
                const delayMs = Math.random() * 1000 + 1000 ; // 随机延迟 1-2 秒
                console.log(`延迟 ${Math.round(delayMs)} 毫秒后抓取下一页`);
                await delay(delayMs);
            }

        }

        return items;
    }

    /**
     * 将抓取到的商品保存到数据库
     * @param {Item[]} items - 商品数组
     */
    async saveItemsToDB(items) {
        for (const item of items) {
            try {
                // 检查商品是否已存在（根据link或product_name）
                const existingProduct = await Product.findOne({ where: { link: item.link } });
                if (existingProduct) {
                    // 更新商品信息
                    await existingProduct.update({
                        product_name: item.item_name,
                        source_platform: item.platform,
                        price: item.price,
                        // link 不需要更新，因为它是唯一标识
                    });
                    console.log(`更新商品: ${item.item_name}`);
                } else {
                    // 创建新商品
                    await Product.create({
                        product_name: item.item_name,
                        source_platform: item.platform,
                        price: item.price,
                        link: item.link,
                    });
                    console.log(`创建商品: ${item.item_name}`);
                }
            } catch (error) {
                console.error(`保存商品 "${item.item_name}" 时出错: ${error.message}`);
            }
        }
    }

    /**
     * 执行爬虫任务：抓取并保存商品
     * @param {string} query - 搜索关键词
     * @param {number} pages - 要抓取的页数
     */
    async run(query, pages = 1) {
        console.log(`开始抓取关键词 "${query}" 的商品，抓取页数: ${pages}`);
        const items = await this.getAmazonSpider(query, pages);
        if (items.length > 0) {
            await this.saveItemsToDB(items);
            console.log(`完成抓取关键词 "${query}" 的商品，共处理 ${items.length} 条记录`);
        } else {
            logger.warn(`未抓取到任何商品信息。关键词: "${query}"`);
        }
    }
}

module.exports = AmazonSpider;
