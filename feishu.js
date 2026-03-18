/*
飞书表格同步 API (Cloudflare Workers版本)
*/

const FEISHU_APP_ID = 'cli_a92507a7db7c5bd1';
const FEISHU_APP_SECRET = 'LG8lGSoyNUjoHX5x0oTE5enaFCWX7oCs';
const FEISHU_SPREADSHEET_ID = 'PO8hsFebahujj6tLCXKc8YXYnZe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// 获取飞书access_token
async function getAccessToken() {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  const data = await response.json();
  return data.tenant_access_token;
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

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response('', { headers: corsHeaders });
    }

    try {
      const token = await getAccessToken();
      
      const metaResponse = await fetch(
        `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${FEISHU_SPREADSHEET_ID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const metaData = await metaResponse.json();
      
      const sheets = metaData.data?.sheets;
      if (!sheets || sheets.length === 0) {
        return new Response(JSON.stringify({ error: '表格没有工作表' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const firstSheet = sheets[0].sheet_id || sheets[0].sheetId;
      const range = `${encodeURIComponent(firstSheet)}!A:Z`;
      
      const response = await fetch(
        `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${FEISHU_SPREADSHEET_ID}/values/${range}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await response.json();
      
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
};
