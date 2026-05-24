// =========================================
// Resume Builder - 核心应用逻辑
// =========================================

const STORAGE_KEY = 'resume_builder_v1';

// 默认数据结构
const defaultData = {
  basic: {
    name: '', nameEn: '', phone: '', email: '', location: '',
    website: '', photo: '', schoolBadge: ''
  },
  educations: [],
  internships: [],
  projects: [],
  activities: [],
  summary: {
    keywords: '',
    skills: { dataAnalysis: '', productTools: '', other: '', hobby: '' }
  },
  selected: {
    basic: true,
    education: [], internship: [], project: [], activity: [], summary: true
  },
  jd: { title: '', content: '' },
  layout: {
    margin: 'normal',      // narrow | normal | wide
    fontSize: 10.5,        // pt
    lineHeight: 1.6,
    sectionStyle: 'bar'    // bar | line | plain
  }
};

// 边距预设（mm）
const MARGIN_PRESETS = {
  narrow: { v: 12, h: 14 },
  normal: { v: 18, h: 20 },
  wide:   { v: 25, h: 28 }
};

// ========== 状态 ==========
let data = loadData();
let currentTab = 'basic';

// ========== 持久化 ==========
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // merge with default to handle schema additions
      return { ...defaultData, ...parsed, 
        basic: { ...defaultData.basic, ...(parsed.basic || {}) },
        summary: { ...defaultData.summary, ...(parsed.summary || {}),
          skills: { ...defaultData.summary.skills, ...((parsed.summary || {}).skills || {}) }
        },
        selected: { ...defaultData.selected, ...(parsed.selected || {}) },
        jd: { ...defaultData.jd, ...(parsed.jd || {}) },
        layout: { ...defaultData.layout, ...(parsed.layout || {}) }
      };
    }
  } catch(e) { console.error('load error', e); }
  return JSON.parse(JSON.stringify(defaultData));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  flashSaveIndicator();
}

let saveTimer = null;
function flashSaveIndicator() {
  const btn = document.getElementById('save-btn');
  btn.textContent = '✓ 已保存';
  btn.style.color = '#16a34a';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    btn.textContent = '手动保存';
    btn.style.color = '';
  }, 1200);
}

// auto-save on change (debounced)
let autoSaveTimer = null;
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveData, 600);
}

// ========== ID 生成 ==========
function newId() { return 'id_' + Math.random().toString(36).slice(2, 10); }

// ========== 字段构造 ==========
function field(label, value, onInput, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-3';
  const lbl = document.createElement('label');
  lbl.className = 'field-label';
  lbl.textContent = label;
  wrap.appendChild(lbl);
  const input = opts.textarea ? document.createElement('textarea') : document.createElement('input');
  input.className = 'field-input' + (opts.textarea ? ' field-textarea' : '');
  if (!opts.textarea) input.type = opts.type || 'text';
  input.value = value || '';
  if (opts.placeholder) input.placeholder = opts.placeholder;
  input.addEventListener('input', e => {
    onInput(e.target.value);
    scheduleAutoSave();
    renderPreview();
    renderModulePanel();
  });
  wrap.appendChild(input);
  return wrap;
}

// ========== 列表项卡片（教育/实习/项目/活动） ==========
function itemCard(item, idx, listKey, fields, sectionLabel) {
  const card = document.createElement('div');
  card.className = 'border border-neutral-200 rounded-lg p-3 mb-3 bg-white';
  
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-2';
  const title = document.createElement('div');
  title.className = 'text-xs font-semibold text-neutral-500';
  title.textContent = `${sectionLabel} #${idx + 1}`;
  header.appendChild(title);
  const del = document.createElement('button');
  del.className = 'btn-danger';
  del.textContent = '删除';
  del.onclick = () => {
    if (confirm('确定删除这条记录？')) {
      data[listKey].splice(idx, 1);
      // also remove from selected
      data.selected[listKey.replace(/s$/, '')] = data.selected[listKey.replace(/s$/, '')].filter(id => id !== item.id);
      saveData();
      renderEdit();
      renderModulePanel();
      renderPreview();
    }
  };
  header.appendChild(del);
  card.appendChild(header);
  
  fields.forEach(f => {
    card.appendChild(field(f.label, item[f.key], v => { item[f.key] = v; }, f.opts || {}));
  });
  
  // 子条目（bullet points）管理
  if (item.bullets !== undefined) {
    const bulletsWrap = document.createElement('div');
    bulletsWrap.className = 'mt-2';
    const blbl = document.createElement('div');
    blbl.className = 'field-label flex items-center justify-between';
    blbl.innerHTML = '<span>具体描述（每条 1 个要点）</span>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary text-[11px] py-0.5 px-2';
    addBtn.textContent = '+ 添加要点';
    addBtn.onclick = () => {
      item.bullets.push({ id: newId(), title: '', detail: '' });
      saveData();
      renderEdit();
    };
    blbl.appendChild(addBtn);
    bulletsWrap.appendChild(blbl);
    
    item.bullets.forEach((b, bidx) => {
      const brow = document.createElement('div');
      brow.className = 'border-l-2 border-blue-200 pl-3 mb-2';
      
      const bhead = document.createElement('div');
      bhead.className = 'flex items-center justify-between mb-1';
      const bt = document.createElement('span');
      bt.className = 'text-[11px] text-neutral-400';
      bt.textContent = `要点 ${bidx + 1}`;
      bhead.appendChild(bt);
      const bdel = document.createElement('button');
      bdel.className = 'btn-danger text-[10px]';
      bdel.textContent = '× 移除';
      bdel.onclick = () => {
        item.bullets.splice(bidx, 1);
        saveData();
        renderEdit();
        renderPreview();
      };
      bhead.appendChild(bdel);
      brow.appendChild(bhead);
      
      brow.appendChild(field('小标题（如"数据分析"）', b.title, v => b.title = v, { placeholder: '可选' }));
      brow.appendChild(field('详细描述', b.detail, v => b.detail = v, { textarea: true }));
      bulletsWrap.appendChild(brow);
    });
    card.appendChild(bulletsWrap);
  }
  
  return card;
}

