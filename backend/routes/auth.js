// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

// 注册
router.post('/register', [
  body('username')
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 3, max: 50 }).withMessage('用户名长度应在3到50个字符之间'),
  body('email')
    .isEmail().withMessage('无效的邮箱'),
  body('password')
    .isLength({ min: 6 }).withMessage('密码至少6位'),
], authController.register);

// 登录
router.post('/login', [
  body('email')
    .isEmail().withMessage('无效的邮箱'),
  body('password')
    .notEmpty().withMessage('密码不能为空'),
], authController.login);

module.exports = router;
