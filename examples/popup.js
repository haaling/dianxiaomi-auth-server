/**
 * Popup界面逻辑
 */

let authClient;

document.addEventListener('DOMContentLoaded', async () => {
  // 初始化认证客户端
  authClient = new AuthClient('http://localhost:3000/api');
  await authClient.init();
  
  // 检查登录状态
  await checkLoginStatus();
  
  // 绑定事件
  bindEvents();
});

/**
 * 绑定所有事件
 */
function bindEvents() {
  // 标签页切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // 登录
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  
  // 注册
  document.getElementById('registerBtn').addEventListener('click', handleRegister);
  
  // 退出
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  
  // 回车登录
  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

/**
 * 切换标签页
 */
function switchTab(tabName) {
  // 更新标签按钮状态
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });
  
  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const contentId = tabName + 'Tab';
  const content = document.getElementById(contentId);
  if (content) {
    content.classList.add('active');
  }
}

/**
 * 检查登录状态
 */
async function checkLoginStatus() {
  const isLoggedIn = await authClient.isLoggedIn();
  
  if (isLoggedIn) {
    // 验证token是否有效
    const result = await authClient.verify();
    
    if (result.valid) {
      showLoggedInView();
      await loadUserData();
      return;
    }
  }
  
  showLoginView();
}

/**
 * 显示登录视图
 */
function showLoginView() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('loggedInView').classList.add('hidden');
}

/**
 * 显示已登录视图
 */
function showLoggedInView() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('loggedInView').classList.remove('hidden');
}

/**
 * 处理登录
 */
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showMessage('请填写邮箱和密码', 'error');
    return;
  }
  
  try {
    setLoading('loginBtn', true);
    const result = await authClient.login(email, password);
    
    // 注册设备
    await authClient.registerDevice();
    
    showMessage('登录成功！', 'success');
    showLoggedInView();
    await loadUserData();
  } catch (error) {
    showMessage('登录失败: ' + error.message, 'error');
  } finally {
    setLoading('loginBtn', false);
  }
}

/**
 * 处理注册
 */
async function handleRegister() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  
  if (!username || !email || !password) {
    showMessage('请填写所有字段', 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('密码至少需要6个字符', 'error');
    return;
  }
  
  try {
    setLoading('registerBtn', true);
    await authClient.register(username, email, password);
    
    // 注册设备
    await authClient.registerDevice();
    
    showMessage('注册成功！', 'success');
    showLoggedInView();
    await loadUserData();
  } catch (error) {
    showMessage('注册失败: ' + error.message, 'error');
  } finally {
    setLoading('registerBtn', false);
  }
}

/**
 * 处理退出
 */
async function handleLogout() {
  await authClient.logout();
  showMessage('已退出登录', 'info');
  showLoginView();
}

/**
 * 加载用户数据
 */
async function loadUserData() {
  try {
    // 获取用户信息
    const userData = await chrome.storage.local.get(['user', 'subscription']);
    
    // 显示用户信息
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = `
      <strong>${userData.user.username}</strong><br>
      ${userData.user.email}
    `;
    
    // 获取最新订阅状态
    const subscriptionStatus = await authClient.getSubscriptionStatus();
    
    // 显示订阅信息
    const subscriptionInfo = document.getElementById('subscriptionInfo');
    if (subscriptionStatus.isValid) {
      const daysRemaining = subscriptionStatus.daysRemaining || 0;
      subscriptionInfo.innerHTML = `
        订阅: ${getPlanName(subscriptionStatus.plan)} | 剩余 ${daysRemaining} 天
      `;
    } else {
      subscriptionInfo.innerHTML = '订阅已过期';
    }
    
    // 加载设备列表
    await loadDevices();
    
    // 显示详细订阅信息
    displaySubscriptionDetails(subscriptionStatus);
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
}

/**
 * 加载设备列表
 */
async function loadDevices() {
  try {
    const result = await authClient.getDevices();
    const deviceList = document.getElementById('deviceList');
    
    if (result.devices.length === 0) {
      deviceList.innerHTML = '<p style="color: #666;">暂无设备</p>';
      return;
    }
    
    deviceList.innerHTML = result.devices.map(device => {
      const isCurrentDevice = device.deviceId === authClient.deviceId;
      const lastActive = new Date(device.lastActiveAt).toLocaleString('zh-CN');
      
      return `
        <div class="device-item">
          <div class="device-info">
            <div class="device-name">
              ${device.deviceName}
              ${isCurrentDevice ? '<span style="color: #28a745;">(当前设备)</span>' : ''}
            </div>
            <div class="device-status">
              最后活跃: ${lastActive}
              ${device.isActive ? '' : ' - <span style="color: #dc3545;">已下线</span>'}
            </div>
          </div>
          ${!isCurrentDevice && device.isActive ? `
            <button class="btn-small btn-danger" onclick="removeDevice('${device.deviceId}')">
              移除
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
    
    // 显示设备统计
    const statsHtml = `
      <p style="margin-top: 10px; font-size: 12px; color: #666;">
        已使用 ${result.active} / ${result.total} 台设备
      </p>
    `;
    deviceList.insertAdjacentHTML('beforeend', statsHtml);
  } catch (error) {
    console.error('加载设备列表失败:', error);
  }
}

/**
 * 移除设备
 */
async function removeDevice(deviceId) {
  if (!confirm('确定要移除此设备吗？')) {
    return;
  }
  
  try {
    await authClient.removeDevice(deviceId);
    showMessage('设备已移除', 'success');
    await loadDevices();
  } catch (error) {
    showMessage('移除失败: ' + error.message, 'error');
  }
}

/**
 * 显示订阅详情
 */
function displaySubscriptionDetails(subscription) {
  const detailsDiv = document.getElementById('subscriptionDetails');
  
  if (!subscription.hasSubscription) {
    detailsDiv.innerHTML = '<p>暂无订阅</p>';
    return;
  }
  
  const endDate = new Date(subscription.endDate).toLocaleDateString('zh-CN');
  
  detailsDiv.innerHTML = `
    <div style="padding: 15px; background: #f8f9fa; border-radius: 4px;">
      <h3 style="margin-top: 0;">当前订阅</h3>
      <p><strong>计划:</strong> ${getPlanName(subscription.plan)}</p>
      <p><strong>状态:</strong> ${subscription.isValid ? 
        '<span style="color: #28a745;">有效</span>' : 
        '<span style="color: #dc3545;">已过期</span>'}</p>
      <p><strong>到期日期:</strong> ${endDate}</p>
      <p><strong>剩余天数:</strong> ${subscription.daysRemaining || 0} 天</p>
    </div>
    
    ${!subscription.isValid ? `
      <button style="margin-top: 10px; width: 100%;" onclick="renewSubscription()">
        续费订阅
      </button>
    ` : ''}
  `;
}

/**
 * 续费订阅（示例）
 */
async function renewSubscription() {
  // 这里应该跳转到支付页面
  alert('请联系管理员续费订阅');
}

/**
 * 获取计划名称
 */
function getPlanName(plan) {
  const names = {
    free: '免费版',
    basic: '基础版',
    premium: '高级版',
    enterprise: '企业版'
  };
  return names[plan] || plan;
}

/**
 * 显示消息
 */
function showMessage(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
  
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 3000);
}

/**
 * 设置加载状态
 */
function setLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  button.disabled = loading;
  button.textContent = loading ? '处理中...' : button.textContent;
}

// 导出函数供HTML调用
window.removeDevice = removeDevice;
window.renewSubscription = renewSubscription;
