/*
飞书表格同步 API + 前端页面
*/

const FEISHU_APP_ID = 'cli_a92507a7db7c5bd1';
const FEISHU_APP_SECRET = 'LG8lGSoyNUjoHX5x0oTE5enaFCWX7oCs';
const FEISHU_SPREADSHEET_ID = 'PO8hsFebahujj6tLCXKc8YXYnZe';

// Token 缓存
let cachedToken = null;
let tokenExpiry = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// 获取飞书 access_token（带缓存）
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('飞书认证失败: ' + text);
  }
  
  if (data.error) {
    throw new Error('飞书认证错误: ' + JSON.stringify(data));
  }
  
  cachedToken = data.tenant_access_token;
  tokenExpiry = Date.now() + 2 * 60 * 60 * 1000;
  
  return cachedToken;
}

// 格式化数据
function formatData(rows) {
  if (!rows || rows.length < 2) return [];
  
  const headers = rows[0].map(h => h.toString().trim());
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    
    const item = {
      id: i,
      platform: getValue(row, headers, ['平台', 'platform']) || '视频号',
      name: getValue(row, headers, ['达人名称', 'name', '名称', 'Handle', '帐号']) || '',
      wechat: getValue(row, headers, ['微信', 'wechat', 'WeChat']) || '',
      categories: getCategories(row, headers),
      status: getStatus(row, headers),
      createdAt: getValue(row, headers, ['创建时间', '创建日期', '新增时间']) || ''
    };
    
    if (item.name) data.push(item);
  }
  return data;
}

function getValue(row, headers, keys) {
  for (const key of keys) {
    const idx = headers.indexOf(key);
    if (idx >= 0 && row[idx]) return row[idx].toString().trim();
  }
  return '';
}

function getCategories(row, headers) {
  for (const key of ['类目', 'category', '分类', '品类']) {
    const idx = headers.indexOf(key);
    if (idx >= 0 && row[idx]) {
      return row[idx].toString().trim().split(/[/,，,、]/).map(c => c.trim()).filter(c => c);
    }
  }
  return ['全品类'];
}

function getStatus(row, headers) {
  for (const key of ['状态', 'status', '合作进度', '合作']) {
    const idx = headers.indexOf(key);
    if (idx >= 0 && row[idx]) return row[idx].toString().trim();
  }
  return '建联';
}

