// ========== API 配置 ==========
const API_BASE = window.location.port === '3001' ? window.location.origin : '';
let authToken = localStorage.getItem('liaoran_admin_token') || '';
let currentUser = null;

async function apiFetch(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': authToken ? 'Bearer ' + authToken : '' };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401) {
    authToken = ''; localStorage.removeItem('liaoran_admin_token');
    document.getElementById('loginOverlay').style.display = 'flex';
    throw new Error('登录已过期');
  }
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || '请求失败');
  return data.data;
}

// ========== 模态框通用方法 ==========
function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }
document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

// ========== 登录 ==========
async function doAdminLogin() {
  const phone = document.getElementById('adminPhone').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const errEl = document.getElementById('loginError');
  if (!phone) { errEl.textContent = '请输入手机号'; errEl.style.display = 'block'; return; }
  if (!password) { errEl.textContent = '请输入密码'; errEl.style.display = 'block'; return; }
  try {
    const res = await fetch(API_BASE + '/api/v1/auth/login/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) });
    const data = await res.json();
    if (data.code === 0 && data.data) {
      authToken = data.data.token; currentUser = data.data.user;
      localStorage.setItem('liaoran_admin_token', authToken);
      document.getElementById('loginOverlay').style.display = 'none';
      errEl.style.display = 'none';
      document.getElementById('adminNameDisplay').textContent = currentUser.nickname || '管理员';
      loadDashboardData();
    } else { errEl.textContent = data.message || '登录失败'; errEl.style.display = 'block'; }
  } catch (e) { errEl.textContent = '网络连接失败: ' + e.message; errEl.style.display = 'block'; }
}

(function init() {
  if (authToken) {
    document.getElementById('loginOverlay').style.display = 'none';
    apiFetch('/api/v1/auth/me').then(user => {
      currentUser = user; document.getElementById('adminNameDisplay').textContent = user.nickname || '管理员';
      loadDashboardData();
    }).catch(() => { authToken = ''; localStorage.removeItem('liaoran_admin_token'); document.getElementById('loginOverlay').style.display = 'flex'; });
  }
  document.getElementById('adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
  document.getElementById('adminPhone').addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
})();

function toast(msg, type='success') {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;top:20px;right:20px;background:${type==='error'?'#E57373':'#6BAF9E'};color:#fff;padding:12px 20px;border-radius:10px;z-index:99999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ========== 工具函数 ==========
function formatNum(n) { if (!n && n !== 0) return '0'; return n >= 10000 ? (n/10000).toFixed(1) + '万' : String(n); }
function avatarColor(id) { const colors = ['#E8835A','#6BAF9E','#6B8EC7','#D4943A','#C75C5C','#8B7EC8']; let hash = 0; for (let i = 0; i < (id||'A').length; i++) hash = ((hash<<5)-hash) + id.charCodeAt(i); return colors[Math.abs(hash) % colors.length]; }
const catLabels = { emotion: '情绪评估', personality: '人格特质', career: '职业发展', relationship: '人际关系', academic: '学业成长' };
const catTags = { emotion: 'emotion-tag', personality: 'personality-tag', career: 'career-tag', relationship: 'rel-tag', academic: 'acad-tag' };

// ========== 页面切换 ==========
function switchPage(pageId) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === 'page-' + pageId));
  const titles = { 'dashboard':'数据仪表盘','users':'用户管理','assessments':'测评管理','assess-editor':'测评内容编辑','entertainment':'娱乐内容管理','entertainment-editor':'娱乐内容编辑','ai-analysis':'AI 分析中心','treehole':'树洞审核','ai-agents':'AI Agent 配置','crisis':'危机预警','settings':'系统设置','logs':'操作日志' };
  document.getElementById('pageTitle').textContent = titles[pageId] || '数据仪表盘';
  document.getElementById('breadcrumbCurrent').textContent = titles[pageId] || '数据仪表盘';
  if (pageId === 'dashboard') loadDashboardData();
  if (pageId === 'users') loadUsersData();
  if (pageId === 'assessments') loadAssessmentsData();
  if (pageId === 'assess-editor') loadAssessEditorData();
  if (pageId === 'entertainment') loadEntertainmentData();
  if (pageId === 'entertainment-editor') loadEntEditorData();
  if (pageId === 'treehole') loadTreeholeData();
  if (pageId === 'crisis') loadCrisisData();
  if (pageId === 'logs') loadLogsData();
  if (pageId === 'ai-analysis') loadAIStatusData();
  if (pageId === 'ai-agents') loadAgentsData();
  if (pageId === 'settings') loadSmsSettings();
}

// ==================== 1. 数据仪表盘 ====================
async function loadDashboardData() {
  try {
    const data = await apiFetch('/api/v1/admin/dashboard');
    const s = data.summary;
    const dashPage = document.getElementById('page-dashboard');
    if (!dashPage) return;
    const statCards = dashPage.querySelectorAll('.stats-row .stat-card .stat-value');
    if (statCards.length >= 4) {
      statCards[0].textContent = formatNum(s.totalUsers);
      statCards[1].textContent = formatNum(s.activeSessions);
      statCards[2].textContent = formatNum(s.totalAssessments);
      statCards[3].textContent = formatNum(s.crisisAlerts);
      if (s.crisisAlerts > 0) statCards[3].style.color = 'var(--color-crisis)';
    }
    // 更新热门量表表格
    const hotTbody = dashPage.querySelector('table tbody');
    if (hotTbody && data.hotScales) {
      hotTbody.innerHTML = data.hotScales.map((h,i) => `<tr>
        <td style="font-weight:600;color:${i<3?'var(--color-primary)':'#999'}">${i+1}</td>
        <td>${h.name}</td><td style="font-weight:500">${h.completions||0}</td>
        <td style="font-weight:600">${h.avg_score ? h.avg_score.toFixed(1) : '---'}</td>
        <td style="color:var(--color-primary)">↑${Math.floor(Math.random()*20+5)}%</td>
      </tr>`).join('');
    }
    // 更新AI对话量
    const chatBars = dashPage.querySelectorAll('.progress-bar + div');
    if (data.agentChats) {
      data.agentChats.forEach((a,i) => { if (chatBars[i]) chatBars[i].textContent = a.chat_count.toLocaleString(); });
    }
  } catch (e) { console.error('加载仪表盘失败:', e); }
}

// ==================== 2. 用户管理 ====================
let usersFilter = { search: '', status: '', page: 1 };

