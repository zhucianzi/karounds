/* UID identities and card fields come from the confirmed hub projection. */
const allCards = window.CARD_DATA.cards;
const cards = allCards.filter(card => card.coldStorage !== '冷藏' && card.cardOrigin !== '测试卡');
const referenceCards = window.CARD_DATA.referenceCards || [];
const detailCards = new Map([...allCards, ...referenceCards].map(card => [card.id, card]));
const cardsByUid = new Map([...allCards, ...referenceCards].map(card => [card.uid, card]));
const $ = id => document.getElementById(id);
const officialIcons = {...window.OFFICIAL_ICONS, ...window.NATION_ICONS};
const rarityNames = {金:'精英',银:'特殊',铜:'限定',铁:'基础'};
const rarityClasses = {金:'gold',银:'silver',铜:'bronze',铁:'iron'};
const rarityOrder = {金:4,银:3,铜:2,铁:1};
const state = {nation:'',cost:'',type:'',rarity:'',role:'',query:'',sort:'cost-asc'};
let visible = cards.slice(), currentId = null, lastFocus = null, toastTimer;
let referenceTrail = [], detailRootId = null;
let activePage = null;
const pageScroll = {collection: 0, intelligence: 0, monitoring: 0};
window.history.scrollRestoration = 'manual';
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600);}
const selections = value => value ? value.split(',') : [];
function filterCards(list, filters) {
 const nations = selections(filters.nation);
 const costs = selections(filters.cost);
 const types = selections(filters.type);
 const rarities = selections(filters.rarity);
 const roles = selections(filters.role);
 return list.filter(card =>
  (!nations.length || nations.includes(card.nation)) &&
  (!costs.length || costs.some(cost => cost === '7' ? card.cost >= 7 : String(card.cost) === cost)) &&
  (!types.length || types.includes(card.unitType || card.type)) &&
  (!rarities.length || rarities.includes(card.rarity)) &&
  (!roles.length || roles.includes(card.role)) &&
  (!filters.query || card.name.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase()))
 );
}
function toggleFilter(key,value){const values=selections(state[key]);state[key]=values.includes(value)?values.filter(v=>v!==value).join(','):[...values,value].join(',');render();}
function kreditIcon(value){return `<svg class="kredit-icon" width="38" height="34" viewBox="0 0 38 34" aria-hidden="true"><text x="22" y="26" text-anchor="end" class="kredit-primary">${value}</text>${value==='7'?'<text x="24" y="26" class="kredit-plus">+</text>':''}<text x="26" y="14" class="kredit-k">K</text></svg>`;}
function createFilters(id, key, values) {
 const iconChoice = ['nation', 'type', 'rarity'].includes(key);
 $(id).innerHTML = values.map(item => {
  const value = String(item);
  let label = value;
  if (key === 'cost') label = value === '7' ? '7K 及以上' : value + 'K';
  if (key === 'rarity') label = value + '卡 · ' + rarityNames[value];
  const attributes = iconChoice ? 'role="checkbox" aria-checked="false"' : 'aria-pressed="false"';
  const icon = key === 'cost' ? kreditIcon(value) : officialIcons[value] || '';
  return `<button class="pill" data-key="${key}" data-value="${esc(value)}" ${attributes} aria-label="${esc(label)}" title="${esc(label)}">${icon}<span class="control-label">${esc(label)}</span></button>`;
 }).join('');
 $(id).addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) toggleFilter(key, button.dataset.value);
 });
}
createFilters('nationFilters','nation',['德国','英国','苏联','美国','日本','中国','意大利','法国','波兰','芬兰','澳新军团']);
createFilters('costFilters','cost',[0,1,2,3,4,5,6,7]);
createFilters('typeFilters','type',['步兵','炮兵','坦克','轰炸机','战斗机','指令','反制']);
createFilters('rarityFilters','rarity',['铁','铜','银','金']);
createFilters('roleFilters','role',['曲线','对策']);
function visual(c, lazy = true, context = 'grid') {
 if (!c.image) return `<div class="missing-card"><span class="missing-cost">${c.cost}<small>K</small></span><span class="missing-mark">✦</span><strong>${esc(c.name)}</strong><p>${esc(c.type)} · ${esc(c.rarity)}卡</p><small>暂无同名卡图</small></div>`;
 const preview = lazy && c.previews;
 const sizes = context === 'reference' ? '150px' : context === 'intelligence'
  ? '(min-width: 1440px) 360px, (min-width: 960px) 26vw, 60vw'
  : '(min-width: 1370px) 300px, (min-width: 1080px) calc((100vw - 170px) / 4), (min-width: 720px) calc((100vw - 140px) / 3), calc((100vw - 70px) / 2)';
 return `<img src="${preview ? preview['360'] : c.image}" ${preview ? `srcset="${preview['360']} 360w, ${preview['720']} 720w" sizes="${sizes}"` : ''} alt="${esc(c.name)}卡面设计稿" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" width="1448" height="2034">`;
}
function render(){
 visible=filterCards(cards,state);
 if(state.sort==='cost-asc')visible.sort((a,b)=>a.cost-b.cost||a.row-b.row);
 if(state.sort==='cost-desc')visible.sort((a,b)=>b.cost-a.cost||a.row-b.row);
 if(state.sort==='rarity')visible.sort((a,b)=>rarityOrder[b.rarity]-rarityOrder[a.rarity]||a.cost-b.cost);
 if(state.sort==='name')visible.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
 $('grid').innerHTML=visible.map(c=>`<article class="card"><button class="card-open" data-open="${c.id}" aria-label="查看${esc(c.name)}详情"><span class="card-visual">${visual(c)}</span><span class="card-caption"><strong>${esc(c.name)}</strong><small>${esc(c.costText)}</small></span></button></article>`).join('');
 $('resultCount').textContent=visible.length;$('total').textContent=cards.length;$('allCount').textContent=cards.length;$('empty').hidden=visible.length>0;
 document.querySelectorAll('.pill').forEach(button => {
  const selected = selections(state[button.dataset.key]).includes(button.dataset.value);
  button.classList.toggle('selected', selected);
  const attribute = ['nation', 'type', 'rarity'].includes(button.dataset.key) ? 'aria-checked' : 'aria-pressed';
  button.setAttribute(attribute, selected);
 });
 const tags=[];
 for(const key of ['nation','cost','type','rarity','role'])for(const value of selections(state[key]))tags.push({key,value,label:key==='cost'?'花费：'+(value==='7'?'7+':value):key==='rarity'?value+'卡':value});
 if(state.query)tags.push({key:'query',value:state.query,label:state.query});
 $('activeFilters').innerHTML=tags.map(t=>`<button class="filter-tag" data-remove-key="${t.key}" data-remove-value="${esc(t.value)}" aria-label="移除筛选：${esc(t.label)}">${esc(t.label)}</button>`).join('');
 $('reset').hidden=tags.length===0;$('filterCount').textContent=tags.length||'';$('mobileResultCount').textContent=visible.length;
 window.scrollReveal?.refresh();
}
function reset(){Object.assign(state,{nation:'',cost:'',type:'',rarity:'',role:'',query:'',sort:'cost-asc'});$('search').value='';$('sort').value='cost-asc';render();}
function showDetail(id, keepTrail = false) {
 const card = detailCards.get(id);
 if (!card) return;
 if (!keepTrail) { referenceTrail = []; detailRootId = id; }
 currentId = id;
 $('detailNation').textContent = card.nation;
 $('detailName').textContent = card.name;
 const rules = card.rules || [];
 $('detailSub').innerHTML = rules.map(rule => `<p class="rule-${rule.kind === 'keywords' ? 'keywords' : 'effect'}">${esc(rule.text)}</p>`).join('');
 $('detailSub').hidden = rules.length === 0;
 $('detailImage').innerHTML = `<div class="detail-card-art">${visual(card, false)}</div>`;
 const fields = [
  ['国家', card.nation],
  ...(card.rarity ? [['稀有度', `${rarityNames[card.rarity]}（${card.rarity}卡）`]] : []),
  ['类型', card.unitType || card.type],
  ['花费', card.costText]
 ];
 if (card.operationCost !== undefined) fields.push(['行动花费', `${card.operationCost}K`]);
 if (card.role) fields.push(['脱手性', card.role]);
 const references = (card.references || []).map(ident => detailCards.get(ident));
 $('detailFields').innerHTML = fields.map(([label, value]) => `<li><strong>${esc(label)}</strong><span>${esc(value)}</span></li>`).join('') +
  (references.length ? `<li class="detail-reference"><strong>参考</strong><div class="reference-cards">${references.map(item => `<button class="reference-card" data-reference="${esc(item.id)}" aria-label="查看${esc(item.name)}详情" title="${esc(item.name)}">${visual(item, true, 'reference')}</button>`).join('')}</div></li>` : '');
 const position = visible.findIndex(item => item.id === id);
 $('detailPosition').textContent = position < 0 ? '' : `${position + 1} / ${visible.length}`;
 $('previous').disabled = position <= 0;
 $('next').disabled = position < 0 || position >= visible.length - 1;
 for (const id of ['previous', 'next', 'detailPosition']) $(id).hidden = activePage !== 'collection';
 $('detailBack').hidden = referenceTrail.length === 0;
 $('detailBack').textContent = referenceTrail.length ? `← 返回${detailCards.get(referenceTrail.at(-1)).name}` : '';
 $('detail').scrollTop = 0;
 if (!$('detail').open) {
  lastFocus = document.activeElement;
  $('detail').showModal();
  $('closeDetail').focus();
 }
}
function openReference(id) {
 if (!detailCards.get(currentId)?.references?.includes(id)) return;
 referenceTrail.push(currentId);
 showDetail(id, true);
 $('detailBack').focus();
}
function backFromReference() {
 const id = referenceTrail.pop();
 if (id) { showDetail(id, true); $('closeDetail').focus(); }
}
document.getElementById('detailFields').addEventListener('click', event => {
 const button = event.target.closest('[data-reference]');
 if (button) openReference(button.dataset.reference);
});
$('detailBack').addEventListener('click', backFromReference);
function moveDetail(delta){const pos=visible.findIndex(c=>c.id===currentId);if(pos>=0&&visible[pos+delta])showDetail(visible[pos+delta].id);}
function showPage(page, scroll = true) {
 const changed = activePage !== page;
 if (changed && activePage) pageScroll[activePage] = window.scrollY;
 const pages = {collection:'收藏',intelligence:'情报',monitoring:'监察'};
 if (!pages[page]) page='collection';
 for (const name of Object.keys(pages)) $(name).hidden = name !== page;
 document.body.dataset.page = page;
 document.title = `${pages[page]} · Karounds 拓展`;
 for (const name of Object.keys(pages)) {
  const active = name === page;
  $(name+'Nav').classList.toggle('active', active);
  $(name+'Nav').setAttribute('aria-current', active ? 'page' : 'false');
 }
 activePage = page;
 if (scroll && changed) window.scrollTo({top: pageScroll[page], behavior: 'instant'});
 if (page==='intelligence') layoutIntelligenceCards();
 if (page==='monitoring') window.CatalogMonitor?.show();
 window.scrollReveal?.refresh();
}
function navigatePage(page, event) {
 event?.preventDefault();
 if (window.location.hash !== `#${page}`) window.history.pushState(null, '', `#${page}`);
 showPage(page);
}
// Positions follow the official CardFan V / U / P algorithms (960px breakpoint).
function intelligenceFanLayout(count, width, desktop, align) {
 const height = width * .8;
 if (desktop && count === 2) {
  const size = width * .45, cardHeight = size * 1.4;
  const center = width / 2 - size / 2, left = align === 'left';
  return [0, 1].map(index => ({
   width: size, x: center + (left ? -1 : 1) * (index ? -1 : 1) * .35 * size,
   y: height / 2 - cardHeight / 2,
   angle: index ? (left ? 8 : -8) : 0,
   origin: left ? '95% 95%' : '5% 95%', layer: index + 1
  }));
 }
 if (desktop && count === 3) {
  const size = width * .4, cardHeight = size * 1.4, left = align === 'left';
  const center = (width / 2 - size / 2) * (left ? 1.05 : .9);
  const top = height / 2 - cardHeight / 2;
  return [
   {x: left ? 0 : width - size, y: top - .15 * cardHeight, angle: left ? -8 : 8},
   {x: center + (left ? -.05 : .15) * size, y: top - .05 * cardHeight, angle: left ? 8 : -8},
   {x: left ? width - 1.2 * size : .15 * size, y: top + .2 * cardHeight, angle: left ? 24 : -24}
  ].map((position, index) => ({...position, width: size, origin: '50% 50%', layer: 3 - index}));
 }
 const size = .5 * width * (1 - count / 25), cardHeight = size * 1.4;
 return Array.from({length: count}, (_, index) => {
  const offset = Math.floor(count / 2) - index - (count % 2 === 0 ? .5 : 0);
  return {width: size, x: ((width - size) / 2 + offset * .4 * size) * 1.1,
   y: (height - cardHeight) / 2 + Math.abs(offset * .1 * cardHeight),
   angle: offset * 15, origin: '50% 50%', layer: index + 1};
 });
}
function layoutIntelligenceCards() {
 const desktop = window.matchMedia('(min-width: 960px)').matches;
 for (const fan of document.querySelectorAll('.intel-fan')) {
  const width = fan.getBoundingClientRect().width;
  if (!width) continue;
  const positions = intelligenceFanLayout(fan.children.length, width, desktop, fan.dataset.align);
  Array.from(fan.children).forEach((card, index) => {
   const position = positions[index];
   card.style.setProperty('--card-width', `${position.width}px`);
   card.style.setProperty('--card-x', `${position.x}px`);
   card.style.setProperty('--card-y', `${position.y}px`);
   card.style.setProperty('--card-angle', `${position.angle}deg`);
   card.style.setProperty('--card-origin', position.origin);
   card.style.setProperty('--card-layer', position.layer);
  });
 }
}
function renderIntelligenceCards() {
 const groups = window.CARD_DATA.intelligenceGroups;
 if (!groups) throw new Error('图鉴缺少中枢 UID 引用组，请重新导入');
 for (const [id, uids] of Object.entries(groups)) {
  $(id).innerHTML = uids.map(uid => {
   const card = cardsByUid.get(uid);
   if (!card) throw new Error(`情报页缺少卡牌 UID：${uid}`);
   return `<button class="intel-card" data-intel-card="${esc(card.id)}" aria-label="查看${esc(card.name)}详情" title="${esc(card.name)}"><span class="intel-card-inner">${visual(card, true, 'intelligence')}</span></button>`;
  }).join('');
  $(id).addEventListener('click', event => {
   const button = event.target.closest('[data-intel-card]');
   if (button) showDetail(button.dataset.intelCard);
  });
 }
}
$('grid').addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open)showDetail(open.dataset.open);});
$('grid').addEventListener('error',e=>{if(e.target.tagName==='IMG'){const c=cards.find(c=>c.image===e.target.getAttribute('src')||Object.values(c.previews||{}).includes(e.target.getAttribute('src')));e.target.replaceWith(Object.assign(document.createElement('span'),{className:'missing-card',textContent:`${c?.name||'卡面'}：图片加载失败，请刷新重试`}));}},true);
$('search').addEventListener('input',e=>{state.query=e.target.value.trim();render();});$('sort').addEventListener('change',e=>{state.sort=e.target.value;render();});$('reset').addEventListener('click',reset);$('emptyReset').addEventListener('click',reset);$('closeDetail').addEventListener('click',()=>$('detail').close());$('previous').addEventListener('click',()=>moveDetail(-1));$('next').addEventListener('click',()=>moveDetail(1));$('detail').addEventListener('close',()=>{const id=detailRootId;currentId=null;referenceTrail=[];detailRootId=null;const target=document.querySelector(`[data-open="${id}"]`);((activePage==='collection'?target:null)||lastFocus||$('search')).focus();});
$('activeFilters').addEventListener('click',e=>{const tag=e.target.closest('[data-remove-key]');if(!tag)return;const key=tag.dataset.removeKey;if(key==='query'){state.query='';$('search').value='';render();}else toggleFilter(key,tag.dataset.removeValue);});
$('intelligenceNav').addEventListener('click',event=>navigatePage('intelligence',event));
$('monitoringNav').addEventListener('click',event=>navigatePage('monitoring',event));
$('collectionNav').addEventListener('click',event=>navigatePage('collection',event));
for (const link of document.querySelectorAll('a[href="#collection"]:not(#collectionNav)')) link.addEventListener('click',event=>navigatePage('collection',event));
$('openFilters').addEventListener('click',()=>{$('filterDialogBody').appendChild($('filterPanel'));$('filterDialog').showModal();$('closeFilters').focus();});
$('closeFilters').addEventListener('click',()=>$('filterDialog').close());
$('applyFilters').addEventListener('click',()=>$('filterDialog').close());
$('filterDialog').addEventListener('close',()=>{$('filterHome').appendChild($('filterPanel'));$('openFilters').focus();});
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target!==d)return;if(d.id==='detail'){d.close();return;}const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
document.addEventListener('keydown',e=>{if($('detail').open){if(e.key==='ArrowLeft'&&activePage==='collection')moveDetail(-1);if(e.key==='ArrowRight'&&activePage==='collection')moveDetail(1);return;}if(e.key==='/'&&activePage==='collection'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
render();
renderIntelligenceCards();
window.addEventListener('resize', layoutIntelligenceCards);
function pageFromHash(){return ['intelligence','monitoring'].includes(window.location.hash.slice(1))?window.location.hash.slice(1):'collection';}
window.CatalogActions={hasUid:uid=>cardsByUid.has(uid),openUid(uid){const card=cardsByUid.get(uid);if(card)showDetail(card.id);}};
window.addEventListener('hashchange',()=>showPage(pageFromHash()));
window.addEventListener('popstate',()=>showPage(pageFromHash()));
showPage(pageFromHash(), false);
