// index.js
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mysql = require('mysql2/promise');
const randomUseragent = require('random-useragent');
const readline = require('readline');

// 明确指定 .env 文件的路径
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 打印环境变量以验证是否加载成功（可选，生产环境下建议移除或注释掉）
console.log('JD_USERNAME:', process.env.JD_USERNAME);
// console.log('JD_PASSWORD:', process.env.JD_PASSWORD); // 出于安全考虑，建议不打印密码

// 使用 Stealth 插件以绕过反爬机制
puppeteer.use(StealthPlugin());

// MySQL 数据库配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
};

// 路径用于存储 Cookies
const cookiesPath = path.resolve(__dirname, 'cookies.json');

// 连接数据库
async function connectDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('已连接到 MySQL 数据库。');
        return connection;
    } catch (error) {
        console.error('连接 MySQL 失败:', error);
        process.exit(1);
    }
}

// 保存 Cookies 到文件
async function saveCookies(page) {
    try {
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log('Cookies 已保存。');
    } catch (error) {
        console.error('保存 Cookies 时出现错误:', error);
    }
}

// 加载 Cookies 从文件
async function loadCookies(page) {
    if (fs.existsSync(cookiesPath)) {
        try {
            const cookies = JSON.parse(fs.readFileSync(cookiesPath));
            await page.setCookie(...cookies);
            console.log('Cookies 已加载。');
        } catch (error) {
            console.error('无法解析 cookies.json，忽略并继续不加载 Cookies。');
        }
    } else {
        console.log('未找到 cookies.json，跳过加载。');
    }
}

// 创建 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 自动化登录京东账号
async function login(page) {
    console.log('开始登录过程...');
    const jdLoginUrl = 'https://passport.jd.com/new/login.aspx';
    await page.goto(jdLoginUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('已导航到登录页面。');

    // 切换到账号密码登录
    try {
        await page.waitForSelector('#login-method-rd', { timeout: 10000 });
        await page.click('#login-method-rd');
        console.log('已切换到账号密码登录。');
    } catch (error) {
        console.log('可能已经是账号密码登录页面，跳过切换步骤。');
    }

    // 确认环境变量已加载
    if (!process.env.JD_USERNAME || !process.env.JD_PASSWORD) {
        console.error('JD_USERNAME 或 JD_PASSWORD 未在 .env 文件中定义。');
        return false;
    }

    // 为了安全，建议不在日志中打印密码
    console.log('JD_USERNAME:', process.env.JD_USERNAME);
    // console.log('JD_PASSWORD:', process.env.JD_PASSWORD);

    // 输入用户名和密码
    try {
        await page.waitForSelector('#loginname', { timeout: 10000 });
        await page.type('#loginname', String(process.env.JD_USERNAME), { delay: 100 });
        await page.type('#nloginpwd', String(process.env.JD_PASSWORD), { delay: 100 });
        console.log('已输入用户名和密码。');

        // 点击登录按钮
        await page.click('#loginsubmit');
        console.log('已提交登录信息。');

        // 等待一段时间，确保验证码加载
        // await page.waitForTimeout(5000); // 等待5秒

        // 提示用户手动完成验证码验证
        console.log('请在浏览器中手动完成验证码验证，然后回到终端并按下回车键继续...');

        // 等待用户按下回车键
        await new Promise((resolve) => {
            rl.question('', () => {
                resolve();
            });
        });

        // 等待导航完成
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        console.log('已完成导航。');

        // 检查是否登录成功
        if (page.url().includes('myjd')) {
            console.log('登录成功。');
            await saveCookies(page); // 保存 Cookies
            return true;
        } else {
            console.log('登录可能失败，检查是否出现其他问题。');
            return false;
        }
    } catch (error) {
        console.error('登录过程中出现错误:', error);
        return false;
    }
}

// 爬取单个页面的数据
async function scrapePage(url) {
    console.log(`正在启动浏览器以访问 URL: ${url}`);
    const browser = await puppeteer.launch({
        headless: false, // 设置为 false 以便观察浏览器行为
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // '--proxy-server=http://your-proxy-server:port' // 如果使用代理，取消注释并替换
        ],
    });
    const page = await browser.newPage();

    try {
        // 加载 Cookies 以保持登录状态
        await loadCookies(page);

        // 设置视口和语言
        await page.setViewport({ width: 1366, height: 768 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        });

        // 设置随机 User-Agent
        const userAgent = randomUseragent.getRandom();
        if (userAgent) {
            await page.setUserAgent(userAgent);
            console.log(`使用 User-Agent: ${userAgent}`);
        } else {
            // 如果随机失败，使用默认 User-Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/90.0.4430.93 Safari/537.36');
        }

        console.log(`正在导航到 ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // 检查是否被重定向到登录页面
        if (page.url().includes('login')) {
            console.log('检测到需要登录，尝试自动登录。');
            const loggedIn = await login(page);
            if (!loggedIn) {
                console.error('登录失败，无法继续爬取。');
                await browser.close();
                return [];
            }
            // 登录成功后，重新导航到目标 URL
            console.log(`重新导航到 ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        }

        // 模拟滚动，加载动态内容
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // 模拟鼠标移动（可选）
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200);
        await page.mouse.move(300, 300);

        // 等待必要的内容加载完成
        console.log('正在等待选择器 .gl-i-wrap 或 .gl-item');
        await page.waitForSelector('.gl-i-wrap, .gl-item', { timeout: 20000 });
        console.log('已找到选择器 .gl-i-wrap 或 .gl-item');

        const content = await page.content();
        await browser.close();

        const $ = cheerio.load(content);
        const products = [];

        console.log('正在解析产品数据');
        $('.gl-i-wrap, .gl-item').each((index, element) => {
            try {
                const name = $(element).find('.p-name a em').text().trim();
                const priceText = $(element).find('.p-price strong i').text().trim();
                const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
                const ratingText = $(element).find('.p-commit strong').text().trim();
                const rating = parseFloat(ratingText) || 0;
                const reviewCountText = $(element).find('.p-commit a').text().trim();
                const reviewCount = parseInt(reviewCountText.replace(/[^0-9]/g, '')) || 0;
                let productUrl = $(element).find('.p-name a').attr('href');
                if (productUrl && !productUrl.startsWith('http')) {
                    productUrl = 'https:' + productUrl;
                }

                if (name && price && productUrl) { // 简单的验证
                    products.push({
                        product_name: name,
                        price: price,
                        rating: rating,
                        review_count: reviewCount,
                        product_url: productUrl,
                    });
                }
            } catch (error) {
                console.error('解析产品时出现错误:', error);
            }
        });

        console.log(`在页面上找到 ${products.length} 个产品`);
        return products;
    } catch (error) {
        console.error(`爬取页面 ${url} 时出现错误:`, error);
        await browser.close();
        return [];
    }
}

