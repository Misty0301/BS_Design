// services/emailService.js
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Gmail', // 可根据需要更换邮件服务提供商
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPriceAlertEmail = async (to, product, currentPrice, targetPrice) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `价格提醒：${product.name} 价格已降至 ${currentPrice}`,
    text: `您好，

商品 "${product.name}" 的价格已降至 ${currentPrice}，低于您设定的目标价格 ${targetPrice}。

商品链接：${product.url}

感谢您使用我们的服务！

祝好，
商品比价团队`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`价格提醒邮件已发送至 ${to}`);
  } catch (error) {
    console.error('发送价格提醒邮件失败:', error);
  }
};

module.exports = {
  sendPriceAlertEmail,
};