async function loadUsersData() {
  try {
    const params = new URLSearchParams({ page: usersFilter.page, limit: 15 });
    if (usersFilter.search) params.set('search', usersFilter.search);
    if (usersFilter.status) params.set('status', usersFilter.status);
    const data = await apiFetch('/api/v1/admin/users?' + params);
    const tbody = document.querySelector('#page-users tbody');
    if (!tbody || !data.list) return;
    tbody.innerHTML = data.list.map(u => `<tr>
      <td><div class="user-cell"><div class="user-avatar-sm" style="background:${avatarColor(u.id)}">${(u.nickname||'?')[0]}</div><span class="user-name">${u.nickname||'匿名用户'}</span></div></td>
      <td style="color:var(--color-text-tertiary);font-family:var(--font-mono);font-size:12px">#${(u.id||'').slice(0,8)}</td>
      <td style="color:var(--color-text-secondary)">${u.created_at?u.created_at.slice(0,10):'---'}</td>
      <td style="font-weight:500">${u.assess_count||0}</td>
      <td style="font-weight:500">${u.chat_count||0}</td>
      <td><span class="status-tag ${u.status==='active'?'active':u.status==='risk'?'risk':'inactive'}"><span class="status-dot"></span>${u.status==='active'?'活跃':u.status==='risk'?'关注':'静默'}</span></td>
      <td><div class="action-btns"><button class="action-link" onclick="viewUser('${u.id}')">查看</button><button class="action-link" onclick="editUser('${u.id}','${u.nickname||''}','${u.status||'active'}','${u.phone||''}')">编辑</button></div></td>
    </tr>`).join('');
    const pageInfo = document.querySelector('#page-users .pagination-info');
    if (pageInfo) pageInfo.textContent = `共 ${data.pagination.total} 条记录，第 ${data.pagination.page}/${data.pagination.totalPages} 页`;
    // 更新状态筛选下拉值
    const statSelect = document.querySelector('#page-users .table-filters select:first-child');
    if (statSelect) statSelect.value = usersFilter.status;
  } catch (e) { console.error('加载用户失败:', e); }
}

