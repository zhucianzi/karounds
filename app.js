/* Data stays a faithful snapshot of the source sheet. */
const cards = window.CARD_DATA.cards;
const $ = id => document.getElementById(id);
const officialIcons = {...window.OFFICIAL_ICONS, ...window.NATION_ICONS};
const rarityNames = {金:'精英',银:'特殊',铜:'限定',铁:'基础'};
const rarityClasses = {金:'gold',银:'silver',铜:'bronze',铁:'iron'};
const rarityOrder = {金:4,银:3,铜:2,铁:1};
const state = {nation:'',cost:'',type:'',rarity:'',role:'',query:'',sort:'cost-asc',favorites:false};
let saved = new Set();
let storageAvailable = true;
try { const raw = JSON.parse(localStorage.getItem('china-collection-favorites-v1') || '[]'); if(!Array.isArray(raw)) throw new Error('Invalid favorites'); saved = new Set(raw.filter(id=>cards.some(c=>c.id===id))); } catch { storageAvailable=false; }
let visible = cards.slice(), currentId = null, lastFocus = null, toastTimer;
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
  (!filters.query || card.name.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase())) &&
  (!filters.favorites || saved.has(card.id))
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
function visual(c,lazy=true){return c.image?`<img src="${c.image}" alt="${esc(c.name)}卡面设计稿" ${lazy?'loading="lazy"':''} decoding="async" width="1448" height="2034">`:`<div class="missing-card"><span class="missing-cost">${c.cost}<small>K</small></span><span class="missing-mark">✦</span><strong>${esc(c.name)}</strong><p>${esc(c.type)} · ${esc(c.rarity)}卡</p><small>暂无同名卡图</small></div>`;}
function render(){
 visible=filterCards(cards,state);
 if(state.sort==='cost-asc')visible.sort((a,b)=>a.cost-b.cost||a.row-b.row);
 if(state.sort==='cost-desc')visible.sort((a,b)=>b.cost-a.cost||a.row-b.row);
 if(state.sort==='rarity')visible.sort((a,b)=>rarityOrder[b.rarity]-rarityOrder[a.rarity]||a.cost-b.cost);
 if(state.sort==='name')visible.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
 $('grid').innerHTML=visible.map(c=>`<article class="card"><button class="card-open" data-open="${c.id}" aria-label="查看${esc(c.name)}详情"><span class="card-visual">${visual(c)}</span><span class="card-caption"><strong>${esc(c.name)}</strong><small>${esc(c.costText)}</small></span></button><button class="save-card" data-save="${c.id}" aria-pressed="${saved.has(c.id)}" aria-label="${saved.has(c.id)?'取消收藏':'收藏'}${esc(c.name)}">${saved.has(c.id)?'★':'☆'}</button></article>`).join('');
 $('resultCount').textContent=visible.length;$('total').textContent=cards.length;$('allCount').textContent=cards.length;$('favoriteCount').textContent=saved.size;$('empty').hidden=visible.length>0;
 $('favoriteFilter').setAttribute('aria-pressed',state.favorites);
 document.querySelectorAll('.pill').forEach(button => {
  const selected = selections(state[button.dataset.key]).includes(button.dataset.value);
  button.classList.toggle('selected', selected);
  const attribute = ['nation', 'type', 'rarity'].includes(button.dataset.key) ? 'aria-checked' : 'aria-pressed';
  button.setAttribute(attribute, selected);
 });
 const tags=[];
 for(const key of ['nation','cost','type','rarity','role'])for(const value of selections(state[key]))tags.push({key,value,label:key==='cost'?'花费：'+(value==='7'?'7+':value):key==='rarity'?value+'卡':value});
 if(state.query)tags.push({key:'query',value:state.query,label:state.query});
 if(state.favorites)tags.push({key:'favorites',value:'true',label:'只看收藏'});
 $('activeFilters').innerHTML=tags.map(t=>`<button class="filter-tag" data-remove-key="${t.key}" data-remove-value="${esc(t.value)}" aria-label="移除筛选：${esc(t.label)}">${esc(t.label)}</button>`).join('');
 $('reset').hidden=tags.length===0;$('filterCount').textContent=tags.length||'';$('mobileResultCount').textContent=visible.length;
}
function reset(){Object.assign(state,{nation:'',cost:'',type:'',rarity:'',role:'',query:'',sort:'cost-asc',favorites:false});$('search').value='';$('sort').value='cost-asc';render();}
function toggleSave(id){if(!storageAvailable){toast('浏览器存储不可用，暂时无法保存收藏');return;}const updated=new Set(saved);updated.has(id)?updated.delete(id):updated.add(id);try{localStorage.setItem('china-collection-favorites-v1',JSON.stringify([...updated]));saved=updated;}catch{toast('收藏保存失败，请检查浏览器存储空间');return;}render();if(currentId)updateDetailFavorite();}
function updateDetailFavorite(){$('detailFavorite').textContent=saved.has(currentId)?'★ 已收藏 · 点击取消':'☆ 收藏这张卡牌';$('detailFavorite').setAttribute('aria-pressed',saved.has(currentId));}
function showDetail(id) {
 const card = cards.find(item => item.id === id);
 if (!card) return;
 currentId = id;
 $('detailNation').textContent = card.nation;
 $('detailName').textContent = card.name;
 const rules = card.rules || [];
 $('detailSub').innerHTML = rules.map(rule => `<p class="rule-${rule.kind === 'keywords' ? 'keywords' : 'effect'}">${esc(rule.text)}</p>`).join('');
 $('detailSub').hidden = rules.length === 0;
 $('detailImage').innerHTML = `<div class="detail-card-art">${visual(card, false)}</div>`;
 const fields = [
  ['国家', card.nation],
  ['稀有度', `${rarityNames[card.rarity]}（${card.rarity}卡）`],
  ['类型', card.unitType || card.type],
  ['花费', card.costText]
 ];
 if (card.operationCost !== undefined) fields.push(['行动花费', `${card.operationCost}K`]);
 if (card.role) fields.push(['脱手性', card.role]);
 $('detailFields').innerHTML = fields.map(([label, value]) => `<li><strong>${esc(label)}</strong><span>${esc(value)}</span></li>`).join('');
 const position = visible.findIndex(item => item.id === id);
 $('detailPosition').textContent = position < 0 ? '' : `${position + 1} / ${visible.length}`;
 $('previous').disabled = position <= 0;
 $('next').disabled = position < 0 || position >= visible.length - 1;
 updateDetailFavorite();
 if (!$('detail').open) {
  lastFocus = document.activeElement;
  $('detail').showModal();
  $('closeDetail').focus();
 }
}
function moveDetail(delta){const pos=visible.findIndex(c=>c.id===currentId);if(pos>=0&&visible[pos+delta])showDetail(visible[pos+delta].id);}
$('grid').addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save){toggleSave(save.dataset.save);return;}const open=e.target.closest('[data-open]');if(open)showDetail(open.dataset.open);});
$('grid').addEventListener('error',e=>{if(e.target.tagName==='IMG'){const c=cards.find(c=>c.image===e.target.getAttribute('src'));e.target.replaceWith(Object.assign(document.createElement('span'),{className:'missing-card',textContent:`${c?.name||'卡面'}：图片加载失败，请刷新重试`}));}},true);
$('search').addEventListener('input',e=>{state.query=e.target.value.trim();render();});$('sort').addEventListener('change',e=>{state.sort=e.target.value;render();});$('favoriteFilter').addEventListener('click',()=>{state.favorites=!state.favorites;render();});$('favoritesNav').addEventListener('click',()=>{state.favorites=true;render();$('collection').scrollIntoView();});$('reset').addEventListener('click',reset);$('emptyReset').addEventListener('click',reset);$('closeDetail').addEventListener('click',()=>$('detail').close());$('detailFavorite').addEventListener('click',()=>toggleSave(currentId));$('previous').addEventListener('click',()=>moveDetail(-1));$('next').addEventListener('click',()=>moveDetail(1));$('detail').addEventListener('close',()=>{const id=currentId;currentId=null;const target=document.querySelector(`[data-open="${id}"]`);(target||lastFocus||$('search')).focus();});$('sourceInfo').addEventListener('click',()=>$('sourceDialog').showModal());$('closeSource').addEventListener('click',()=>$('sourceDialog').close());
$('activeFilters').addEventListener('click',e=>{const tag=e.target.closest('[data-remove-key]');if(!tag)return;const key=tag.dataset.removeKey;if(key==='query'){state.query='';$('search').value='';render();}else if(key==='favorites'){state.favorites=false;render();}else toggleFilter(key,tag.dataset.removeValue);});
$('aboutNav').addEventListener('click',()=>$('sourceDialog').showModal());
$('collectionNav').addEventListener('click',()=>{state.favorites=false;render();});
$('openFilters').addEventListener('click',()=>{$('filterDialogBody').appendChild($('filterPanel'));$('filterDialog').showModal();$('closeFilters').focus();});
$('closeFilters').addEventListener('click',()=>$('filterDialog').close());
$('applyFilters').addEventListener('click',()=>$('filterDialog').close());
$('filterDialog').addEventListener('close',()=>{$('filterHome').appendChild($('filterPanel'));$('openFilters').focus();});
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target!==d)return;if(d.id==='detail'){d.close();return;}const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
document.addEventListener('keydown',e=>{if($('detail').open){if(e.key==='ArrowLeft')moveDetail(-1);if(e.key==='ArrowRight')moveDetail(1);return;}if(e.key==='/'&&!$('sourceDialog').open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
render();