// ========== 渲染左侧编辑区 ==========
function renderEdit() {
  const area = document.getElementById('edit-area');
  area.innerHTML = '';
  
  if (currentTab === 'basic') {
    const b = data.basic;
    area.appendChild(field('姓名（中文）', b.name, v => b.name = v, { placeholder: '王彦兮' }));
    area.appendChild(field('英文名/拼音', b.nameEn, v => b.nameEn = v, { placeholder: 'Yesy' }));
    area.appendChild(field('电话', b.phone, v => b.phone = v));
    area.appendChild(field('邮箱', b.email, v => b.email = v));
    area.appendChild(field('所在地', b.location, v => b.location = v, { placeholder: 'Philadelphia' }));
    area.appendChild(field('个人主页/作品集', b.website, v => b.website = v));
    
    // 头像上传（带裁剪）
    const photoWrap = document.createElement('div');
    photoWrap.className = 'mb-3';
    photoWrap.innerHTML = '<label class="field-label">个人头像（建议 3:4 证件照比例）</label>';
    const photoRow = document.createElement('div');
    photoRow.className = 'flex items-center gap-3';
    if (b.photo) {
      const img = document.createElement('img');
      img.src = b.photo;
      img.style.cssText = 'width: 60px; height: 80px; object-fit: contain; background: #f5f5f4;';
      img.className = 'rounded border border-neutral-200';
      photoRow.appendChild(img);
    }
    const photoBtn = document.createElement('label');
    photoBtn.className = 'btn-secondary cursor-pointer';
    photoBtn.textContent = b.photo ? '重新上传' : '上传头像';
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.accept = 'image/*';
    photoInput.className = 'hidden';
    photoInput.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const cropped = await openCropper(reader.result, {
          title: '裁剪个人头像',
          ratios: [
            { label: '3:4 证件照', value: 3/4 },
            { label: '1:1 方形', value: 1 },
            { label: '4:5', value: 4/5 },
            { label: '自由', value: null }
          ],
          defaultRatio: 3/4,
          hint: '推荐 3:4，与简历显示比例一致'
        });
        if (cropped) {
          b.photo = cropped;
          saveData();
          renderEdit();
          renderPreview();
        }
        photoInput.value = ''; // reset so same file can be picked again
      };
      reader.readAsDataURL(file);
    };
    photoBtn.appendChild(photoInput);
    photoRow.appendChild(photoBtn);
    if (b.photo) {
      // 重新裁剪按钮：用现存图重新走裁剪
      const recropBtn = document.createElement('button');
      recropBtn.className = 'btn-secondary';
      recropBtn.textContent = '重新裁剪';
      recropBtn.onclick = async () => {
        const cropped = await openCropper(b.photo, {
          title: '重新裁剪个人头像',
          ratios: [
            { label: '3:4 证件照', value: 3/4 },
            { label: '1:1 方形', value: 1 },
            { label: '4:5', value: 4/5 },
            { label: '自由', value: null }
          ],
          defaultRatio: 3/4
        });
        if (cropped) {
          b.photo = cropped;
          saveData();
          renderEdit();
          renderPreview();
        }
      };
      photoRow.appendChild(recropBtn);
      const clr = document.createElement('button');
      clr.className = 'btn-danger';
      clr.textContent = '移除';
      clr.onclick = () => { b.photo = ''; saveData(); renderEdit(); renderPreview(); };
      photoRow.appendChild(clr);
    }
    photoWrap.appendChild(photoRow);
    area.appendChild(photoWrap);
    
    // 校徽（带裁剪）
    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'mb-3';
    badgeWrap.innerHTML = '<label class="field-label">校徽（显示在右上角）</label>';
    const badgeRow = document.createElement('div');
    badgeRow.className = 'flex items-center gap-3';
    if (b.schoolBadge) {
      const img = document.createElement('img');
      img.src = b.schoolBadge;
      img.style.cssText = 'width: 60px; height: 60px; object-fit: contain; background: #f5f5f4;';
      img.className = 'border border-neutral-200 rounded';
      badgeRow.appendChild(img);
    }
    const badgeBtn = document.createElement('label');
    badgeBtn.className = 'btn-secondary cursor-pointer';
    badgeBtn.textContent = b.schoolBadge ? '重新上传' : '上传校徽';
    const badgeInput = document.createElement('input');
    badgeInput.type = 'file';
    badgeInput.accept = 'image/*';
    badgeInput.className = 'hidden';
    badgeInput.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const cropped = await openCropper(reader.result, {
          title: '裁剪校徽',
          ratios: [
            { label: '1:1 方形', value: 1 },
            { label: '自由', value: null }
          ],
          defaultRatio: 1,
          hint: '推荐 1:1，校徽通常是方形'
        });
        if (cropped) {
          b.schoolBadge = cropped;
          saveData();
          renderEdit();
          renderPreview();
        }
        badgeInput.value = '';
      };
      reader.readAsDataURL(file);
    };
    badgeBtn.appendChild(badgeInput);
    badgeRow.appendChild(badgeBtn);
    if (b.schoolBadge) {
      const recropBtn = document.createElement('button');
      recropBtn.className = 'btn-secondary';
      recropBtn.textContent = '重新裁剪';
      recropBtn.onclick = async () => {
        const cropped = await openCropper(b.schoolBadge, {
          title: '重新裁剪校徽',
          ratios: [
            { label: '1:1 方形', value: 1 },
            { label: '自由', value: null }
          ],
          defaultRatio: 1
        });
        if (cropped) {
          b.schoolBadge = cropped;
          saveData();
          renderEdit();
          renderPreview();
        }
      };
      badgeRow.appendChild(recropBtn);
      const clr = document.createElement('button');
      clr.className = 'btn-danger';
      clr.textContent = '移除';
      clr.onclick = () => { b.schoolBadge = ''; saveData(); renderEdit(); renderPreview(); };
      badgeRow.appendChild(clr);
    }
    badgeWrap.appendChild(badgeRow);
    area.appendChild(badgeWrap);
  }
  
  else if (currentTab === 'education') {
    const fields = [
      { key: 'school', label: '学校' },
      { key: 'degree', label: '学位/专业（如：硕士 行为决策数据科学）' },
      { key: 'mode', label: '形式（如：全日制）' },
      { key: 'startDate', label: '开始日期', opts: { placeholder: '2025.08' } },
      { key: 'endDate', label: '结束日期', opts: { placeholder: '2026.12 或 至今' } },
      { key: 'tag', label: '标签（如：USNEWS50、海外QS前100）' },
      { key: 'courses', label: '相关课程', opts: { textarea: true } }
    ];
    data.educations.forEach((item, idx) => {
      area.appendChild(itemCard(item, idx, 'educations', fields, '教育经历'));
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary w-full mt-2';
    addBtn.textContent = '+ 添加教育经历';
    addBtn.onclick = () => {
      data.educations.push({ id: newId(), school: '', degree: '', mode: '', startDate: '', endDate: '', tag: '', courses: '' });
      saveData();
      renderEdit();
      renderModulePanel();
    };
    area.appendChild(addBtn);
  }
  
  else if (currentTab === 'internship') {
    const fields = [
      { key: 'company', label: '公司名（如：百威投资(中国)有限公司）' },
      { key: 'role', label: '岗位（如：Digital Marketing Intern）' },
      { key: 'startDate', label: '开始日期', opts: { placeholder: '2023.05' } },
      { key: 'endDate', label: '结束日期', opts: { placeholder: '2023.09' } }
    ];
    data.internships.forEach((item, idx) => {
      if (!item.bullets) item.bullets = [];
      area.appendChild(itemCard(item, idx, 'internships', fields, '实习'));
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary w-full mt-2';
    addBtn.textContent = '+ 添加实习经历';
    addBtn.onclick = () => {
      data.internships.push({ id: newId(), company: '', role: '', startDate: '', endDate: '', bullets: [] });
      saveData();
      renderEdit();
      renderModulePanel();
    };
    area.appendChild(addBtn);
  }
  
  else if (currentTab === 'project') {
    const fields = [
      { key: 'name', label: '项目名（如：Tech4Pets Startup Consulting Team）' },
      { key: 'role', label: '角色（如：Project Leader）' },
      { key: 'startDate', label: '开始日期', opts: { placeholder: '2025.10' } },
      { key: 'endDate', label: '结束日期', opts: { placeholder: '至今' } },
      { key: 'link', label: '项目链接（可选）' }
    ];
    data.projects.forEach((item, idx) => {
      if (!item.bullets) item.bullets = [];
      area.appendChild(itemCard(item, idx, 'projects', fields, '项目'));
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary w-full mt-2';
    addBtn.textContent = '+ 添加项目经历';
    addBtn.onclick = () => {
      data.projects.push({ id: newId(), name: '', role: '', startDate: '', endDate: '', link: '', bullets: [] });
      saveData();
      renderEdit();
      renderModulePanel();
    };
    area.appendChild(addBtn);
  }
  
  else if (currentTab === 'activity') {
    const fields = [
      { key: 'org', label: '组织/活动名（如：普华永道校园大使）' },
      { key: 'role', label: '角色（如：Senior LEAPer Leader）' },
      { key: 'startDate', label: '开始日期' },
      { key: 'endDate', label: '结束日期' }
    ];
    data.activities.forEach((item, idx) => {
      if (!item.bullets) item.bullets = [];
      area.appendChild(itemCard(item, idx, 'activities', fields, '校园活动'));
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary w-full mt-2';
    addBtn.textContent = '+ 添加校园活动经历';
    addBtn.onclick = () => {
      data.activities.push({ id: newId(), org: '', role: '', startDate: '', endDate: '', bullets: [] });
      saveData();
      renderEdit();
      renderModulePanel();
    };
    area.appendChild(addBtn);
  }
  
  else if (currentTab === 'summary') {
    const s = data.summary;
    area.appendChild(field('关键词（如：跨快消/医药/咨询多领域实战 / 极强Ownership）', s.keywords, v => s.keywords = v, { textarea: true }));
    area.appendChild(field('数据分析技能', s.skills.dataAnalysis, v => s.skills.dataAnalysis = v, { textarea: true, placeholder: 'SQL、Python、Excel、Power BI...' }));
    area.appendChild(field('产品工具', s.skills.productTools, v => s.skills.productTools = v, { textarea: true, placeholder: 'PRD撰写、Figma、A/B测试...' }));
    area.appendChild(field('其他技能', s.skills.other, v => s.skills.other = v, { textarea: true }));
    area.appendChild(field('兴趣爱好', s.skills.hobby, v => s.skills.hobby = v));
  }
}

// ========== 渲染中间模块选择面板 ==========
function renderModulePanel() {
  const area = document.getElementById('module-area');
  area.innerHTML = '';
  
  const sections = [
    { key: 'education', list: data.educations, label: '教育经历', getLabel: i => `${i.school || '未命名'} · ${i.degree || ''}` },
    { key: 'internship', list: data.internships, label: '实习经历', getLabel: i => `${i.company || '未命名'} · ${i.role || ''}` },
    { key: 'project', list: data.projects, label: '项目经历', getLabel: i => `${i.name || '未命名'} · ${i.role || ''}` },
    { key: 'activity', list: data.activities, label: '校园活动', getLabel: i => `${i.org || '未命名'} · ${i.role || ''}` }
  ];
  
  // 基本信息切换
  const basicCard = document.createElement('div');
  basicCard.className = 'module-card ' + (data.selected.basic ? 'included' : '');
  basicCard.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold">基本信息（头像、联系方式）</span>
      <input type="checkbox" ${data.selected.basic ? 'checked' : ''} class="w-4 h-4" id="sel-basic">
    </div>
  `;
  area.appendChild(basicCard);
  basicCard.querySelector('#sel-basic').onchange = e => {
    data.selected.basic = e.target.checked;
    saveData();
    renderModulePanel();
    renderPreview();
  };
  
  sections.forEach(sec => {
    const groupHeader = document.createElement('div');
    groupHeader.className = 'flex items-center justify-between mt-4 mb-2';
    groupHeader.innerHTML = `<div class="text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">${sec.label} (${sec.list.length})</div>`;
    
    if (sec.list.length > 0) {
      const allBtns = document.createElement('div');
      allBtns.className = 'flex gap-1';
      const selAll = document.createElement('button');
      selAll.className = 'text-[10px] text-blue-600 hover:underline';
      selAll.textContent = '全选';
      selAll.onclick = () => {
        data.selected[sec.key] = sec.list.map(i => i.id);
        saveData();
        renderModulePanel();
        renderPreview();
      };
      const selNone = document.createElement('button');
      selNone.className = 'text-[10px] text-neutral-500 hover:underline';
      selNone.textContent = '清空';
      selNone.onclick = () => {
        data.selected[sec.key] = [];
        saveData();
        renderModulePanel();
        renderPreview();
      };
      allBtns.appendChild(selAll);
      allBtns.appendChild(selNone);
      groupHeader.appendChild(allBtns);
    }
    area.appendChild(groupHeader);
    
    if (sec.list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-xs text-neutral-400 italic mb-2 px-2';
      empty.textContent = '暂无条目，先在左侧添加';
      area.appendChild(empty);
      return;
    }
    
    sec.list.forEach(item => {
      const isIn = data.selected[sec.key].includes(item.id);
      const card = document.createElement('div');
      card.className = 'module-card ' + (isIn ? 'included' : '');
      const dateRange = (item.startDate || item.endDate) ? `${item.startDate || ''} ~ ${item.endDate || ''}` : '';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-neutral-900 truncate">${sec.getLabel(item)}</div>
            <div class="text-[10px] text-neutral-500 mt-0.5">${dateRange}</div>
          </div>
          <input type="checkbox" ${isIn ? 'checked' : ''} class="w-4 h-4 mt-0.5 flex-shrink-0">
        </div>
      `;
      card.querySelector('input').onchange = e => {
        if (e.target.checked) {
          if (!data.selected[sec.key].includes(item.id)) data.selected[sec.key].push(item.id);
        } else {
          data.selected[sec.key] = data.selected[sec.key].filter(id => id !== item.id);
        }
        saveData();
        renderModulePanel();
        renderPreview();
      };
      area.appendChild(card);
    });
  });
  
  // 个人总结
  const sumCard = document.createElement('div');
  sumCard.className = 'mt-4 module-card ' + (data.selected.summary ? 'included' : '');
  sumCard.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold">个人总结（技能、兴趣）</span>
      <input type="checkbox" ${data.selected.summary ? 'checked' : ''} class="w-4 h-4" id="sel-summary">
    </div>
  `;
  area.appendChild(sumCard);
  sumCard.querySelector('#sel-summary').onchange = e => {
    data.selected.summary = e.target.checked;
    saveData();
    renderModulePanel();
    renderPreview();
  };
}

// ========== 渲染简历预览 ==========
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function nl2br(s) { return escapeHtml(s).replace(/\n/g, '<br>'); }

// ========== 构造内容块数组（细粒度，bullet 可独立分页） ==========
// 每个 block: { html, keepWithNext?: bool }
// keepWithNext = true 表示这个 block 不能是某页的最后一个（必须和下一个在同一页），用于防止孤标题
function buildBlocks() {
  const b = data.basic;
  const sel = data.selected;
  const blocks = [];
  
  // ----- 1. Header（不可切分整体） -----
  if (sel.basic) {
    let h = `<div data-block style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 6px;">`;
    if (b.photo) {
      h += `<img src="${b.photo}" style="width: 70px; height: auto; flex-shrink: 0; display: block;"/>`;
    }
    h += `<div style="flex: 1; padding-top: 4px;">`;
    const fullName = [b.name, b.nameEn].filter(Boolean).join(' ');
    h += `<div style="font-size: 2em; font-weight: 700; margin-bottom: 6px;">${escapeHtml(fullName)}</div>`;
    const contacts = [b.phone, b.email, b.location].filter(Boolean).join(' &nbsp;|&nbsp; ');
    if (contacts) h += `<div class="contact-line">${contacts}</div>`;
    if (b.website) h += `<div class="contact-line" style="margin-top: 2px;"><a href="${escapeHtml(b.website)}">${escapeHtml(b.website)}</a></div>`;
    h += `</div>`;
    if (b.schoolBadge) {
      h += `<img src="${b.schoolBadge}" style="width: 60px; height: auto; flex-shrink: 0; display: block;"/>`;
    }
    h += `</div>`;
    blocks.push({ html: h });
  }
  
  // 辅助：构造一条经历的"标题行"（公司+岗位+日期）
  function headerLineHtml(left, role, date) {
    let h = `<div data-block style="display:flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">`;
    h += `<div><span class="item-title">${escapeHtml(left)}</span>`;
    if (role) h += `<span>-${escapeHtml(role)}</span>`;
    h += `</div>`;
    h += `<div class="item-date">${escapeHtml(date)}</div>`;
    h += `</div>`;
    return h;
  }
  
  // 辅助：构造一行附加信息（如"设计原型: ..."、"相关课程: ..."、tag-pill）
  function lineHtml(content) {
    return `<div data-block style="margin-bottom: 4px;">${content}</div>`;
  }
  
  // 辅助：构造一个 bullet（用 <ul> 包起来，单独可切）
  function bulletHtml(bp, isLast) {
    let h = `<ul data-block style="margin-top: 0; margin-bottom: ${isLast ? '10px' : '4px'};"><li>`;
    if (bp.title) h += `<strong>${escapeHtml(bp.title)}：</strong>`;
    h += escapeHtml(bp.detail);
    h += `</li></ul>`;
    return h;
  }
  
  // 辅助：把一条经历拆成多个 block
  // header line (keepWithNext) + 附加行（如果有）+ 每个 bullet
  function pushExperience(headerLeft, role, date, extraLines, bullets) {
    // 标题行：必须和下一行在同一页
    blocks.push({ html: headerLineHtml(headerLeft, role, date), keepWithNext: true });
    // 附加行：每行单独可切（但标题已经 keepWithNext，会拉住下一个）
    (extraLines || []).forEach((line, idx) => {
      const isLast = idx === extraLines.length - 1 && (!bullets || bullets.length === 0);
      // 不是最后一行的话，也 keepWithNext（让附加行不要单独留在页底）
      blocks.push({ html: lineHtml(line), keepWithNext: !isLast });
    });
    // bullets：每个独立切片
    (bullets || []).forEach((bp, idx) => {
      const isLast = idx === bullets.length - 1;
      blocks.push({ html: bulletHtml(bp, isLast) });
    });
  }
  
  // ----- 2. 教育经历 -----
  const selEdus = data.educations.filter(e => sel.education.includes(e.id));
  if (selEdus.length > 0) {
    // section title: keepWithNext，避免标题孤儿
    blocks.push({ html: `<div data-block class="section-title">教育经历</div>`, keepWithNext: true });
    selEdus.forEach(e => {
      const left = e.school + (e.degree ? ` - ${e.degree}` : '') + (e.mode ? ` ${e.mode}` : '');
      const date = [e.startDate, e.endDate].filter(Boolean).join(' - ');
      // 教育经历没 role 概念，把所有信息塞到 left
      const headerHtml = `<div data-block style="display:flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">`
        + `<div><span class="item-title">${escapeHtml(e.school)}</span>`
        + (e.degree ? ` - <span>${escapeHtml(e.degree)}</span>` : '')
        + (e.mode ? ` <span style="color:#555;">${escapeHtml(e.mode)}</span>` : '')
        + `</div>`
        + `<div class="item-date">${escapeHtml(date)}</div>`
        + `</div>`;
      blocks.push({ html: headerHtml, keepWithNext: !!(e.tag || e.courses) });
      
      const extras = [];
      if (e.tag) extras.push(`<span class="tag-pill">${escapeHtml(e.tag)}</span>`);
      if (e.courses) extras.push(`相关课程: ${escapeHtml(e.courses)}`);
      extras.forEach((line, idx) => {
        const isLast = idx === extras.length - 1;
        blocks.push({ html: `<div data-block style="margin-bottom: ${isLast ? '8px' : '4px'};">${line}</div>`, keepWithNext: !isLast });
      });
    });
  }
  
  // ----- 3. 实习经历 -----
  const selInts = data.internships.filter(i => sel.internship.includes(i.id));
  if (selInts.length > 0) {
    blocks.push({ html: `<div data-block class="section-title">实习经历</div>`, keepWithNext: true });
    selInts.forEach(i => {
      const date = [i.startDate, i.endDate].filter(Boolean).join(' - ');
      pushExperience(i.company, i.role, date, [], i.bullets || []);
    });
  }
  
  // ----- 4. 项目活动经历 -----
  const selProjs = data.projects.filter(p => sel.project.includes(p.id));
  const selActs = data.activities.filter(a => sel.activity.includes(a.id));
  if (selProjs.length > 0 || selActs.length > 0) {
    blocks.push({ html: `<div data-block class="section-title">项目活动经历</div>`, keepWithNext: true });
    selProjs.forEach(p => {
      const date = [p.startDate, p.endDate].filter(Boolean).join(' - ');
      const extras = [];
      if (p.link) extras.push(`设计原型：<a href="${escapeHtml(p.link)}">${escapeHtml(p.link)}</a>`);
      pushExperience(p.name, p.role, date, extras, p.bullets || []);
    });
    selActs.forEach(a => {
      const date = [a.startDate, a.endDate].filter(Boolean).join(' - ');
      pushExperience(a.org, a.role, date, [], a.bullets || []);
    });
  }
  
  // ----- 5. 个人总结 -----
  if (sel.summary) {
    const s = data.summary;
    const hasSummary = s.keywords || s.skills.dataAnalysis || s.skills.productTools || s.skills.other || s.skills.hobby;
    if (hasSummary) {
      blocks.push({ html: `<div data-block class="section-title">个人总结</div>`, keepWithNext: true });
      // 个人总结里每一行也单独成块
      const lines = [];
      if (s.keywords) lines.push(`<strong>关键词：</strong>${escapeHtml(s.keywords)}`);
      if (s.skills.dataAnalysis) lines.push(`<strong>数据分析：</strong>${escapeHtml(s.skills.dataAnalysis)}`);
      if (s.skills.productTools) lines.push(`<strong>产品工具：</strong>${escapeHtml(s.skills.productTools)}`);
      if (s.skills.other) lines.push(`<strong>其他：</strong>${escapeHtml(s.skills.other)}`);
      if (s.skills.hobby) lines.push(`<strong>兴趣爱好：</strong>${escapeHtml(s.skills.hobby)}`);
      lines.forEach((line, idx) => {
        blocks.push({ html: `<div data-block style="line-height: 1.7;">${line}</div>` });
      });
    }
  }
  
  return blocks;
}

// ========== 创建一个 .resume-page 元素（带 layout 设置） ==========
function createResumePage() {
  const page = document.createElement('div');
  page.className = 'resume-page';
  const L = data.layout;
  const margin = MARGIN_PRESETS[L.margin] || MARGIN_PRESETS.normal;
  page.style.setProperty('--margin-v', margin.v + 'mm');
  page.style.setProperty('--margin-h', margin.h + 'mm');
  page.style.setProperty('--base-font', L.fontSize + 'pt');
  page.style.setProperty('--line-height', L.lineHeight);
  page.setAttribute('data-section-style', L.sectionStyle);
  return page;
}

// ========== applyLayout：现在只更新顶部按钮 active 态 ==========
function applyLayoutControls() {
  const L = data.layout;
  document.querySelectorAll('.margin-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.margin === L.margin);
  });
  document.querySelectorAll('.section-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === L.sectionStyle);
  });
  const fontVal = document.getElementById('font-val');
  if (fontVal) fontVal.textContent = L.fontSize.toFixed(1) + 'pt';
  const lineVal = document.getElementById('line-val');
  if (lineVal) lineVal.textContent = L.lineHeight.toFixed(2);
}