// 插入数据到数据库
async function insertProducts(connection, products) {
    const sql = `
        INSERT INTO jd_products 
        (sku_id, product_name, price, promo_price, shop_name, comment_count) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const product of products) {
        try {
            await connection.execute(sql, [
                product.sku_id,         // 确保你的产品对象包含 sku_id
                product.product_name,
                product.price,
                product.promo_price || null,  // 如果 promo_price 可能为空
                product.shop_name || null,    // 如果 shop_name 可能为空
                product.comment_count || null // 如果 comment_count 可能为空
            ]);
            console.log(`已插入: ${product.product_name}`);
        } catch (error) {
            console.error('插入产品时出现错误:', error);
        }
    }
}

// 增加重试机制
async function scrapePageWithRetry(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await scrapePage(url);
        } catch (error) {
            console.error(`第 ${attempt} 次尝试失败: ${error}`);
            if (attempt === retries) {
                console.error(`所有 ${retries} 次尝试均失败，URL: ${url}`);
                return [];
            }
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// 主函数
async function main() {
    const connection = await connectDB();

    // 定义要爬取的关键字和页面数量
    const keyword = encodeURIComponent('手机');
    const totalPages = 4; // 例如爬取前4页

    for (let page = 1; page <= totalPages; page++) {
        // 京东的分页 URL 需要调整
        const jdPage = page * 2 - 1;
        const url = `https://search.jd.com/Search?keyword=${keyword}&enc=utf-8&page=${jdPage}`;
        console.log(`正在爬取第 ${page} 页: ${url}`);

        try {
            const products = await scrapePageWithRetry(url);
            console.log(`正在插入第 ${page} 页的 ${products.length} 个产品`);
            await insertProducts(connection, products);
        } catch (error) {
            console.error(`爬取第 ${page} 页时出现错误:`, error);
        }

        // 随机等待，避免被封 IP
        const waitTime = Math.floor(Math.random() * 2000) + 1000; // 1-3 秒
        console.log(`等待 ${waitTime} 毫秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    await connection.end();
    console.log('爬取完成，数据库连接已关闭。');
}

// 处理未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('未捕获的 Promise 拒绝:', promise, '原因:', reason);
    // 你可以选择在这里退出进程或采取其他措施
});

main();