async function viewUser(id) {
  try {
    const u = await apiFetch('/api/v1/admin/users/' + id);
    openModal('用户详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
        <div><b>昵称：</b>${u.nickname||'---'}</div><div><b>手机：</b>${u.phone||'---'}</div>
        <div><b>邮箱：</b>${u.email||'---'}</div><div><b>状态：</b>${u.status||'---'}</div>
        <div><b>会员等级：</b>Lv${u.member_level||0}</div><div><b>积分：</b>${u.points||0}</div>
        <div><b>压力指数：</b>${u.stress_level||0}</div><div><b>情绪稳定性：</b>${u.emotional_stability||0}</div>
        <div><b>风险等级：</b><span style="color:${u.risk_level==='high'?'#C62828':'#2E7D32'}">${u.risk_level==='high'?'⚠ 高风险':'正常'}</span></div>
        <div><b>当前心情：</b>${u.current_mood||'---'}</div>
        <div style="grid-column:1/-1;margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
          <b>统计：</b>测评${u.assessCount||0}次 | 对话${u.chatCount||0}次 | 树洞${u.treeholeCount||0}条
        </div>
        ${u.assessments && u.assessments.length ? `<div style="grid-column:1/-1;margin-top:8px;"><b>最近测评：</b><br>${u.assessments.map(a => `• ${a.scale_name} - ${a.created_at?.[0]?a.created_at.slice(0,10):'---'}`).join('<br>')}</div>` : ''}
      </div>
    `, '<button class="btn btn-ghost btn-sm" onclick="closeModal()">关闭</button>');
  } catch (e) { toast('查看用户失败: ' + e.message, 'error'); }
}

function editUser(id, nickname, status, phone) {
  openModal('编辑用户', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <label>昵称 <input id="eu_nick" value="${escapeHtml(nickname)}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>手机号 <input id="eu_phone" value="${escapeHtml(phone)}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>状态 <select id="eu_status" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;">
        <option value="active" ${status==='active'?'selected':''}>活跃</option>
        <option value="silent" ${status==='silent'?'selected':''}>静默</option>
        <option value="risk" ${status==='risk'?'selected':''}>风险关注</option>
      </select></label>
    </div>
  `, `<button class="btn btn-ghost btn-sm" onclick="closeModal()">取消</button><button class="btn btn-primary btn-sm" onclick="saveUser('${id}')">保存</button>`);
}

async function saveUser(id) {
  try {
    await apiFetch('/api/v1/admin/users/' + id, 'PUT', {
      nickname: document.getElementById('eu_nick').value,
      phone: document.getElementById('eu_phone').value,
      status: document.getElementById('eu_status').value
    });
    closeModal(); toast('用户已更新'); loadUsersData();
  } catch (e) { toast('保存失败: ' + e.message, 'error'); }
}

// 用户页筛选事件绑定
setTimeout(() => {
  const userPage = document.getElementById('page-users');
  if (userPage) {
    const selects = userPage.querySelectorAll('.table-filters select');
    const searchInput = userPage.querySelector('input[placeholder*="搜索"]');
    if (selects[0]) selects[0].addEventListener('change', e => { usersFilter.status = e.target.value; usersFilter.page = 1; loadUsersData(); });
    if (searchInput) searchInput.addEventListener('input', debounce(e => { usersFilter.search = e.target.value; usersFilter.page = 1; loadUsersData(); }, 500));
  }
}, 500);

// ==================== 3. 测评管理 ====================
let assessFilter = { search: '' };

async function loadAssessmentsData() {
  try {
    const params = new URLSearchParams();
    if (assessFilter.search) params.set('search', assessFilter.search);
    const result = await apiFetch('/api/v1/admin/assessments' + (params.toString() ? '?' + params : ''));
    const scales = result.list || result;
    const stats = result.stats;
    const tbody = document.querySelector('#page-assessments tbody');
    if (!tbody || !scales) return;
    // 更新统计卡片
    const statCards = document.querySelectorAll('#page-assessments .stat-card .stat-value');
    if (statCards.length >= 4 && stats) {
      statCards[0].textContent = stats.total;
      statCards[1].textContent = formatNum(stats.totalCompletions);
      statCards[2].textContent = stats.avgCompletionRate + '%';
      statCards[3].textContent = '+' + stats.weekNew;
    }
    tbody.innerHTML = scales.map(s => `<tr>
      <td class="user-name">${s.name}</td>
      <td><span class="emotion-tag">${catLabels[s.category]||s.category||'未分类'}</span></td>
      <td>${s.question_count||0}题</td>
      <td style="font-weight:500">${s.completions||0}</td>
      <td style="font-weight:600">${s.avg_score?Number(s.avg_score).toFixed(1):'---'}</td>
      <td><span class="status-tag ${s.status==='published'?'active':'inactive'}"><span class="status-dot"></span>${s.status==='published'?'启用':'草稿'}</span></td>
      <td><div class="action-btns">
        <button class="action-link" onclick="editScale('${s.id}')">编辑</button>
        <button class="action-link" style="color:var(--color-danger)" onclick="deleteScale('${s.id}','${s.name}')">删除</button>
      </div></td>
    </tr>`).join('');
    // 绑定新增按钮
    const addBtn = document.querySelector('#page-assessments .table-toolbar .btn-primary');
    if (addBtn) addBtn.onclick = () => openScaleModal();
  } catch (e) { console.error('加载测评失败:', e); }
}

function openScaleModal(scale=null) {
  openModal(scale ? '编辑量表' : '新增量表', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <label>量表名称 <input id="sc_name" value="${scale?escapeHtml(scale.name):''}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>分类 <select id="sc_cat" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;">
        ${['emotion','personality','career','relationship','academic'].map(c => `<option value="${c}" ${scale&&scale.category===c?'selected':''}>${catLabels[c]}</option>`).join('')}
      </select></label>
      <label>描述 <textarea id="sc_desc" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;min-height:80px;">${scale?escapeHtml(scale.description||''):''}</textarea></label>
      <label>预计时长(分钟) <input id="sc_min" type="number" value="${scale?scale.estimated_minutes||5:5}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>状态 <select id="sc_status" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;">
        <option value="published" ${scale&&scale.status==='published'?'selected':''}>启用</option>
        <option value="draft" ${scale&&scale.status==='draft'?'selected':''}>草稿</option>
      </select></label>
    </div>
  `, `<button class="btn btn-ghost btn-sm" onclick="closeModal()">取消</button><button class="btn btn-primary btn-sm" onclick="saveScale('${scale?scale.id:''}')">保存</button>`);
}

async function saveScale(id) {
  const body = { name: document.getElementById('sc_name').value, category: document.getElementById('sc_cat').value, description: document.getElementById('sc_desc').value, estimated_minutes: parseInt(document.getElementById('sc_min').value)||5, status: document.getElementById('sc_status').value };
  try {
    if (id) { await apiFetch('/api/v1/admin/assessments/'+id, 'PUT', body); }
    else { await apiFetch('/api/v1/admin/assessments', 'POST', body); }
    closeModal(); toast('量表已保存'); loadAssessmentsData();
  } catch (e) { toast('保存失败: '+e.message, 'error'); }
}

async function editScale(id) {
  editorScaleId = id;
  switchPage('assess-editor');
}

async function deleteScale(id, name) {
  if (!confirm(`确定删除"${name}"及其所有题目吗？`)) return;
  try { await apiFetch('/api/v1/admin/assessments/'+id, 'DELETE'); toast('量表已删除'); loadAssessmentsData(); }
  catch (e) { toast('删除失败: '+e.message, 'error'); }
}

// ==================== 4. 测评内容编辑 ====================
let editorScaleId = null;
let editorQuestions = [];
let editorScaleData = null;

async function loadAssessEditorData() {
  const page = document.getElementById('page-assess-editor');
  if (!page) return;
  try {
    const result = await apiFetch('/api/v1/admin/assessments');
    const scales = result.list || result;
    // 确保有量表选择下拉
    let scaleSelect = document.getElementById('scaleSelect');
    if (!scaleSelect) {
      const sidebar = page.querySelector('.editor-sidebar');
      const selHtml = `<div style="margin-bottom:16px;"><label style="font-size:13px;color:var(--color-text-tertiary);display:block;margin-bottom:6px;">选择量表：</label>
        <select id="scaleSelect" onchange="onScaleSelect()" style="padding:8px 12px;border:1px solid var(--color-border);border-radius:8px;font-size:14px;min-width:200px;width:100%;">
        <option value="">--- 请选择 ---</option>
        ${scales.map(s => `<option value="${s.id}">${s.name} [${catLabels[s.category]||s.category}]</option>`).join('')}
        </select></div>`;
      sidebar.insertAdjacentHTML('afterbegin', selHtml);
      scaleSelect = document.getElementById('scaleSelect');
    } else {
      // 更新下拉选项
      scaleSelect.innerHTML = '<option value="">--- 请选择 ---</option>' + scales.map(s => `<option value="${s.id}">${s.name} [${catLabels[s.category]||s.category}]</option>`).join('');
    }
    if (editorScaleId) {
      scaleSelect.value = editorScaleId;
      await loadScaleDetail(editorScaleId);
    }
  } catch (e) { console.error('加载编辑数据失败:', e); }
}

function onScaleSelect() {
  const id = document.getElementById('scaleSelect').value;
  if (id) { editorScaleId = id; loadScaleDetail(id); }
}

async function loadScaleDetail(scaleId) {
  try {
    const [scale, questions] = await Promise.all([
      apiFetch('/api/v1/admin/assessments/' + scaleId),
      apiFetch('/api/v1/admin/assessments/' + scaleId + '/questions')
    ]);
    editorScaleData = scale;
    editorQuestions = questions;
    // 填充左侧表单
    document.getElementById('aeName').value = scale.name || '';
    document.getElementById('aeCat').value = scale.category || 'emotion';
    document.getElementById('aeDesc').value = scale.description || '';
    document.getElementById('aeScoring').value = scale.scoring_method || 'likert4';
    // 渲染题目
    renderAEQuestions(questions);
    // 渲染计分标准
    renderAEScoreRanges(scale.score_ranges);
    // 渲染AI模板
    renderAEAiTemplates(scale.ai_templates);
  } catch (e) { console.error('加载量表详情失败:', e); toast('加载失败', 'error'); }
}

function renderAEQuestions(questions) {
  const container = document.getElementById('aeQuestions');
  if (!container) return;
  if (!questions || questions.length === 0) {
    container.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">暂无题目，点击下方按钮添加</div>';
    return;
  }
  container.innerHTML = questions.map((q,i) => {
    const opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options||'[]') : []);
    return `<div class="question-card" style="margin-bottom:12px;">
      <div class="question-header">
        <div class="question-num">Q${i+1}</div>
        <input type="text" class="question-title-input" value="${escapeHtml(q.question_text||'')}" onchange="updateQuestionText('${q.id}',this.value)">
        <div class="question-actions">
          <button class="q-action-btn" onclick="moveQuestion('${q.id}',${i-1})" ${i===0?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18,15 12,9 6,15"/></svg></button>
          <button class="q-action-btn" onclick="moveQuestion('${q.id}',${i+1})" ${i===questions.length-1?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6,9 12,15 18,9"/></svg></button>
          <button class="q-action-btn danger" onclick="deleteQuestion('${q.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
        </div>
      </div>
      <div class="options-editor">
        ${opts.map((o,j) => `<div class="option-row"><input class="option-score" value="${o.score||j+1}" readonly><input class="option-text" value="${escapeHtml(o.label||'')}" readonly></div>`).join('')}
      </div>
      <div style="font-size:11px;color:#999;margin-top:6px;display:flex;gap:12px;align-items:center;">
        <span>维度：<input style="width:80px;padding:3px 6px;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;" value="${escapeHtml(q.dimension||'')}" onchange="updateQuestionField('${q.id}','dimension',this.value)"></span>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" ${q.reverse_score?'checked':''} onchange="updateQuestionField('${q.id}','reverse_score',this.checked?1:0)"> 反向计分</label>
      </div>
    </div>`;
  }).join('');
}

function renderAEScoreRanges(ranges) {
  const container = document.getElementById('aeScoreRanges');
  if (!container) return;
  const list = Array.isArray(ranges) ? ranges : (ranges ? [ranges] : []);
  if (list.length === 0) {
    container.innerHTML = '';
    addScoreRange(true);
    return;
  }
  container.innerHTML = list.map((r,i) => `
    <div class="score-range-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px;background:var(--color-surface-warm);border-radius:8px;">
      <input type="number" class="sr-min" placeholder="最小分" value="${r.min??''}" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <span style="color:#999;">-</span>
      <input type="number" class="sr-max" placeholder="最大分" value="${r.max??''}" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <input type="text" class="sr-label" placeholder="等级名称" value="${escapeHtml(r.label||'')}" style="flex:1;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <input type="text" class="sr-color" placeholder="颜色" value="${escapeHtml(r.color||'')}" style="width:80px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <input type="text" class="sr-desc" placeholder="含义说明" value="${escapeHtml(r.description||'')}" style="flex:2;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px;" onclick="this.parentElement.remove()">✕</button>
    </div>
  `).join('');
}

function addScoreRange(silent) {
  const container = document.getElementById('aeScoreRanges');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'score-range-row';
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px;background:var(--color-surface-warm);border-radius:8px;';
  div.innerHTML = `<input type="number" class="sr-min" placeholder="最小分" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <span style="color:#999;">-</span>
      <input type="number" class="sr-max" placeholder="最大分" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <input type="text" class="sr-label" placeholder="等级名称" style="flex:1;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <input type="text" class="sr-color" placeholder="颜色" style="width:80px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <input type="text" class="sr-desc" placeholder="含义说明" style="flex:2;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
      <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px;" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(div);
  if (!silent) div.querySelector('input').focus();
}

function getScoreRangesFromDOM() {
  const rows = document.querySelectorAll('#aeScoreRanges .score-range-row');
  return Array.from(rows).map(row => ({
    min: parseInt(row.querySelector('.sr-min').value) || 0,
    max: parseInt(row.querySelector('.sr-max').value) || 0,
    label: row.querySelector('.sr-label').value,
    color: row.querySelector('.sr-color').value,
    description: row.querySelector('.sr-desc').value
  })).filter(r => r.label);
}

function renderAEAiTemplates(templates) {
  const container = document.getElementById('aeAiTemplates');
  if (!container) return;
  const list = Array.isArray(templates) ? templates : (templates ? [templates] : []);
  if (list.length === 0) {
    container.innerHTML = '';
    addAiTemplate(true);
    return;
  }
  container.innerHTML = list.map((t,i) => `
    <div class="ai-template-row" style="margin-bottom:12px;padding:12px;background:var(--color-surface-warm);border-radius:8px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="number" class="at-min" placeholder="最小分" value="${t.min??''}" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <span style="color:#999;">-</span>
        <input type="number" class="at-max" placeholder="最大分" value="${t.max??''}" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <input type="text" class="at-level" placeholder="等级标签" value="${escapeHtml(t.level||'')}" style="flex:1;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px;" onclick="this.closest('.ai-template-row').remove()">✕</button>
      </div>
      <textarea class="at-prompt" placeholder="AI分析模板文案，支持变量：{score} {level} {scale_name}" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;min-height:60px;resize:vertical;">${escapeHtml(t.prompt||'')}</textarea>
    </div>
  `).join('');
}

function addAiTemplate(silent) {
  const container = document.getElementById('aeAiTemplates');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'ai-template-row';
  div.style.cssText = 'margin-bottom:12px;padding:12px;background:var(--color-surface-warm);border-radius:8px;';
  div.innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="number" class="at-min" placeholder="最小分" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <span style="color:#999;">-</span>
        <input type="number" class="at-max" placeholder="最大分" style="width:70px;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <input type="text" class="at-level" placeholder="等级标签" style="flex:1;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px;" onclick="this.closest('.ai-template-row').remove()">✕</button>
      </div>
      <textarea class="at-prompt" placeholder="AI分析模板文案，支持变量：{score} {level} {scale_name}" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;min-height:60px;resize:vertical;"></textarea>`;
  container.appendChild(div);
  if (!silent) div.querySelector('input').focus();
}

function getAiTemplatesFromDOM() {
  const rows = document.querySelectorAll('#aeAiTemplates .ai-template-row');
  return Array.from(rows).map(row => ({
    min: parseInt(row.querySelector('.at-min').value) || 0,
    max: parseInt(row.querySelector('.at-max').value) || 0,
    level: row.querySelector('.at-level').value,
    prompt: row.querySelector('.at-prompt').value
  })).filter(r => r.level || r.prompt);
}

async function saveScaleInfo() {
  if (!editorScaleId) { toast('请先选择量表', 'error'); return; }
  const body = {
    name: document.getElementById('aeName').value,
    category: document.getElementById('aeCat').value,
    description: document.getElementById('aeDesc').value,
    scoring_method: document.getElementById('aeScoring').value,
    score_ranges: getScoreRangesFromDOM(),
    ai_templates: getAiTemplatesFromDOM()
  };
  try {
    await apiFetch('/api/v1/admin/assessments/' + editorScaleId, 'PUT', body);
    toast('量表信息已保存');
  } catch (e) { toast('保存失败: ' + e.message, 'error'); }
}

async function addNewQuestion() {
  if (!editorScaleId) { toast('请先选择量表', 'error'); return; }
  const defaultOpts = [{label:'没有或很少时间',score:1},{label:'少部分时间',score:2},{label:'相当多时间',score:3},{label:'绝大部分或全部时间',score:4}];
  try {
    await apiFetch('/api/v1/admin/assessments/'+editorScaleId+'/questions', 'POST', {
      question_text: '新题目（点击编辑）', options: defaultOpts, question_order: editorQuestions.length + 1
    });
    toast('题目已添加'); loadScaleDetail(editorScaleId);
  } catch (e) { toast('添加失败: '+e.message, 'error'); }
}

async function updateQuestionText(qId, text) {
  try { await apiFetch(`/api/v1/admin/assessments/${editorScaleId}/questions/${qId}`, 'PUT', { question_text: text }); }
  catch (e) { console.error(e); }
}

async function updateQuestionField(qId, field, value) {
  try { await apiFetch(`/api/v1/admin/assessments/${editorScaleId}/questions/${qId}`, 'PUT', { [field]: value }); }
  catch (e) { console.error(e); }
}

async function deleteQuestion(qId) {
  if (!confirm('删除此题？')) return;
  try { await apiFetch(`/api/v1/admin/assessments/${editorScaleId}/questions/${qId}`, 'DELETE'); toast('已删除'); loadScaleDetail(editorScaleId); }
  catch (e) { toast('删除失败: '+e.message, 'error'); }
}

async function moveQuestion(qId, newOrder) {
  try { await apiFetch(`/api/v1/admin/assessments/${editorScaleId}/questions/${qId}`, 'PUT', { question_order: newOrder }); loadScaleDetail(editorScaleId); }
  catch (e) { console.error(e); }
}

async function deleteCurrentScale() {
  if (!editorScaleId) return;
  const name = document.getElementById('aeName')?.value || '当前量表';
  if (!confirm(`确定删除"${name}"？`)) return;
  try { await apiFetch('/api/v1/admin/assessments/'+editorScaleId, 'DELETE'); toast('量表已删除'); editorScaleId=null; editorQuestions=[]; editorScaleData=null; loadAssessEditorData(); }
  catch (e) { toast('删除失败: '+e.message, 'error'); }
}

// ==================== 5. 娱乐内容管理（基于entertainment_tests表） ====================
let entFilter = { category: '', status: '', search: '' };

async function loadEntertainmentData() {
  try {
    const params = new URLSearchParams();
    if (entFilter.category) params.set('category', entFilter.category);
    if (entFilter.status) params.set('status', entFilter.status);
    if (entFilter.search) params.set('search', entFilter.search);
    const data = await apiFetch('/api/v1/admin/entertainment-tests?' + params);
    const page = document.getElementById('page-entertainment');
    if (!page) return;
    // 更新统计
    const statCards = page.querySelectorAll('.stat-card .stat-value');
    if (statCards.length >= 4 && data.stats) {
      statCards[0].textContent = data.stats.total;
      statCards[1].textContent = '+' + data.stats.monthNew;
      statCards[2].textContent = formatNum(data.stats.totalViews);
      statCards[3].textContent = formatNum(data.stats.totalPlays);
    }
    // 更新表格
    const tbody = page.querySelector('table tbody');
    if (!tbody || !data.list) return;
    tbody.innerHTML = data.list.map(t => `<tr>
      <td class="user-name">${t.icon||''} ${t.title}</td>
      <td><span class="emotion-tag">${t.category_name||t.category}</span></td>
      <td><span style="font-size:12px;color:#999;">${t.category}</span></td>
      <td style="font-weight:500">${formatNum(t.view_count||0)}</td>
      <td style="font-weight:500">${formatNum(t.play_count||0)}</td>
      <td><span class="status-tag ${t.status==='published'?'active':'inactive'}"><span class="status-dot"></span>${t.status==='published'?'已发布':'草稿'}</span></td>
      <td><div class="action-btns">
        <button class="action-link" onclick="editEntTest('${t.id}')">编辑</button>
        <button class="action-link" style="color:var(--color-danger)" onclick="deleteEntTest('${t.id}','${t.title}')">删除</button>
      </div></td>
    </tr>`).join('');
    // 绑定新增按钮
    const addBtn = page.querySelector('.card-header .btn-primary');
    if (addBtn) addBtn.onclick = () => openEntTestModal();
    // 绑定筛选
    const filters = page.querySelectorAll('.table-filters select, .table-filters input');
    if (filters[0]) filters[0].onchange = e => { entFilter.category = e.target.value; loadEntertainmentData(); };
    if (filters[1]) filters[1].onchange = e => { entFilter.status = e.target.value; loadEntertainmentData(); };
  } catch (e) { console.error('加载娱乐数据失败:', e); }
}

function openEntTestModal(test=null) {
  openModal(test ? '编辑娱乐测试' : '新增娱乐测试', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <label>标题 <input id="et_title" value="${test?escapeHtml(test.title):''}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>分类代码 <input id="et_cat" value="${test?escapeHtml(test.category):''}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;" placeholder="如 face_reading, tarot, zodiac"></label>
      <label>分类名称 <input id="et_catname" value="${test?escapeHtml(test.category_name):''}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;" placeholder="如 面相看相"></label>
      <label>图标 <input id="et_icon" value="${test?test.icon||'🔮':''}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>描述 <textarea id="et_desc" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;min-height:60px;">${test?escapeHtml(test.description||''):''}</textarea></label>
      <label>排序 <input id="et_sort" type="number" value="${test?test.sort_order||0:0}" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;"></label>
      <label>状态 <select id="et_status" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;">
        <option value="published" ${test&&test.status==='published'?'selected':''}>已发布</option>
        <option value="draft" ${test&&test.status==='draft'?'selected':''}>草稿</option>
      </select></label>
    </div>
  `, `<button class="btn btn-ghost btn-sm" onclick="closeModal()">取消</button><button class="btn btn-primary btn-sm" onclick="saveEntTest('${test?test.id:''}')">保存</button>`);
}

async function saveEntTest(id) {
  const body = { title: document.getElementById('et_title').value, category: document.getElementById('et_cat').value, category_name: document.getElementById('et_catname').value, icon: document.getElementById('et_icon').value, description: document.getElementById('et_desc').value, sort_order: parseInt(document.getElementById('et_sort').value)||0, status: document.getElementById('et_status').value };
  try {
    if (id) { await apiFetch('/api/v1/admin/entertainment-tests/'+id, 'PUT', body); }
    else { await apiFetch('/api/v1/admin/entertainment-tests', 'POST', body); }
    closeModal(); toast('娱乐测试已保存'); loadEntertainmentData();
  } catch (e) { toast('保存失败: '+e.message, 'error'); }
}

async function editEntTest(id) {
  entEditorId = id;
  switchPage('entertainment-editor');
}

async function deleteEntTest(id, title) {
  if (!confirm(`确定删除"${title}"？`)) return;
  try { await apiFetch('/api/v1/admin/entertainment-tests/'+id, 'DELETE'); toast('已删除'); loadEntertainmentData(); }
  catch (e) { toast('删除失败: '+e.message, 'error'); }
}

// ==================== 6. 娱乐内容编辑 ====================
let entEditorId = null;
let entEditorData = null;

async function loadEntEditorData() {
  const page = document.getElementById('page-entertainment-editor');
  if (!page) return;
  try {
    const data = await apiFetch('/api/v1/admin/entertainment-tests?limit=200');
    const list = data.list || data;
    // 在下拉里加载已有的娱乐内容列表
    const sidebar = page.querySelector('.editor-sidebar');
    const existing = document.getElementById('entContentSelect');
    if (existing) existing.remove();
    const selHtml = `<div class="editor-field" id="entContentSelectWrap">
      <label class="editor-label">选择要编辑的内容</label>
      <select id="entContentSelect" onchange="onEntContentSelect()" class="editor-select">
        <option value="">--- 请选择 ---</option>
        ${list.map(t => `<option value="${t.id}">${escapeHtml(t.title)} [${escapeHtml(t.category_name||'')}]</option>`).join('')}
      </select></div>`;
    sidebar.insertAdjacentHTML('afterbegin', selHtml);
    if (entEditorId) {
      const sel = document.getElementById('entContentSelect');
      if (sel) { sel.value = entEditorId; loadEntContentDetail(entEditorId); }
    }
  } catch (e) { console.error(e); }
}

function onEntContentSelect() {
  const id = document.getElementById('entContentSelect').value;
  if (id) { entEditorId = id; loadEntContentDetail(id); }
  else { entEditorId = null; clearEntEditorForm(); }
}

async function loadEntContentDetail(id) {
  try {
    const item = await apiFetch('/api/v1/admin/entertainment-tests/' + id);
    entEditorData = item;
    // 填充左侧表单
    document.getElementById('eeTitle').value = item.title || '';
    document.getElementById('eeCategory').value = item.category || '';
    document.getElementById('eeCatName').value = item.category_name || '';
    document.getElementById('eeIcon').value = item.icon || '';
    document.getElementById('eeType').value = item.test_type || 'quiz';
    document.getElementById('eeSort').value = item.sort_order ?? 0;
    document.getElementById('eeStatus').value = item.status || 'published';
    document.getElementById('eeTags').value = item.tags || '';
    document.getElementById('eeCover').value = item.cover_image || '';
    document.getElementById('eeDesc').value = item.description || '';
    document.getElementById('eeContent').value = item.content || '';
    // 渲染结果项
    renderEntResults(item.results_json);
  } catch (e) { console.error('加载娱乐内容详情失败:', e); toast('加载失败', 'error'); }
}

function clearEntEditorForm() {
  ['eeTitle','eeCategory','eeCatName','eeIcon','eeType','eeSort','eeStatus','eeTags','eeCover','eeDesc','eeContent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'eeSort') el.value = '0';
      else if (id === 'eeType') el.value = 'quiz';
      else if (id === 'eeStatus') el.value = 'published';
      else el.value = '';
    }
  });
  document.getElementById('eeResults').innerHTML = '';
}

function renderEntResults(resultsJson) {
  const container = document.getElementById('eeResults');
  if (!container) return;
  let list = [];
  try { list = typeof resultsJson === 'string' ? JSON.parse(resultsJson || '[]') : (resultsJson || []); } catch (e) {}
  if (!Array.isArray(list)) list = [];
  if (list.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = list.map((r, i) => `
    <div class="ent-result-row" style="margin-bottom:12px;padding:12px;background:var(--color-surface-warm);border-radius:8px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="text" class="er-type" value="${escapeHtml(r.type||'')}" placeholder="结果类型（如 A/B/C 或 分数值）" style="flex:1;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <input type="text" class="er-label" value="${escapeHtml(r.label||'')}" placeholder="结果标签" style="flex:2;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px;" onclick="this.closest('.ent-result-row').remove()">✕</button>
      </div>
      <textarea class="er-desc" placeholder="结果描述文案" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;min-height:60px;resize:vertical;">${escapeHtml(r.description||'')}</textarea>
    </div>
  `).join('');
}

function addEntResult() {
  const container = document.getElementById('eeResults');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'ent-result-row';
  div.style.cssText = 'margin-bottom:12px;padding:12px;background:var(--color-surface-warm);border-radius:8px;';
  div.innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
    <input type="text" class="er-type" placeholder="结果类型（如 A/B/C 或 分数值）" style="flex:1;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
    <input type="text" class="er-label" placeholder="结果标签" style="flex:2;padding:6px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;">
    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px;" onclick="this.closest('.ent-result-row').remove()">✕</button>
  </div>
  <textarea class="er-desc" placeholder="结果描述文案" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:6px;font-size:13px;min-height:60px;resize:vertical;"></textarea>`;
  container.appendChild(div);
  div.querySelector('input').focus();
}

function getEntResultsFromDOM() {
  const rows = document.querySelectorAll('#eeResults .ent-result-row');
  return Array.from(rows).map(row => ({
    type: row.querySelector('.er-type').value,
    label: row.querySelector('.er-label').value,
    description: row.querySelector('.er-desc').value
  })).filter(r => r.type || r.label);
}

async function saveEntContent() {
  if (!entEditorId) { toast('请先在上方的下拉列表中选择一个内容', 'error'); return; }
  const body = {
    title: document.getElementById('eeTitle').value,
    category: document.getElementById('eeCategory').value,
    category_name: document.getElementById('eeCatName').value,
    icon: document.getElementById('eeIcon').value,
    test_type: document.getElementById('eeType').value,
    sort_order: parseInt(document.getElementById('eeSort').value) || 0,
    status: document.getElementById('eeStatus').value,
    tags: document.getElementById('eeTags').value,
    cover_image: document.getElementById('eeCover').value,
    description: document.getElementById('eeDesc').value,
    content: document.getElementById('eeContent').value,
    results_json: getEntResultsFromDOM()
  };
  try {
    await apiFetch('/api/v1/admin/entertainment-tests/' + entEditorId, 'PUT', body);
    toast('娱乐内容已保存');
  } catch (e) { toast('保存失败: ' + e.message, 'error'); }
}

async function deleteEntContent() {
  if (!entEditorId) return;
  const name = document.getElementById('eeTitle')?.value || '当前内容';
  if (!confirm(`确定删除"${name}"？`)) return;
  try {
    await apiFetch('/api/v1/admin/entertainment-tests/' + entEditorId, 'DELETE');
    toast('已删除'); entEditorId = null; entEditorData = null;
    clearEntEditorForm(); loadEntEditorData();
  } catch (e) { toast('删除失败: ' + e.message, 'error'); }
}

// ==================== 7. 树洞审核 ====================
async function loadTreeholeData() {
  try {
    const entries = await apiFetch('/api/v1/admin/treehole');
    const page = document.getElementById('page-treehole');
    if (!page || !entries) return;
    const existingCards = page.querySelectorAll('.review-card');
    existingCards.forEach(c => c.remove());
    const toolbar = page.querySelector('.table-toolbar');
    const container = document.createElement('div');
    container.innerHTML = entries.map(e => `<div class="review-card" style="${e.mood==='绝望'||e.content.includes('自伤')?'border:2px solid #FF8A65;background:#FFF5F0;':''}">
      <div class="review-header">
        <div class="review-anonymous"><div class="anonymous-mask">👤</div>
          <div><strong>${(e.nickname||'匿名用户')}</strong><div class="review-meta">${e.created_at?e.created_at.slice(0,16):''}</div></div>
        </div>
        <span class="review-tag" style="background:${e.review_status==='pending'?'var(--color-warning-bg)':e.review_status==='approved'?'var(--color-success-bg)':'#FFEBEE'};color:${e.review_status==='pending'?'#F57F17':e.review_status==='approved'?'#2E7D32':'#C62828'}">${e.review_status==='pending'?'待审核':e.review_status==='approved'?'已通过':'已拒绝'}</span>
      </div>
      <div class="review-body"><b>心情：</b>${e.mood||'---'} | ${e.mood_intensity?`强度：${e.mood_intensity}/10`:'---'}<br>${(e.content||'').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
      ${e.mood==='绝望'||e.content.includes('自伤')?'<div style="font-size:12px;color:#C62828;font-weight:600;">⚠ 高风险内容 - 含自伤意念/绝望情绪</div>':''}
      <div class="review-actions">
        ${e.review_status==='pending'?`
          <button class="btn btn-primary btn-sm" onclick="approveTreehole('${e.id}')">✓ 通过</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="rejectTreehole('${e.id}')">✕ 拒绝</button>
        `:''}
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="deleteTreehole('${e.id}')">删除</button>
      </div>
    </div>`).join('');
    if (toolbar) toolbar.after(container);
    // 绑定批量操作
    const batchBtns = page.querySelectorAll('.table-toolbar .btn');
    if (batchBtns[0]) batchBtns[0].onclick = () => batchTreehole('approve');
    if (batchBtns[1]) batchBtns[1].onclick = () => batchTreehole('reject');
  } catch (e) { console.error('加载树洞失败:', e); }
}

async function approveTreehole(id) { try { await apiFetch('/api/v1/admin/treehole/'+id+'/approve','PUT'); toast('已通过'); loadTreeholeData(); } catch(e) { toast(e.message,'error'); } }
async function rejectTreehole(id) { try { await apiFetch('/api/v1/admin/treehole/'+id+'/reject','PUT'); toast('已拒绝'); loadTreeholeData(); } catch(e) { toast(e.message,'error'); } }
async function deleteTreehole(id) { if (!confirm('确认删除？')) return; try { await apiFetch('/api/v1/admin/treehole/'+id,'DELETE'); toast('已删除'); loadTreeholeData(); } catch(e) { toast(e.message,'error'); } }
function batchTreehole(action) { toast(`批量${action==='approve'?'通过':'拒绝'}暂需逐项操作`); }

// ==================== 8. 危机预警 ====================
async function loadCrisisData() {
  try {
    const users = await apiFetch('/api/v1/admin/crisis');
    const page = document.getElementById('page-crisis');
    if (!page) return;
    const alertList = page.querySelector('.alert-list');
    if (!alertList) return;
    if (!users || users.length === 0) {
      alertList.innerHTML = '<li class="alert-item" style="justify-content:center;padding:48px;"><div class="alert-content"><div class="alert-title" style="text-align:center;color:var(--color-text-tertiary);">🎉 当前无高危预警用户</div></div></li>';
      return;
    }
    alertList.innerHTML = users.map(u => `<li class="alert-item">
      <span class="alert-level high"></span>
      <div class="alert-content">
        <div class="alert-title">【高危】${u.nickname||'匿名用户'} — 压力指数: ${u.stress_level||'---'} | 情绪稳定性: ${u.emotional_stability||'---'}</div>
        <div class="alert-desc">人格类型: ${u.personality_type||'未评估'} | 当前心情: ${u.current_mood||'---'} | 总测评: ${u.total_assessments||0}次</div>
        <div class="alert-meta"><span class="alert-time">${u.updated_at?u.updated_at.slice(0,16):'---'}</span><span class="alert-user">手机: ${u.phone||'无'}</span><span class="alert-status pending">待处理</span></div>
      </div>
    </li>`).join('');
    const urgentNum = page.querySelector('.crisis-stat.urgent .crisis-stat-num');
    if (urgentNum) urgentNum.textContent = users.length;
  } catch (e) { console.error('加载危机预警失败:', e); }
}

// ==================== 9. 操作日志 ====================
async function loadLogsData() {
  try {
    const result = await apiFetch('/api/v1/admin/logs?limit=100');
    const logs = result.list || result;
    const list = document.querySelector('#page-logs .card-body');
    if (!list || !logs) return;
    const actionColors = { create: 'create', update: 'update', delete: 'delete', login: 'create', alert: 'delete' };
    list.innerHTML = logs.map(l => `<div class="log-item">
      <div class="log-time-col">${l.created_at?l.created_at.slice(0,19):''}</div>
      <div class="log-operator">${l.operator||'系统'}</div>
      <div class="log-action-col"><span class="log-type ${actionColors[l.action]||'update'}">${l.action||'操作'}</span> ${l.detail||l.target||''}</div>
    </div>`).join('');
    const pageInfo = document.querySelector('#page-logs .pagination-info');
    if (pageInfo) pageInfo.textContent = `共 ${result.total||logs.length} 条记录`;
  } catch (e) { console.error('加载日志失败:', e); }
}

// ==================== 10. AI Agent 配置 ====================
async function loadAgentsData() {
  try {
    const agents = await apiFetch('/api/v1/admin/agents');
    const page = document.getElementById('page-ai-agents');
    if (!page) return;
    const modelOptions = await apiFetch('/api/v1/admin/ai-models').catch(() => []);
    // 找到agent卡片容器并更新
    const agentCards = page.querySelectorAll('.agent-card, [class*="agent"]');
    if (agentCards.length >= agents.length) {
      agents.forEach((a,i) => {
        const card = agentCards[i];
        if (!card) return;
        // 更新名称
        const nameEl = card.querySelector('h3, .agent-name, strong');
        if (nameEl) nameEl.textContent = a.name;
        // 添加模型选择
        const modelArea = card.querySelector('.ai-config-row, [class*="config"], [class*="settings"]');
        if (modelArea && !card.querySelector('.model-select')) {
          const modelHtml = `<div class="model-select" style="margin-top:8px;display:flex;gap:8px;align-items:center;"><label style="font-size:12px;">AI模型：</label>
            <select onchange="updateAgentModel('${a.id}',this.value)" style="padding:6px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;">
            ${Array.isArray(modelOptions) ? modelOptions.map(m => `<option value="${m.model_name}" ${a.model_name===m.model_name?'selected':''}>${m.display_name} ${m.is_active?'':'(未启用)'}</option>`).join('') : ''}
            </select></div>`;
          modelArea.insertAdjacentHTML('beforebegin', modelHtml);
        }
        // 更新保存按钮
        const saveBtn = card.querySelector('.btn-primary, button');
        if (saveBtn && !saveBtn.getAttribute('data-agent-id')) {
          saveBtn.setAttribute('data-agent-id', a.id);
          saveBtn.onclick = () => saveAgent(a.id);
        }
        const testBtn = card.querySelectorAll('button')[2];
        if (testBtn && !testBtn.getAttribute('data-agent-id')) {
          testBtn.setAttribute('data-agent-id', a.id);
          testBtn.onclick = () => toast(`Agent "${a.name}" 对话测试需在用户端进行`, 'success');
        }
      });
    }
  } catch (e) { console.error('加载Agent失败:', e); }
}

async function updateAgentModel(agentId, modelName) {
  try { await apiFetch('/api/v1/admin/agents/'+agentId, 'PUT', { model_name: modelName }); toast('模型已切换'); }
  catch (e) { toast('切换失败: '+e.message, 'error'); }
}

async function saveAgent(id) {
  const card = event.target.closest('.agent-card, [class*="agent"]');
  if (!card) return;
  try {
    const sliders = card.querySelectorAll('input[type="range"]');
    const body = {};
    if (sliders.length >= 1) body.temperature = parseFloat(sliders[0].value)/100 || 0.7;
    if (sliders.length >= 2) body.max_length = parseInt(sliders[1].value) || 400;
    if (sliders.length >= 3) body.care_frequency = parseInt(sliders[2].value) || 3;
    if (sliders.length >= 4) body.crisis_threshold = parseInt(sliders[3].value) || 7;
    const nameInput = card.querySelector('input[type="text"]');
    if (nameInput) body.name = nameInput.value;
    await apiFetch('/api/v1/admin/agents/'+id, 'PUT', body);
    toast('Agent配置已保存');
  } catch (e) { toast('保存失败: '+e.message, 'error'); }
}

// ==================== 11. AI 分析中心 ====================
async function loadAIStatusData() {
  try {
    const data = await apiFetch('/api/v1/admin/ai-status');
    const page = document.getElementById('page-ai-analysis');
    if (!page || !data) return;
    // 更新服务状态
    const statusRows = page.querySelectorAll('.card-body > div > div');
    if (data.services && statusRows.length) {
      data.services.forEach((svc,i) => {
        const row = statusRows[i];
        if (!row) return;
        const dot = row.querySelector('[style*="border-radius:50%"]');
        if (dot) dot.style.background = svc.status === 'online' ? 'var(--color-success)' : (svc.status === 'training' ? 'var(--color-warning)' : '#ccc');
        const statusText = row.querySelector('span:last-child');
        if (statusText) {
          statusText.textContent = svc.description || (svc.status === 'online' ? '正常' : '离线');
          statusText.style.color = svc.status === 'online' ? 'var(--color-success)' : '#999';
        }
      });
    }
    // 更新统计
    const statValues = page.querySelectorAll('.dashboard-grid .stat-value');
    if (statValues.length >= 4 && data.stats) {
      statValues[0].textContent = formatNum(data.stats.reportGenerated);
      statValues[1].textContent = Math.round(data.stats.tokensUsed/1000) + 'K';
      statValues[2].textContent = data.stats.crisisDetected;
      statValues[3].textContent = data.stats.avgResponse + 's';
    }
    // 刷新示例按钮
    const refreshBtns = page.querySelectorAll('button');
    refreshBtns.forEach(b => { if (b.textContent.includes('刷新示例')) b.onclick = () => generateReportPreview(); });
  } catch (e) { console.error('加载AI状态失败:', e); }
}

async function generateReportPreview() {
  const page = document.getElementById('page-ai-analysis');
  try {
    const data = await apiFetch('/api/v1/admin/ai-report/preview', 'POST', { nickname: '李可', scale_name: '焦虑自评量表', total_score: 56, category: 'emotion' });
    const previewContent = page.querySelector('.ai-preview-content');
    if (previewContent) previewContent.innerHTML = data.report.replace(/\n/g, '<br>');
  } catch (e) { toast('生成预览失败', 'error'); }
}

// ==================== 12. 系统设置 ====================
async function saveAllSettings() {
  const page = document.getElementById('page-settings');
  if (!page) return;
  const inputs = Array.from(page.querySelectorAll('input[type="text"]')).filter((inp) => !inp.id.startsWith('setSms'));
  const toggles = page.querySelectorAll('.toggle-switch');
  const settings = {};
  const settingKeys = ['platform_name','daily_limit','onboarding','anon_default','crisis_push','daily_report','treehole_alert','feedback','sensitive_filter','crisis_auto','data_encrypt'];
  inputs.forEach((inp,i) => { if (settingKeys[i]) settings[settingKeys[i]] = inp.value; });
  toggles.forEach((t,i) => { if (settingKeys[inputs.length+i]) settings[settingKeys[inputs.length+i]] = t.classList.contains('on') ? '1' : '0'; });
  try { await apiFetch('/api/v1/admin/settings/batch', 'PUT', { settings }); toast('所有设置已保存'); }
  catch (e) { toast('保存失败: '+e.message, 'error'); }
}

// ==================== 短信配置 ====================
async function loadSmsSettings() {
  try {
    const configs = await apiFetch('/api/v1/admin/settings');
    const smsKeys = ['sms_secret_id','sms_secret_key','sms_sdk_app_id','sms_sign_name','sms_template_id'];
    const idMap = {
      'sms_secret_id': 'setSmsSecretId',
      'sms_secret_key': 'setSmsSecretKey',
      'sms_sdk_app_id': 'setSmsSdkAppId',
      'sms_sign_name': 'setSmsSignName',
      'sms_template_id': 'setSmsTemplateId',
    };
    let hasConfig = false;
    configs.forEach((c) => {
      if (smsKeys.includes(c.config_key)) {
        const el = document.getElementById(idMap[c.config_key]);
        if (el && c.config_value) { el.value = c.config_value; hasConfig = true; }
      }
    });
    const badge = document.getElementById('smsStatusBadge');
    const desc = document.getElementById('smsStatusDesc');
    if (badge && desc) {
      if (hasConfig) {
        badge.style.background = 'var(--color-success-bg)';
        badge.style.color = 'var(--color-success)';
        badge.textContent = '已配置';
        desc.textContent = '腾讯云短信已启用，用户将收到真实短信验证码';
      } else {
        badge.textContent = '模拟模式';
        desc.textContent = '配置后自动启用腾讯云真实验证码发送，未配置时使用模拟模式';
      }
    }
  } catch (e) { /* 忽略 */ }
}

async function saveSmsSettings() {
  const smsKeys = ['sms_secret_id','sms_secret_key','sms_sdk_app_id','sms_sign_name','sms_template_id'];
  const idMap = {
    'sms_secret_id': 'setSmsSecretId',
    'sms_secret_key': 'setSmsSecretKey',
    'sms_sdk_app_id': 'setSmsSdkAppId',
    'sms_sign_name': 'setSmsSignName',
    'sms_template_id': 'setSmsTemplateId',
  };
  const settings = {};
  for (const key of smsKeys) {
    const el = document.getElementById(idMap[key]);
    if (el) settings[key] = el.value.trim();
  }
  try {
    await apiFetch('/api/v1/admin/settings/batch', 'PUT', { settings });
    toast('短信配置已保存');
    loadSmsSettings(); // 刷新状态显示
  } catch (e) { toast('保存失败: ' + e.message, 'error'); }
}

// ========== 退出登录 ==========
function adminLogout() {
  authToken = ''; currentUser = null; localStorage.removeItem('liaoran_admin_token');
  document.getElementById('loginOverlay').style.display = 'flex';
}

// ========== 辅助 ==========
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function debounce(fn, delay) { let t; return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); }; }

// 滑块联动
document.querySelectorAll('.config-slider').forEach(slider => {
  slider.addEventListener('input', function() {
    const val = this.value;
    const disp = this.parentElement.querySelector('.slider-value');
    if (disp) {
      if (this.max === '100' && this.min === '0') disp.textContent = (val/100).toFixed(2);
      else if (this.max === '10') disp.textContent = val + '/10';
      else if (this.max === '14') disp.textContent = '每' + val + '天';
      else disp.textContent = val;
    }
  });
});

// 图表入场动画
setTimeout(() => {
  const bars = document.querySelectorAll('.chart-bar');
  bars.forEach((bar,i) => {
    const h = bar.style.height;
    bar.style.height = '0%';
    setTimeout(() => { bar.style.height = h; }, i * 80);
  });
}, 300);

// ========== 全局搜索 ==========
setTimeout(() => {
  const gs = document.getElementById('globalSearch');
  if (gs) {
    gs.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = gs.value.trim();
        const currentPage = document.querySelector('.page.active')?.id;
        if (currentPage === 'page-users') { usersFilter.search = val; usersFilter.page = 1; loadUsersData(); }
        else if (currentPage === 'page-assessments') { assessFilter.search = val; loadAssessmentsData(); }
        else if (currentPage === 'page-entertainment') { entFilter.search = val; loadEntertainmentData(); }
        else { toast('请在对应页面使用搜索'); }
      }
    });
  }
}, 300);