// ========== 测量并分页 ==========
function paginateBlocks(blocks) {
  // 创建一个隐藏的测量容器
  const measurer = createResumePage();
  measurer.style.position = 'absolute';
  measurer.style.left = '-99999px';
  measurer.style.top = '0';
  measurer.style.visibility = 'hidden';
  measurer.style.boxShadow = 'none';
  document.body.appendChild(measurer);
  
  // 计算页内容区高度（A4 高 - 上下 padding）
  const pageRect = measurer.getBoundingClientRect();
  const computed = getComputedStyle(measurer);
  const padTop = parseFloat(computed.paddingTop);
  const padBottom = parseFloat(computed.paddingBottom);
  const contentHeight = pageRect.height - padTop - padBottom;
  
  // 一个块一个块测量
  const blockHeights = [];
  blocks.forEach((block, idx) => {
    measurer.innerHTML += block.html;
    // 测最后一个 data-block 元素
    const allBlocks = measurer.querySelectorAll('[data-block]');
    const last = allBlocks[allBlocks.length - 1];
    if (last) {
      // 用 offsetHeight 含 margin 的累计高度估算
      const cs = getComputedStyle(last);
      const mt = parseFloat(cs.marginTop) || 0;
      const mb = parseFloat(cs.marginBottom) || 0;
      blockHeights[idx] = last.offsetHeight + mt + mb;
    } else {
      blockHeights[idx] = 0;
    }
  });
  
  document.body.removeChild(measurer);
  
  // 按高度分配到页：keepWithNext 处理"标题跟随"逻辑
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;
  
  // 先计算每个 block 的"keep group 链长度"：从 block i 起，连续 keepWithNext=true 直到第一个 false 的总高度
  // 这是为了判断"如果把这个 block 放在当前页，整个连带组能不能塞下"
  function chainHeight(startIdx) {
    let total = 0;
    let idx = startIdx;
    while (idx < blocks.length) {
      total += blockHeights[idx];
      if (!blocks[idx].keepWithNext) break;
      idx++;
    }
    return total;
  }
  
  let i = 0;
  while (i < blocks.length) {
    const h = blockHeights[i];
    
    // 如果当前 block 的 keepWithNext = true，必须确保它和下一个 block 至少能放在同一页
    if (blocks[i].keepWithNext && i + 1 < blocks.length) {
      // 至少需要：当前 block + 下一个 block 的高度
      const chainH = h + blockHeights[i + 1];
      // 如果当前页装不下这个最小组合，且当前页已有内容，换页
      if (currentHeight + chainH > contentHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
    } else {
      // 普通 block：装不下且当前页非空则换页
      if (currentHeight + h > contentHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
    }
    
    currentPage.push(i);
    currentHeight += h;
    i++;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  
  return pages;
}

function renderPreview() {
  applyLayoutControls();
  const container = document.getElementById('pages-container');
  container.innerHTML = '';
  
  const blocks = buildBlocks();
  
  // 空状态
  if (blocks.length === 0) {
    const page = createResumePage();
    page.innerHTML = `<div style="text-align: center; color: #999; padding: 100px 20px;">
      <div style="font-size: 1.3em; margin-bottom: 8px;">📄 你的简历预览</div>
      <div style="font-size: 0.95em;">在左侧填写信息，然后在中间勾选要包含的经历</div>
    </div>`;
    container.appendChild(page);
    return;
  }
  
  // 分页
  const pages = paginateBlocks(blocks);
  
  // 渲染每一页
  pages.forEach((blockIndices) => {
    const page = createResumePage();
    const html = blockIndices.map(idx => blocks[idx].html).join('');
    page.innerHTML = html;
    container.appendChild(page);
  });
}

// ========== 标签页切换 ==========
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderEdit();
    });
  });
}

