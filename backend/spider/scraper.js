// scraper.js
const { fetchTaobaoProducts } = require('../services/priceFetcher');
const { Product, Alert, User } = require('../models');
const { sendPriceAlertEmail } = require('../services/emailService');

(async () => {
  try {
    const searchTerm = '手机'; // 示例搜索词
    const taobaoProducts = await fetchTaobaoProducts(searchTerm);

    for (const product of taobaoProducts) {
      // 插入或更新商品
      const [dbProduct, created] = await Product.findOrCreate({
        where: { external_id: product.external_id },
        defaults: {
          name: product.name,
          price: product.price,
          url: product.url,
          source: 'Taobao',
          category: searchTerm,
          image: product.image,
        },
      });

      if (!created) {
        // 更新价格和更新时间
        await dbProduct.update({
          price: product.price,
          updated_at: new Date(),
        });

        // 检查价格提醒
        const alerts = await Alert.findAll({ where: { product_id: dbProduct.id } });
        for (const alert of alerts) {
          if (dbProduct.price <= alert.target_price) {
            const user = await User.findByPk(alert.user_id);
            if (user) {
              await sendPriceAlertEmail(user.email, dbProduct, dbProduct.price, alert.target_price);
              // 可选：删除已触发的提醒
              await alert.destroy();
            }
          }
        }
      }
    }

    console.log('淘宝商品数据已更新');
  } catch (error) {
    console.error('抓取淘宝数据时出错:', error);
  }
})();
