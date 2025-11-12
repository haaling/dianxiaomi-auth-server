/**
 * Chrome插件认证客户端示例
 * 用于与点小蜜认证服务器集成
 */

class AuthClient {
  constructor(apiBaseUrl = 'http://localhost:3000/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.token = null;
    this.deviceId = null;
  }

  /**
   * 初始化客户端
   */
  async init() {
    // 从存储中恢复token和deviceId
    const data = await chrome.storage.local.get(['token', 'deviceId']);
    this.token = data.token;
    
    // 如果没有deviceId，生成一个
    if (!data.deviceId) {
      this.deviceId = crypto.randomUUID();
      await chrome.storage.local.set({ deviceId: this.deviceId });
    } else {
      this.deviceId = data.deviceId;
    }
  }

  /**
   * 发起API请求
   */
  async request(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 如果有token，添加到请求头
    if (this.token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }

    return data;
  }

  /**
   * 用户注册
   */
  async register(username, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ username, email, password })
    });

    // 保存token
    this.token = data.data.token;
    await chrome.storage.local.set({ 
      token: this.token,
      user: data.data.user 
    });

    return data;
  }

  /**
   * 用户登录
   */
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password })
    });

    // 保存token和用户信息
    this.token = data.data.token;
    await chrome.storage.local.set({ 
      token: this.token,
      user: data.data.user,
      subscription: data.data.subscription
    });

    return data;
  }

  /**
   * 注册当前设备
   */
  async registerDevice() {
    const deviceInfo = {
      browser: 'Chrome',
      os: navigator.platform,
      userAgent: navigator.userAgent
    };

    const data = await this.request('/device/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: this.deviceId,
        deviceName: `Chrome on ${navigator.platform}`,
        deviceInfo
      })
    });

    return data;
  }

  /**
   * 验证当前设备和订阅状态
   */
  async verify() {
    try {
      const data = await this.request('/device/verify', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: this.deviceId
        })
      });

      // 更新订阅信息
      await chrome.storage.local.set({ 
        subscription: data.data.subscription 
      });

      return {
        valid: true,
        data: data.data
      };
    } catch (error) {
      console.error('验证失败:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 获取订阅状态
   */
  async getSubscriptionStatus() {
    const data = await this.request('/subscription/status', {
      method: 'GET'
    });

    return data.data;
  }

  /**
   * 获取设备列表
   */
  async getDevices() {
    const data = await this.request('/device/list', {
      method: 'GET'
    });

    return data.data;
  }

  /**
   * 移除设备
   */
  async removeDevice(deviceId) {
    const data = await this.request(`/device/${deviceId}`, {
      method: 'DELETE'
    });

    return data;
  }

  /**
   * 创建订阅
   */
  async subscribe(plan, duration = 1) {
    const data = await this.request('/subscription/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan, duration })
    });

    // 更新订阅信息
    await chrome.storage.local.set({ 
      subscription: data.data 
    });

    return data;
  }

  /**
   * 登出
   */
  async logout() {
    this.token = null;
    await chrome.storage.local.remove(['token', 'user', 'subscription']);
  }

  /**
   * 检查是否已登录
   */
  async isLoggedIn() {
    if (!this.token) {
      const data = await chrome.storage.local.get('token');
      this.token = data.token;
    }
    return !!this.token;
  }
}

// 使用示例
(async () => {
  const authClient = new AuthClient('http://localhost:3000/api');
  await authClient.init();

  // 示例：登录流程
  async function loginFlow() {
    try {
      // 1. 登录
      const loginResult = await authClient.login('test@example.com', 'password123');
      console.log('登录成功:', loginResult);

      // 2. 注册设备
      const deviceResult = await authClient.registerDevice();
      console.log('设备注册成功:', deviceResult);

      // 3. 验证权限
      const verifyResult = await authClient.verify();
      if (verifyResult.valid) {
        console.log('权限验证成功，可以使用插件功能');
        console.log('订阅信息:', verifyResult.data.subscription);
      } else {
        console.error('权限验证失败:', verifyResult.error);
      }
    } catch (error) {
      console.error('登录流程失败:', error);
    }
  }

  // 示例：在插件启动时验证权限
  async function checkPermissionOnStartup() {
    const isLoggedIn = await authClient.isLoggedIn();
    
    if (!isLoggedIn) {
      console.log('未登录，请先登录');
      // 显示登录界面
      return false;
    }

    const result = await authClient.verify();
    
    if (result.valid) {
      console.log('权限有效');
      
      // 检查订阅状态
      const subscription = result.data.subscription;
      if (!subscription.isValid) {
        console.warn('订阅已过期');
        // 提示用户续费
        return false;
      }
      
      return true;
    } else {
      if (result.error.includes('设备未注册')) {
        // 尝试注册设备
        try {
          await authClient.registerDevice();
          console.log('设备注册成功');
          return true;
        } catch (error) {
          if (error.message.includes('最大设备数量')) {
            console.error('设备数量已达上限');
            // 显示设备管理界面
          }
        }
      }
      return false;
    }
  }

  // 示例：定期验证（每30分钟）
  function startPeriodicVerification() {
    setInterval(async () => {
      const result = await authClient.verify();
      if (!result.valid) {
        console.warn('权限验证失败，可能需要重新登录');
        // 禁用插件功能或提示用户
      }
    }, 30 * 60 * 1000); // 30分钟
  }

  // 导出供其他脚本使用
  if (typeof window !== 'undefined') {
    window.AuthClient = authClient;
  }
})();
