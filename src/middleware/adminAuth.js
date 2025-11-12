/**
 * 管理员 API Key 认证中间件
 * 用于保护只有管理员才能访问的接口（如创建用户账号）
 */

const adminAuth = (req, res, next) => {
  try {
    // 从请求头获取 API Key
    const apiKey = req.headers['x-admin-api-key'];
    
    // 检查是否提供了 API Key
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: '缺少管理员 API Key'
      });
    }
    
    // 从环境变量获取正确的 API Key
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    // 检查环境变量是否配置
    if (!adminApiKey) {
      console.error('警告: 未配置 ADMIN_API_KEY 环境变量');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }
    
    // 验证 API Key
    if (apiKey !== adminApiKey) {
      console.warn('管理员 API Key 验证失败:', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
      
      return res.status(403).json({
        success: false,
        message: 'API Key 无效'
      });
    }
    
    // 验证通过，继续处理请求
    next();
  } catch (error) {
    console.error('管理员认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '认证过程出错'
    });
  }
};

module.exports = adminAuth;