// ========== 排版控件 ==========
function setupLayoutControls() {
  // 边距按钮
  document.querySelectorAll('.margin-btn').forEach(btn => {
    btn.onclick = () => {
      data.layout.margin = btn.dataset.margin;
      saveData();
      renderPreview();
    };
  });
  // 标题样式按钮
  document.querySelectorAll('.section-style-btn').forEach(btn => {
    btn.onclick = () => {
      data.layout.sectionStyle = btn.dataset.style;
      saveData();
      renderPreview();
    };
  });
  // 字号 +/-
  document.getElementById('font-up').onclick = () => {
    data.layout.fontSize = Math.min(14, Math.round((data.layout.fontSize + 0.5) * 10) / 10);
    saveData(); renderPreview();
  };
  document.getElementById('font-down').onclick = () => {
    data.layout.fontSize = Math.max(8, Math.round((data.layout.fontSize - 0.5) * 10) / 10);
    saveData(); renderPreview();
  };
  // 行距 +/-
  document.getElementById('line-up').onclick = () => {
    data.layout.lineHeight = Math.min(2.4, Math.round((data.layout.lineHeight + 0.1) * 100) / 100);
    saveData(); renderPreview();
  };
  document.getElementById('line-down').onclick = () => {
    data.layout.lineHeight = Math.max(1.1, Math.round((data.layout.lineHeight - 0.1) * 100) / 100);
    saveData(); renderPreview();
  };
  // 重置
  document.getElementById('reset-style').onclick = () => {
    data.layout = { margin: 'normal', fontSize: 10.5, lineHeight: 1.6, sectionStyle: 'bar' };
    saveData(); renderPreview();
  };
}