// HTML 页面
const htmlPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>视频号达人管理</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#f0f2f5;padding:20px}
.header{max-width:1200px;margin:0 auto 20px;background:linear-gradient(135deg,#3370ff,#00d6b9);color:#fff;padding:25px;border-radius:12px;box-shadow:0 4px 20px rgba(51,112,255,0.3);position:relative}
.contact-info{position:absolute;top:20px;right:20px;text-align:right;font-size:13px;background:rgba(255,255,255,0.15);padding:12px 15px;border-radius:10px;display:flex;align-items:center;gap:12px}
.contact-info img{max-width:100px;border-radius:8px}
.contact-info .text{text-align:left}
.contact-info .name{font-size:14px;font-weight:bold;margin-bottom:3px}
.contact-info .vx{font-size:12px;opacity:0.9}
h1{font-size:24px;margin-bottom:10px}
.subtitle{font-size:13px;opacity:0.9;margin-bottom:15px}
.stats{display:flex;gap:15px;flex-wrap:wrap}
.stat{background:rgba(255,255,255,0.2);padding:12px 20px;border-radius:8px;text-align:center;min-width:80px}
.stat-num{font-size:22px;font-weight:bold}
.stat-label{font-size:12px;opacity:0.9}
.container{max-width:1200px;margin:0 auto}
.filters{background:#fff;padding:15px;border-radius:10px;margin-bottom:15px;display:flex;gap:15px;flex-wrap:wrap;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
#search{padding:10px 15px;border:2px solid #ddd;border-radius:8px;width:200px;font-size:14px}
#search:focus{outline:none;border-color:#3370ff}
#status,#categoryFilter{padding:10px 15px;border:2px solid #ddd;border-radius:8px;font-size:14px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px}
.tab{padding:8px 16px;background:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;box-shadow:0 2px 4px rgba(0,0,0,0.08)}
.tab:hover{transform:translateY(-2px)}
.tab.active{background:linear-gradient(135deg,#3370ff,#00d6b9);color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.card{background:#fff;border-radius:10px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #3370ff;transition:all 0.2s;position:relative}
.card:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.1)}
.card-name{font-weight:600;color:#333;margin-bottom:8px;font-size:15px}
.card-wx{font-size:13px;color:#666;background:#f8f9fa;padding:5px 10px;border-radius:5px;margin-bottom:8px}
.card-cat{font-size:11px;color:#888;background:#e8f0fe;padding:3px 8px;border-radius:4px;display:inline-block;margin-right:5px}
.badge{font-size:11px;padding:3px 10px;border-radius:12px;margin-top:8px;display:inline-block;font-weight:500}
.badge-合作{background:#e8f5e9;color:#2e7d32}
.badge-寄样{background:#fff3e0;color:#ef6c00}
.badge-建联{background:#e3f2fd;color:#1976d2}
.badge-出单{background:#ffebee;color:#c62828}
.badge-排期{background:#f3e5f5;color:#7b1fa2}
.badge-NEW{background:#ff5252;color:#fff;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}
.card-time{font-size:11px;color:#999;margin-top:8px;padding-top:8px;border-top:1px dashed #eee}
.btn-copy{background:#e8f0fe;color:#3370ff;border:none;padding:5px 12px;border-radius:5px;cursor:pointer;margin-top:10px;width:100%;font-size:12px}
.btn-copy:hover{background:#3370ff;color:#fff}
.btn-group{display:flex;gap:10px;margin-left:auto}
.btn{padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:14px}
.btn-primary{background:linear-gradient(135deg,#3370ff,#00d6b9);color:#fff}
.btn-success{background:#00c853;color:#fff}
.btn-warning{background:#ff9800;color:#fff}
.btn-refresh{background:#ff6b6b;color:#fff}
.btn-edit,.btn-delete{background:none;border:none;cursor:pointer;font-size:12px;padding:2px 6px}
.btn-edit{color:#3370ff}
.btn-delete{color:#f44336}
.card-actions{position:absolute;top:10px;right:10px;display:flex;gap:5px}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:6px;display:none;z-index:999}
.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000}
.modal.show{display:flex}
.modal-content{background:#fff;border-radius:12px;padding:30px;width:90%;max-width:550px;max-height:90vh;overflow-y:auto}
.modal-title{font-size:20px;font-weight:600;margin-bottom:20px;color:#333}
.form-group{margin-bottom:15px}
.form-group label{display:block;font-weight:500;margin-bottom:5px;color:#333}
.form-group input,.form-group select{width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px}
.form-group input:focus,.form-group select:focus{outline:none;border-color:#3370ff}
.checkbox-group{display:flex;flex-wrap:wrap;gap:10px;margin-top:5px}
.checkbox-item{background:#f5f5f5;padding:8px 15px;border-radius:20px;cursor:pointer;transition:all 0.2s}
.checkbox-item:hover{background:#e8f0fe}
.checkbox-item.checked{background:#3370ff;color:#fff}
.checkbox-item input{display:none}
.modal-buttons{display:flex;gap:10px;margin-top:20px}
.modal-buttons .btn{flex:1}
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px}
.loading-spinner{width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #3370ff;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.empty{text-align:center;padding:50px;color:#999}
.empty-icon{font-size:48px;margin-bottom:10px}
</style>
</head>
<body>
<div class="header">
<div class="contact-info">
<img src="https://img.geyong.cn/taibeix450.jpg" alt="产品图片">
<div class="text">
<div class="name">纯钛保温杯源头工厂</div>
<div>有需要联系杯哥</div>
<div class="vx">VX：Franky520888</div>
</div>
</div>
<h1>📊 视频号达人管理系统</h1>
<div class="subtitle">☁️ 云同步版 · 数据来自飞书表格</div>
<div class="stats">
<div class="stat"><div class="stat-num" id="total">0</div><div class="stat-label">总计</div></div>
<div class="stat"><div class="stat-num" id="coop">0</div><div class="stat-label">合作</div></div>
<div class="stat"><div class="stat-num" id="sample">0</div><div class="stat-label">寄样</div></div>
<div class="stat"><div class="stat-num" id="contact">0</div><div class="stat-label">建联</div></div>
</div>
<div class="sync-status" id="syncStatus">正在同步...</div>
</div>
<div class="container">
<div class="filters">
<input type="text" id="search" placeholder="🔍 搜索达人或微信号" oninput="render()">
<select id="categoryFilter" onchange="render()">
<option value="">全部类目</option>
<option value="服装">服装</option>
<option value="保健">保健</option>
<option value="运动">运动</option>
<option value="数码">数码</option>
<option value="百货">百货</option>
<option value="食品饮料">食品饮料</option>
<option value="汽车与摩托">汽车与摩托</option>
<option value="玩具">玩具</option>
<option value="五金">五金</option>
<option value="厨房">厨房</option>
<option value="美妆">美妆</option>
<option value="家纺">家纺</option>
<option value="宠物">宠物</option>
<option value="全品类">全品类</option>
</select>
<select id="status" onchange="render()">
<option value="">全部状态</option>
<option value="建联">建联</option>
<option value="寄样">寄样</option>
<option value="合作">合作</option>
<option value="出单">出单</option>
<option value="排期">排期</option>
</select>
<div class="btn-group">
<button class="btn btn-refresh" onclick="syncData()">🔄 刷新数据</button>
<button class="btn btn-primary" onclick="openAddModal()">➕ 添加达人</button>
<button class="btn btn-success" onclick="exportCSV()">📥 导出 CSV</button>
<input type="file" id="importFile" accept=".csv" style="display:none" onchange="importCSV(this)">
<button class="btn btn-warning" onclick="document.getElementById('importFile').click()">📤 导入 CSV</button>
</div>
</div>
</div>
<div class="tabs" id="tabs"></div>
<div class="grid" id="grid"></div>
</div>
<div class="toast" id="toast">✅ 已复制</div>

<div class="modal" id="dataModal">
<div class="modal-content">
<div class="modal-title" id="modalTitle">添加达人</div>
<input type="hidden" id="editId">
<div class="form-group">
<label>平台</label>
<select id="platform">
<option value="视频号">视频号</option>
<option value="抖音">抖音</option>
<option value="抖音/视频号">抖音/视频号</option>
</select>
</div>
<div class="form-group">
<label>达人名称</label>
<input type="text" id="name" required placeholder="如：#宝哥宝嫂">
</div>
<div class="form-group">
<label>微信号</label>
<input type="text" id="wechat" required placeholder="如：ZNC377">
</div>
<div class="form-group">
<label>类目（可多选）</label>
<div class="checkbox-group" id="categoryCheckboxes">
<label class="checkbox-item"><input type="checkbox" value="服装"> 服装</label>
<label class="checkbox-item"><input type="checkbox" value="保健"> 保健</label>
<label class="checkbox-item"><input type="checkbox" value="运动"> 运动</label>
<label class="checkbox-item"><input type="checkbox" value="数码"> 数码</label>
<label class="checkbox-item"><input type="checkbox" value="百货"> 百货</label>
<label class="checkbox-item"><input type="checkbox" value="食品饮料"> 食品饮料</label>
<label class="checkbox-item"><input type="checkbox" value="汽车与摩托"> 汽车与摩托</label>
<label class="checkbox-item"><input type="checkbox" value="玩具"> 玩具</label>
<label class="checkbox-item"><input type="checkbox" value="五金"> 五金</label>
<label class="checkbox-item"><input type="checkbox" value="厨房"> 厨房</label>
<label class="checkbox-item"><input type="checkbox" value="美妆"> 美妆</label>
<label class="checkbox-item"><input type="checkbox" value="家纺"> 家纺</label>
<label class="checkbox-item"><input type="checkbox" value="宠物"> 宠物</label>
<label class="checkbox-item"><input type="checkbox" value="全品类"> 全品类</label>
</div>
</div>
<div class="form-group">
<label>状态</label>
<select id="statusInput">
<option value="建联">建联</option>
<option value="寄样">寄样</option>
<option value="合作">合作</option>
<option value="出单">出单</option>
<option value="排期">排期</option>
</select>
</div>
<div class="modal-buttons">
<button class="btn btn-primary" onclick="saveData()">💾 保存</button>
<button class="btn" onclick="document.getElementById('dataModal').classList.remove('show')">取消</button>
</div>
</div>
</div>

<script>
// 配置
const API_URL = '/api';
const ADMIN_PASSWORD = 'gangzi4sb';

let data = [];
let curCat = '全品类';
let cloudData = [];

function gs(r) {
if(!r) return '建联';
r = r.toString().trim();
if(r.includes('合作')) return '合作';
if(r.includes('寄样')||r.includes('发样')||r.includes('申样')) return '寄样';
if(r.includes('出单')) return '出单';
if(r.includes('排期')) return '排期';
return '建联';
}

function getAllCategories() {
const cats = new Set();
data.forEach(d => {
if(d.categories) d.categories.forEach(c => cats.add(c));
});
return Array.from(cats).sort();
}

async function syncData() {
document.getElementById('syncStatus').textContent = '正在同步飞书数据...';
document.getElementById('grid').innerHTML = '<div class="loading"><div class="loading-spinner"></div><div>正在从飞书同步数据...</div></div>';

try {
const response = await fetch(API_URL);
const result = await response.json();

if(result.success) {
cloudData = result.data;
data = [...cloudData];
localStorage.setItem('influencerDataV3', JSON.stringify(data));
document.getElementById('syncStatus').textContent = '☁️ 已同步 · 更新时间: ' + new Date().toLocaleString() + ' · 共' + result.count + '条';
showToast('✅ 同步成功，共 ' + result.count + ' 条数据');
} else {
document.getElementById('syncStatus').textContent = '⚠️ 同步失败: ' + result.message;
showToast('❌ ' + result.message);
}
} catch(error) {
document.getElementById('syncStatus').textContent = '⚠️ 连接失败，请检查网络';
console.error(error);
const saved = localStorage.getItem('influencerDataV3');
if(saved) {
data = JSON.parse(saved);
showToast('📱 已加载本地数据');
}
}
render();
}

function render() {
const allCats = getAllCategories();

document.getElementById('total').textContent = data.length;
document.getElementById('coop').textContent = data.filter(d => gs(d.status) === '合作').length;
document.getElementById('sample').textContent = data.filter(d => gs(d.status) === '寄样').length;
document.getElementById('contact').textContent = data.filter(d => gs(d.status) === '建联').length;

document.getElementById('tabs').innerHTML = ['全品类',...allCats].map(c =>
'<button class="tab' + (c === curCat ? ' active' : '') + '" onclick="sc(\'' + c + '\')">' + c + ' <span style="background:rgba(0,0,0,0.15);padding:2px 7px;border-radius:10px;font-size:11px;margin-left:5px">' + data.filter(d => (d.categories && d.categories.includes(c)) || (c === '全品类' && (!d.categories || d.categories.length === 0))).length + '</span></button>'
).join('');

const s = document.getElementById('search').value.toLowerCase();
const st = document.getElementById('status').value;
const catFilter = document.getElementById('categoryFilter').value;

const f = data.filter(d => {
const matchCat = curCat === '全品类' || (d.categories && d.categories.includes(curCat));
const matchSearch = !s || (d.name && d.name.toLowerCase().includes(s)) || (d.wechat && d.wechat.toLowerCase().includes(s));
const matchStatus = !st || gs(d.status) === st;
const matchCatFilter = !catFilter || (d.categories && d.categories.includes(catFilter));
return matchCat && matchSearch && matchStatus && matchCatFilter;
}).sort((a, b) => {
if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
if (a.createdAt) return -1;
if (b.createdAt) return 1;
return b.id - a.id;
});

if(f.length === 0) {
document.getElementById('grid').innerHTML = '<div class="empty"><div class="empty-icon">😕</div><div>暂无数据</div></div>';
return;
}

document.getElementById('grid').innerHTML = f.map(d =>
'<div class="card">' +
'<div class="card-actions"><button class="btn-edit" onclick="editData('+d.id+')">✏️ 编辑</button> <button class="btn-delete" onclick="deleteData('+d.id+')">🗑️ 删除</button></div>' +
'<div class="card-name">' + escapeHtml(d.name) + (isNew(d.createdAt) ? ' <span class="badge badge-NEW">NEW</span>' : '') + '</div>' +
'<div class="card-wx">📱 ' + escapeHtml(d.wechat) + '</div>' +
(d.categories && d.categories.length > 0 ? d.categories.map(c => '<span class="card-cat">' + c + '</span>').join('') : '<span class="card-cat">全品类</span>') +
'<span class="badge badge-' + gs(d.status) + '">' + gs(d.status) + '</span>' +
(d.createdAt ? '<div class="card-time">🕐 ' + escapeHtml(d.createdAt) + '</div>' : '') +
'<button class="btn-copy" onclick="cp(\'' + escapeHtml(d.wechat) + '\')">📋 复制微信</button></div>'
).join('');
}

function escapeHtml(t) { if(!t) return ''; return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function isNew(createdAt) { if(!createdAt) return false; const d = new Date(createdAt); const now = new Date(); return (now - d) / (1000*60*60*24) <= 7; }
function sc(c) { curCat = c; render(); }
function cp(t) { navigator.clipboard.writeText(t); showToast('✅ 已复制'); }
function showToast(m) { const t = document.getElementById('toast'); t.textContent = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 1500); }

function openAddModal() {
document.getElementById('modalTitle').textContent = '➕ 添加达人';
document.getElementById('editId').value = '';
document.getElementById('dataForm').reset();
document.querySelectorAll('#categoryCheckboxes input').forEach(cb => cb.checked = false);
document.getElementById('dataModal').classList.add('show');
}

function editData(id) {
const d = data.find(item => item.id === id);
if(!d) return;
document.getElementById('modalTitle').textContent = '✏️ 编辑达人';
document.getElementById('editId').value = d.id;
document.getElementById('platform').value = d.platform || '视频号';
document.getElementById('name').value = d.name || '';
document.getElementById('wechat').value = d.wechat || '';
document.getElementById('statusInput').value = gs(d.status);

document.querySelectorAll('#categoryCheckboxes input').forEach(cb => {
cb.checked = d.categories && d.categories.includes(cb.value);
cb.parentElement.classList.toggle('checked', cb.checked);
});

document.getElementById('dataModal').classList.add('show');
}

function saveData() {
const id = document.getElementById('editId').value;
const platform = document.getElementById('platform').value;
const name = document.getElementById('name').value.trim();
const wechat = document.getElementById('wechat').value.trim();
const status = document.getElementById('statusInput').value;

const categories = [];
document.querySelectorAll('#categoryCheckboxes input:checked').forEach(cb => categories.push(cb.value));

if(!name || !wechat) {
showToast('❌ 请填写名称和微信');
return;
}

if(id) {
const idx = data.findIndex(item => item.id === parseInt(id));
if(idx !== -1) {
data[idx] = {...data[idx], platform, name, wechat, categories, status};
}
} else {
data.push({id: Date.now(), platform, name, wechat, categories, status});
}

localStorage.setItem('influencerDataV3', JSON.stringify(data));
document.getElementById('dataModal').classList.remove('show');
render();
showToast('✅ 保存成功');
}

function deleteData(id) {
const pwd = prompt('请输入管理员密码：');
if(pwd !== ADMIN_PASSWORD) {
showToast('❌ 密码错误，无权删除');
return;
}
const d = data.find(item => item.id === id);
if(!d) return;
if(confirm('确定要删除 "' + d.name + '" 吗？')) {
data = data.filter(item => item.id !== id);
localStorage.setItem('influencerDataV3', JSON.stringify(data));
render();
showToast('✅ 已删除');
}
}

function exportCSV() {
const pwd = prompt('请输入管理员密码：');
if(pwd !== ADMIN_PASSWORD) {
showToast('❌ 密码错误，无权导出');
return;
}
const headers = ['平台','名称','微信','类目','状态'];
const rows = data.map(d => [
d.platform || '视频号',
d.name || '',
d.wechat || '',
(d.categories && d.categories.join('/')) || '全品类',
d.status || '建联'
]);
const csv = '\ufeff' + headers.join(',') + '\n' + rows.map(r => r.map(c => '"'+c+'"').join(',')).join('\n');
const b = new Blob([csv], {type:'text/csv'});
const a = document.createElement('a');
a.href = URL.createObjectURL(b);
a.download = '达人数据_' + new Date().toLocaleDateString() + '.csv';
a.click();
showToast('✅ 导出成功');
}

function importCSV(input) {
const pwd = prompt('请输入管理员密码：');
if(pwd !== ADMIN_PASSWORD) {
showToast('❌ 密码错误，无权导入');
return;
}
const file = input.files[0];
if(!file) return;
const reader = new FileReader();
reader.onload = function(e) {
const text = e.target.result;
const lines = text.split('\n').filter(l => l.trim());
if(lines.length < 2) {
showToast('❌ CSV文件格式错误');
return;
}
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
const nameIdx = headers.findIndex(h => h.includes('名称') || h.includes('name'));
const wechatIdx = headers.findIndex(h => h.includes('微信') || h.includes('wechat'));
const catIdx = headers.findIndex(h => h.includes('类目') || h.includes('category'));
const statusIdx = headers.findIndex(h => h.includes('状态') || h.includes('status'));
const platformIdx = headers.findIndex(h => h.includes('平台') || h.includes('platform'));
let count = 0;
for(let i = 1; i < lines.length; i++) {
const cols = lines[i].split(',').map(c => c.trim().replace(/"/g,''));
if(cols[nameIdx] && cols[nameIdx].trim()) {
const newData = {
id: Date.now() + i,
platform: cols[platformIdx] || '视频号',
name: cols[nameIdx] || '',
wechat: cols[wechatIdx] || '',
categories: cols[catIdx] ? cols[catIdx].split(/[/,，,、]/).map(c => c.trim()).filter(c => c) : ['全品类'],
status: cols[statusIdx] || '建联'
};
const exists = data.some(d => d.name === newData.name && d.wechat === newData.wechat);
if(!exists) {
data.push(newData);
count++;
}
}
}
localStorage.setItem('influencerDataV3', JSON.stringify(data));
render();
showToast('✅ 成功导入 ' + count + ' 条数据（已去重）');
input.value = '';
};
reader.readAsText(file, 'UTF-8');
}

document.querySelectorAll('.checkbox-item input').forEach(input => {
input.addEventListener('change', function() {
this.parentElement.classList.toggle('checked', this.checked);
});
});

document.getElementById('dataModal').addEventListener('click', function(e) {
if(e.target === this) this.classList.remove('show');
});

syncData();
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // 测试端点
    if (url.pathname === '/test') {
      return new Response(JSON.stringify({ 
        status: 'ok',
        message: 'API works',
        spreadsheetId: FEISHU_SPREADSHEET_ID
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 调试端点：查看飞书 sheets
    if (url.pathname === '/debug') {
      try {
        const token = await getAccessToken();
        
        // 使用正确的 API 获取 sheets 列表
        const response = await fetch(
          `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${FEISHU_SPREADSHEET_ID}/sheets`,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        const text = await response.text();
        
        return new Response(text, {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(e.message, { status: 500 });
      }
    }
    
    // 返回前端页面
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(htmlPage, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }
    
    // API 请求
    if (url.pathname === '/api' || url.pathname.startsWith('/api')) {
      if (request.method === 'OPTIONS') {
        return new Response('', { headers: corsHeaders });
      }

      try {
        const token = await getAccessToken();
        if (!token) {
          return new Response(JSON.stringify({ error: '获取token失败' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // 直接使用 values API
        // 尝试使用 Sheet1 作为默认表名
        const sheetName = 'Sheet1';
        const range = `${sheetName}!A:Z`;
        
        const response = await fetch(
          `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${FEISHU_SPREADSHEET_ID}/values/${range}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const text = await response.text();
        
        if (!response.ok) {
          return new Response(JSON.stringify({ 
            error: '飞书API错误', 
            message: text,
            status: response.status
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        let result;
        try {
          result = JSON.parse(text);
        } catch (e) {
          return new Response(JSON.stringify({ 
            error: 'JSON解析失败', 
            message: text.substring(0, 500)
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const rows = result.data?.valueRange?.values || [];
        const formattedData = formatData(rows);
        
        return new Response(JSON.stringify({
          success: true,
          count: formattedData.length,
          data: formattedData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: '获取数据失败', 
          message: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  }
};