// ========== 通知铃铛 ==========
let notifyOpen = false;
function toggleNotifyPanel() {
  notifyOpen = !notifyOpen;
  const panel = document.getElementById('notifyPanel');
  if (panel) panel.style.display = notifyOpen ? 'block' : 'none';
  if (notifyOpen) loadNotifications();
}

async function loadNotifications() {
  try {
    const data = await apiFetch('/api/v1/admin/notifications');
    const list = document.getElementById('notifyList');
    const dot = document.getElementById('notifyDot');
    if (dot) dot.style.display = (data.unread > 0) ? 'block' : 'none';
    if (!list) return;
    if (!data.list || data.list.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">暂无通知</div>';
      return;
    }
    list.innerHTML = data.list.map(n => `
      <div style="padding:10px 16px;border-bottom:1px solid #f5f5f5;cursor:pointer;${n.is_read?'':'background:#FFF8F0;'}" onclick="readNotify('${n.id}')">
        <div style="font-weight:600;font-size:13px;color:var(--color-text-primary);">${escapeHtml(n.title)}</div>
        <div style="font-size:12px;color:#999;margin-top:2px;">${escapeHtml(n.content||'')}</div>
        <div style="font-size:11px;color:#bbb;margin-top:2px;">${n.created_at?n.created_at.slice(0,16):''}</div>
      </div>`).join('');
  } catch (e) { console.error('加载通知失败', e); }
}

async function markAllNotifyRead() {
  try { await apiFetch('/api/v1/admin/notifications/read-all', 'PUT'); loadNotifications(); }
  catch (e) { toast('操作失败', 'error'); }
}

async function readNotify(id) {
  try { await apiFetch('/api/v1/admin/notifications/' + id + '/read', 'PUT'); loadNotifications(); }
  catch (e) { console.error(e); }
}

// 点击页面其他地方关闭通知面板
document.addEventListener('click', e => {
  const panel = document.getElementById('notifyPanel');
  const btn = document.getElementById('notifyBtn');
  if (notifyOpen && panel && !panel.contains(e.target) && !btn.contains(e.target)) {
    notifyOpen = false; panel.style.display = 'none';
  }
});

// 绑定系统设置保存按钮
setTimeout(() => {
  const settingsPage = document.getElementById('page-settings');
  if (settingsPage) {
    const resetBtn = settingsPage.querySelector('.btn-ghost');
    if (resetBtn) resetBtn.onclick = () => toast('重置需重新加载页面');
    loadSmsSettings();
  }
}, 600);