// ========== 缩放控件 ==========
function setupZoom() {
  const zoom = document.getElementById('zoom');
  const wrap = document.getElementById('preview-wrapper');
  const val = document.getElementById('zoom-val');
  const apply = () => {
    const z = zoom.value / 100;
    wrap.style.transform = `scale(${z})`;
    val.textContent = zoom.value + '%';
  };
  zoom.addEventListener('input', apply);
  apply();
}

// ========== PDF 导出 ==========
function setupExport() {
  document.getElementById('export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '生成中...';
    btn.disabled = true;
    
    // 关键 1：取消预览的缩放，让 html2canvas 抓到真实尺寸
    const wrap = document.getElementById('preview-wrapper');
    const originalTransform = wrap.style.transform;
    wrap.style.transform = 'scale(1)';
    
    // 关键 2：暂时去掉所有 .resume-page 的 box-shadow（截图时会有黑边）
    const pages = Array.from(document.querySelectorAll('#pages-container .resume-page'));
    const originalShadows = pages.map(p => p.style.boxShadow);
    pages.forEach(p => p.style.boxShadow = 'none');
    
    // 等浏览器重排
    await new Promise(r => setTimeout(r, 150));
    
    try {
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      
      // 创建 jsPDF 实例
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: false
      });
      
      // 遍历每一页，单独截图、单独放到一个 PDF 页
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        
        // scale=3 ≈ 288 DPI 印刷级
        const canvas = await html2canvas(pageEl, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: pageEl.offsetWidth,
          height: pageEl.offsetHeight,
          windowWidth: pageEl.offsetWidth,
          windowHeight: pageEl.offsetHeight,
          letterRendering: true,
          imageTimeout: 0
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) pdf.addPage();
        // 每页都按完整 A4 尺寸放置（资源页本身就是 210×297mm 的）
        pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'NONE');
      }
      
      const filename = `${data.basic.name || 'resume'}_简历.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error(err);
      alert('导出失败：' + err.message);
    } finally {
      // 恢复样式
      wrap.style.transform = originalTransform;
      pages.forEach((p, i) => p.style.boxShadow = originalShadows[i]);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}

// ========== 导入解析逻辑 ==========
function setupImport() {
  const modal = document.getElementById('import-modal');
  const importBtn = document.getElementById('import-btn');
  const closeBtn = document.getElementById('close-modal');
  const uploadBtn = document.getElementById('upload-pdf');
  const pasteText = document.getElementById('paste-text');
  const parseBtn = document.getElementById('parse-btn');
  
  importBtn.onclick = () => modal.classList.remove('hidden');
  closeBtn.onclick = () => modal.classList.add('hidden');
  modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
  
  uploadBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      uploadBtn.textContent = '正在提取 PDF 文本...';
      try {
        const text = await extractPdfText(file);
        pasteText.value = text;
        uploadBtn.textContent = '✓ PDF 提取完成（已填入下方文本框）';
      } catch (err) {
        uploadBtn.textContent = '提取失败：' + err.message;
      }
    };
    input.click();
  };
  
  parseBtn.onclick = () => {
    const text = pasteText.value.trim();
    if (!text) {
      alert('请先粘贴简历内容或上传 PDF');
      return;
    }
    if (!confirm('解析将会替换当前左侧编辑区的相关字段（已有数据会被合并/追加），继续？')) return;
    parseResumeText(text);
    modal.classList.add('hidden');
    renderEdit();
    renderModulePanel();
    renderPreview();
    saveData();
    alert('解析完成！请在左侧编辑区检查并微调结果。');
  };
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // 按 y 坐标分组合并成行
    const items = content.items;
    let lastY = null;
    let lineBuf = '';
    items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(lastY - y) > 2) {
        fullText += lineBuf + '\n';
        lineBuf = '';
      }
      lineBuf += item.str;
      lastY = y;
    });
    if (lineBuf) fullText += lineBuf + '\n';
    fullText += '\n';
  }
  return fullText;
}

// ========== 简历文本解析器（基于规则）==========
function parseResumeText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 检测段落标题
  const SECTION_PATTERNS = {
    education: /^(教育经历|教育背景|Education)/i,
    internship: /^(实习经历|工作经历|Work\s*Experience|Internship)/i,
    project: /^(项目活动经历|项目经历|项目|Projects?)/i,
    activity: /^(校园活动|活动经历|Activities)/i,
    summary: /^(个人总结|技能|自我评价|Skills|Summary)/i
  };
  
  // 日期模式：2023.05 - 2023.09 或 2023.05 - 至今 等
  const DATE_RANGE = /(\d{4}[\.\/\-]\d{1,2}(?:[\.\/\-]\d{1,2})?)\s*[-—~至到]\s*(\d{4}[\.\/\-]\d{1,2}(?:[\.\/\-]\d{1,2})?|至今|present|now)/i;
  
  // 提取基本信息（前几行通常包含）
  const headerText = lines.slice(0, 8).join(' ');
  
  // 电话
  const phoneMatch = headerText.match(/(\+?\d[\d\s-]{8,})/);
  if (phoneMatch) data.basic.phone = phoneMatch[1].trim();
  
  // 邮箱
  const emailMatch = headerText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) data.basic.email = emailMatch[0];
  
  // 网址
  const urlMatch = headerText.match(/https?:\/\/[^\s|]+|[a-z0-9.-]+\.[a-z]{2,}\/[^\s|]+/i);
  if (urlMatch) data.basic.website = urlMatch[0];
  
  // 姓名：尝试找开头第一个非邮箱、非电话、非URL的"短"行（中文姓名 2-4 字 或 英文姓名）
  for (const ln of lines.slice(0, 5)) {
    if (ln.length > 20) continue;
    if (/[@\d]/.test(ln)) continue;
    if (/http/i.test(ln)) continue;
    // 中文姓名+英文名: "王彦兮 Yesy"
    const m = ln.match(/^([\u4e00-\u9fa5]{2,4})\s*([A-Za-z]+)?$/);
    if (m) {
      data.basic.name = m[1];
      if (m[2]) data.basic.nameEn = m[2];
      break;
    }
  }
  
  // 城市（常见城市检测）
  const cityMatch = headerText.match(/(Philadelphia|Shanghai|Beijing|New York|上海|北京|广州|深圳|杭州|宁波|南京)/);
  if (cityMatch) data.basic.location = cityMatch[1];
  
  // ----- 切分章节 -----
  const sections = { header: [], education: [], internship: [], project: [], activity: [], summary: [] };
  let currentSec = 'header';
  lines.forEach(line => {
    for (const [key, pat] of Object.entries(SECTION_PATTERNS)) {
      if (pat.test(line)) {
        currentSec = key;
        return;
      }
    }
    sections[currentSec].push(line);
  });
  
  // ----- 解析教育 -----
  parseEducationSection(sections.education);
  
  // ----- 解析实习 -----
  parseExperienceSection(sections.internship, 'internships', 'company', 'role');
  
  // ----- 解析项目（包含活动）-----
  const projLines = [...sections.project];
  // 如果有专门活动段，单独处理；否则项目段包含活动
  if (sections.activity.length > 0) {
    parseExperienceSection(sections.activity, 'activities', 'org', 'role');
  }
  parseExperienceSection(projLines, 'projects', 'name', 'role');
  
  // ----- 解析个人总结 -----
  parseSummarySection(sections.summary);
}

function parseEducationSection(lines) {
  const DATE_RANGE = /(\d{4}[\.\/\-]\d{1,2}(?:[\.\/\-]\d{1,2})?)\s*[-—~]\s*(\d{4}[\.\/\-]\d{1,2}(?:[\.\/\-]\d{1,2})?|至今|present|now)/i;
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(DATE_RANGE);
    if (dateMatch) {
      // 含日期的行就是教育主行
      const beforeDate = line.replace(DATE_RANGE, '').trim();
      // 分割学校 - 学位 模式
      const parts = beforeDate.split(/\s*-\s*/);
      const school = parts[0] || '';
      const degreeFull = parts.slice(1).join(' - ') || '';
      // 进一步拆分学位与形式（"硕士 全日制"）
      const degreeMatch = degreeFull.match(/^(.+?)\s+(全日制|非全日制|在线)$/);
      const degree = degreeMatch ? degreeMatch[1] : degreeFull;
      const mode = degreeMatch ? degreeMatch[2] : '';
      
      const edu = {
        id: newId(),
        school: school,
        degree: degree,
        mode: mode,
        startDate: dateMatch[1],
        endDate: dateMatch[2],
        tag: '',
        courses: ''
      };
      
      // 看下一行是否是标签（短文本 + 不是日期）
      let next = lines[i + 1];
      if (next && next.length < 25 && !DATE_RANGE.test(next) && !/相关课程|相关课/.test(next)) {
        edu.tag = next;
        i++;
      }
      // 相关课程
      next = lines[i + 1];
      if (next && /相关课程?:/.test(next)) {
        edu.courses = next.replace(/^相关课程?:\s*/, '').trim();
        i++;
      }
      
      data.educations.push(edu);
      // 选中
      if (!data.selected.education.includes(edu.id)) data.selected.education.push(edu.id);
    }
    i++;
  }
}

function parseExperienceSection(lines, listKey, orgKey, roleKey) {
  const DATE_RANGE = /(\d{4}[\.\/\-]\d{1,2}(?:[\.\/\-]\d{1,2})?)\s*[-—~]\s*(\d{4}[\.\/\-]\d{1,2}(?:[\.\/\-]\d{1,2})?|至今|present|now)/i;
  
  let currentItem = null;
  let buffer = []; // 累积当前条目的所有要点行
  
  const flush = () => {
    if (currentItem) {
      // 解析累积的 buffer 成 bullets
      currentItem.bullets = extractBullets(buffer);
      data[listKey].push(currentItem);
      const selKey = listKey.replace(/s$/, '');
      if (data.selected[selKey] && !data.selected[selKey].includes(currentItem.id)) {
        data.selected[selKey].push(currentItem.id);
      }
    }
    currentItem = null;
    buffer = [];
  };
  
  lines.forEach(line => {
    const dateMatch = line.match(DATE_RANGE);
    if (dateMatch) {
      // 这一行是新条目的标题行
      flush();
      const beforeDate = line.replace(DATE_RANGE, '').trim();
      // 拆分 公司-岗位 模式
      const parts = beforeDate.split(/[-—]/);
      const org = (parts[0] || '').trim();
      const role = parts.slice(1).join(' - ').trim();
      
      currentItem = {
        id: newId(),
        [orgKey]: org,
        [roleKey]: role,
        startDate: dateMatch[1],
        endDate: dateMatch[2],
        bullets: []
      };
      if (listKey === 'projects') currentItem.link = '';
    } else if (currentItem) {
      buffer.push(line);
    }
  });
  flush();
}

function extractBullets(lines) {
  // 把 buffer 分成 bullet：每个 bullet 通常 = "小标题：描述..."
  // 简单策略：以包含中文冒号"："的行作为新bullet的开始
  const bullets = [];
  let current = null;
  
  lines.forEach(line => {
    // 去除项目符号
    const clean = line.replace(/^[•·▪●○◇◆■□▲△*\-\u2022]\s*/, '').trim();
    if (!clean) return;
    
    // 检测是否是 "小标题：内容" 模式
    const colonIdx = clean.indexOf('：');
    // 小标题应该比较短（小于 15 个中文字符且不是URL/邮箱）
    if (colonIdx > 0 && colonIdx < 20 && !/http|@|www/.test(clean.slice(0, colonIdx))) {
      // 新 bullet
      if (current) bullets.push(current);
      current = {
        id: newId(),
        title: clean.slice(0, colonIdx),
        detail: clean.slice(colonIdx + 1).trim()
      };
    } else if (current) {
      // 续上一个 bullet
      current.detail += ' ' + clean;
    } else {
      // 没有标题的纯描述
      current = { id: newId(), title: '', detail: clean };
    }
  });
  if (current) bullets.push(current);
  return bullets;
}

function parseSummarySection(lines) {
  const s = data.summary;
  lines.forEach(line => {
    const clean = line.replace(/^[•·▪●○]\s*/, '').trim();
    const m = clean.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (!m) return;
    const label = m[1].trim();
    const value = m[2].trim();
    if (/关键词/.test(label)) s.keywords = value;
    else if (/数据分析|数据/.test(label)) s.skills.dataAnalysis = value;
    else if (/产品工具|产品/.test(label)) s.skills.productTools = value;
    else if (/兴趣|爱好/.test(label)) s.skills.hobby = value;
    else if (/其他/.test(label)) s.skills.other = value;
    else {
      // 追加到其他
      s.skills.other = (s.skills.other ? s.skills.other + '；' : '') + label + '：' + value;
    }
  });
}

// ========== 启动 ==========
function init() {
  setupTabs();
  setupZoom();
  setupLayoutControls();
  setupExport();
  setupImport();
  document.getElementById('save-btn').addEventListener('click', saveData);
  renderEdit();
  renderModulePanel();
  renderPreview();
}

// ========== 图片裁剪器 ==========
// openCropper(imageDataUrl, { ratios, defaultRatio, title }) → Promise<croppedDataUrl | null>
// ratios: 数组 [{label, value}], value 为 w/h 比例（null 表示自由）
function openCropper(imgUrl, opts = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('crop-modal');
    const titleEl = document.getElementById('crop-title');
    const img = document.getElementById('crop-img');
    const box = document.getElementById('crop-box');
    const ratioGroup = document.getElementById('ratio-group');
    const ratioHint = document.getElementById('ratio-hint');
    const confirmBtn = document.getElementById('crop-confirm');
    const cancelBtns = [document.getElementById('crop-cancel'), document.getElementById('crop-cancel-btn')];
    
    titleEl.textContent = opts.title || '裁剪图片';
    
    const ratios = opts.ratios || [
      { label: '自由', value: null },
      { label: '1:1', value: 1 },
      { label: '3:4', value: 3/4 },
      { label: '4:3', value: 4/3 }
    ];
    let currentRatio = opts.defaultRatio !== undefined ? opts.defaultRatio : ratios[0].value;
    
    // 渲染比例按钮
    ratioGroup.innerHTML = '';
    ratios.forEach((r, idx) => {
      const btn = document.createElement('button');
      btn.className = 'px-2.5 py-1 hover:bg-neutral-50' + (idx > 0 ? ' border-l border-neutral-200' : '');
      btn.textContent = r.label;
      if (r.value === currentRatio) {
        btn.style.background = '#1a1a1a';
        btn.style.color = 'white';
      }
      btn.onclick = () => {
        currentRatio = r.value;
        // 更新按钮 active 态
        Array.from(ratioGroup.children).forEach(b => {
          b.style.background = '';
          b.style.color = '';
        });
        btn.style.background = '#1a1a1a';
        btn.style.color = 'white';
        // 重置裁剪框为新比例
        resetBox();
      };
      ratioGroup.appendChild(btn);
    });
    ratioHint.textContent = opts.hint || '';
    
    // 加载图片
    img.onload = () => {
      modal.classList.remove('hidden');
      // 等一帧让 img 渲染出真实尺寸
      requestAnimationFrame(() => {
        resetBox();
      });
    };
    img.src = imgUrl;
    
    // 重置裁剪框：根据当前比例居中显示一个最大可能的框
    function resetBox() {
      const w = img.clientWidth;
      const h = img.clientHeight;
      let bw, bh;
      if (currentRatio === null) {
        // 自由：默认占 80%
        bw = w * 0.8;
        bh = h * 0.8;
      } else {
        // 按比例铺满
        if (w / h > currentRatio) {
          // 图片更宽，按高度撑满
          bh = h * 0.9;
          bw = bh * currentRatio;
        } else {
          bw = w * 0.9;
          bh = bw / currentRatio;
        }
      }
      const bx = (w - bw) / 2;
      const by = (h - bh) / 2;
      setBox(bx, by, bw, bh);
    }
    
    let boxState = { x: 0, y: 0, w: 0, h: 0 };
    function setBox(x, y, w, h) {
      const imgW = img.clientWidth;
      const imgH = img.clientHeight;
      // 限制在图片范围内
      x = Math.max(0, Math.min(imgW - 20, x));
      y = Math.max(0, Math.min(imgH - 20, y));
      w = Math.max(20, Math.min(imgW - x, w));
      h = Math.max(20, Math.min(imgH - y, h));
      boxState = { x, y, w, h };
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.width = w + 'px';
      box.style.height = h + 'px';
    }
    
    // ===== 拖动整个裁剪框 =====
    let dragMode = null; // 'move' 或 'nw'/'ne'/'sw'/'se'
    let dragStart = null;
    
    box.onmousedown = (e) => {
      if (e.target.classList.contains('crop-handle')) return; // 让 handle 自己处理
      dragMode = 'move';
      dragStart = { mx: e.clientX, my: e.clientY, ...boxState };
      e.preventDefault();
    };
    
    // 8 个手柄
    box.querySelectorAll('.crop-handle').forEach(h => {
      h.onmousedown = (e) => {
        dragMode = h.dataset.dir;
        dragStart = { mx: e.clientX, my: e.clientY, ...boxState };
        e.stopPropagation();
        e.preventDefault();
      };
    });
    
    function onMouseMove(e) {
      if (!dragMode) return;
      const dx = e.clientX - dragStart.mx;
      const dy = e.clientY - dragStart.my;
      
      if (dragMode === 'move') {
        setBox(dragStart.x + dx, dragStart.y + dy, dragStart.w, dragStart.h);
      } else {
        // 调整大小
        let nx = dragStart.x, ny = dragStart.y, nw = dragStart.w, nh = dragStart.h;
        if (dragMode === 'nw') { nx = dragStart.x + dx; ny = dragStart.y + dy; nw = dragStart.w - dx; nh = dragStart.h - dy; }
        else if (dragMode === 'ne') { ny = dragStart.y + dy; nw = dragStart.w + dx; nh = dragStart.h - dy; }
        else if (dragMode === 'sw') { nx = dragStart.x + dx; nw = dragStart.w - dx; nh = dragStart.h + dy; }
        else if (dragMode === 'se') { nw = dragStart.w + dx; nh = dragStart.h + dy; }
        
        // 锁定比例
        if (currentRatio !== null) {
          // 以宽度为准重新算高度
          nh = nw / currentRatio;
          // 如果调的是上侧手柄，需要同步调整 y
          if (dragMode === 'nw' || dragMode === 'ne') {
            ny = dragStart.y + dragStart.h - nh;
          }
        }
        
        setBox(nx, ny, nw, nh);
      }
    }
    
    function onMouseUp() {
      dragMode = null;
      dragStart = null;
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // ===== 确认 / 取消 =====
    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      modal.classList.add('hidden');
      img.onload = null;
    };
    
    confirmBtn.onclick = () => {
      // 计算裁剪框在原图上的实际像素位置
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const scaleX = naturalW / img.clientWidth;
      const scaleY = naturalH / img.clientHeight;
      
      const cropX = boxState.x * scaleX;
      const cropY = boxState.y * scaleY;
      const cropW = boxState.w * scaleX;
      const cropH = boxState.h * scaleY;
      
      // 用 canvas 裁剪
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropW);
      canvas.height = Math.round(cropH);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      
      // PNG 保留质量（带透明，校徽如果有透明背景也能保留）
      const result = canvas.toDataURL('image/png');
      cleanup();
      resolve(result);
    };
    
    cancelBtns.forEach(b => {
      b.onclick = () => {
        cleanup();
        resolve(null);
      };
    });
  });
}

init();
