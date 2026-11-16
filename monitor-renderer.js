/* Shared monitor renderer. Catalog copy is generated; maintain this source only. */
window.createCardMonitor=function(monitorRoot,options){
'use strict';
const monitorElement=id=>monitorRoot.querySelector(`[data-monitor="${id}"]`) || monitorRoot.querySelector('#'+id);
const expansion = monitorElement('expansion');
const refreshButton = monitorElement('refresh');
const charts = monitorElement('charts');
const summary = monitorElement('summary');
const coverage = monitorElement('coverage');
const cardRows = monitorElement('cards');
const clearChart = monitorElement('clear-chart');
const status = monitorElement('status');
const colors = {gold:'#ae8b44',silver:'#8694a1',bronze:'#a76e50',iron:options.dark?'#a1ae97':'#444c52',unit:'#4c7771',order:'#657f9a',curve:'#4c7771',policy:'#a76e50',blank:'#c7cbd0'};
const tones=options.dark?{ink:'#ebebdc',muted:'#b6bdac',grid:'#454d3e',label:'#d0d5c6'}:{ink:'#171717',muted:'#737373',grid:'#eee',label:'#555'};
let allCards = [], currentCards = [], selection = null, plots = [];

function rarity(card) {
  return ['金','银','铜','铁'].includes(card.rarity?.[0]) ? card.rarity[0] : '暂缺';
}
function role(card) {
  return card.role || (card.roleStatus === '待填' ? '待填' : '未填写');
}
function expansionKey(card) {
  return card.expansion && card.expansion !== '未设定' ? card.expansion : '__missing__';
}
function hasCost(card) {
  return Number.isInteger(card.cost) && card.cost >= 0;
}
function costCategories(cards) {
  const values = new Set(Array.from({length:13},(_,index) => index));
  for (const card of cards) if (hasCost(card)) values.add(card.cost);
  const categories = [...values].sort((first,second) => first-second).map(value => ({label:`${value}K`,test:card => card.cost === value}));
  if (cards.some(card => !hasCost(card))) categories.push({label:'暂缺',test:card => !hasCost(card)});
  return categories;
}
function rarityCategories(cards) {
  const values = ['金','银','铜','铁'];
  if (cards.some(card => rarity(card) === '暂缺')) values.push('暂缺');
  return values.map(value => ({label:value,color:({金:colors.gold,银:colors.silver,铜:colors.bronze,铁:colors.iron})[value] || colors.blank,test:card => rarity(card) === value}));
}
function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function showCards() {
  const cards = selection ? currentCards.filter(selection.test) : currentCards;
  const actions=options.actions?.();
  monitorElement('cards-title').textContent = `${selection?.label || '卡牌明细'} · ${cards.length} 张`;
  clearChart.hidden = !selection;
  cardRows.replaceChildren();
  for (const card of cards) {
    const row = document.createElement('tr');
    const state = '已确认';
    const values = [String(card.uid).padStart(6,'0'),card.name,card.nation || '暂缺',card.scope.join('、'),card.unitType || card.type || '暂缺',rarity(card),hasCost(card) ? `${card.cost}K` : '暂缺',role(card),state];
    values.forEach((value,index)=>{const cell=element('td');if(index===1 && actions?.hasUid(card.uid)){const button=element('button',value,'monitor-card-link');button.addEventListener('click',()=>actions.openUid(card.uid));cell.append(button);}else cell.textContent=value;row.append(cell);});
    cardRows.append(row);
  }
  if (!cards.length) {
    const row = element('tr');
    const cell = element('td','没有符合条件的卡牌','empty');cell.colSpan = 9;
    row.append(cell);cardRows.append(row);
  }
}
function selectBucket(label,test) {
  selection = {label,test};showCards();
  monitorElement('cards-title').scrollIntoView({behavior:'smooth',block:'start'});
}
clearChart.addEventListener('click',() => {selection=null;showCards();});

function createChart(title,cards,categories,series,kind='bar',note='',wide=false) {
  const section = element('section',undefined,wide ? 'chart wide' : 'chart');
  section.append(element('h2',title),element('p',`${cards.length} 张${note ? ' · '+note : ''}`,'chart-note'));
  const plot = element('div',undefined,'chart-plot');
  const canvas = element('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',title+'，数据可在下方展开查看');
  const tooltip = element('div',undefined,'tooltip');tooltip.hidden=true;
  plot.append(canvas,tooltip);section.append(plot);
  const buckets = categories.map(category => series.map(item => cards.filter(card => category.test(card) && item.test(card))));
  const legend = element('div',undefined,'legend');
  const legendItems = kind === 'donut' ? categories : series;
  for (const item of legendItems) {
    const label = element('span');const swatch = element('i');swatch.style.setProperty('--swatch',item.color);
    label.append(swatch,document.createTextNode(item.label));legend.append(label);
  }
  section.append(legend);
  const details = element('details',undefined,'chart-data');details.append(element('summary','查看数据'));
  const table = element('table');const head = element('thead');const headRow = element('tr');headRow.append(element('th',kind === 'donut' ? '稀有度' : '花费'));
  for (const item of series) headRow.append(element('th',item.label));
  head.append(headRow);table.append(head);
  const body = element('tbody');
  categories.forEach((category,index) => {
    const row = element('tr');row.append(element('td',category.label));
    series.forEach((item,seriesIndex) => {
      const cell = element('td');const button = element('button',String(buckets[index][seriesIndex].length));
      button.setAttribute('aria-label',`${title} ${category.label} ${item.label} ${buckets[index][seriesIndex].length} 张`);
      button.addEventListener('click',() => selectBucket(`${title} · ${category.label} · ${item.label}`,card => cards.includes(card) && category.test(card) && item.test(card)));
      cell.append(button);row.append(cell);
    });body.append(row);
  });
  table.append(body);details.append(table);section.append(details);charts.append(section);
  const model = {canvas,plot,tooltip,title,cards,categories,series,kind,buckets,hits:[]};plots.push(model);
  canvas.addEventListener('mousemove',event => {
    const bounds=canvas.getBoundingClientRect();const x=event.clientX-bounds.left,y=event.clientY-bounds.top;
    const hit=model.hits.find(hit => hit.contains(x,y));
    canvas.style.cursor=hit?'pointer':'default';tooltip.hidden=!hit;
    if (!hit) return;
    tooltip.textContent=hit.label;
    tooltip.style.left=Math.max(0,Math.min(x+10,bounds.width-180))+'px';
    tooltip.style.top=Math.max(0,y-40)+'px';
  });
  canvas.addEventListener('mouseleave',() => {tooltip.hidden=true;});
  canvas.addEventListener('click',event => {
    const bounds=canvas.getBoundingClientRect();
    const hit=model.hits.find(hit => hit.contains(event.clientX-bounds.left,event.clientY-bounds.top));
    if(hit)selectBucket(hit.label,hit.test);
  });
}

function drawChart(model) {
  const {canvas,plot,cards,categories,series,kind,buckets} = model;
  const width=plot.clientWidth,height=plot.clientHeight,ratio=window.devicePixelRatio || 1;
  if (!width) return;
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  const context=canvas.getContext('2d');context.scale(ratio,ratio);
  const family=getComputedStyle(canvas).fontFamily;
  context.font=`11px ${family}`;context.fillStyle=tones.muted;context.textAlign='center';model.hits=[];
  if (!cards.length) {context.fillText('暂无卡牌',width/2,height/2);return;}
  if (kind === 'donut') {
    const total=cards.length,cx=width/2,cy=height/2,radius=Math.min(width,height)*.37,inner=radius*.66;
    let start=-Math.PI/2;
    categories.forEach((category,index) => {
      const count=buckets[index][0].length;if (!count) return;
      const end=start+count/total*Math.PI*2;
      context.beginPath();context.arc(cx,cy,radius,start,end);context.arc(cx,cy,inner,end,start,true);context.closePath();
      context.fillStyle=category.color;context.fill();
      const from=start,to=end;
      model.hits.push({label:`${category.label} · ${count} 张 · ${(count/total*100).toFixed(1)}%`,test:card => cards.includes(card) && category.test(card),contains:(x,y) => {
        const distance=Math.hypot(x-cx,y-cy);let angle=Math.atan2(y-cy,x-cx);if(angle< -Math.PI/2)angle+=Math.PI*2;
        return distance>=inner && distance<=radius && angle>=from && angle<=to;
      }});start=end;
    });
    context.fillStyle=tones.ink;context.font=`28px ${family}`;context.fillText(String(total),cx,cy+4);
    context.fillStyle=tones.muted;context.font=`12px ${family}`;context.fillText('张',cx,cy+26);return;
  }
  const left=32,right=12,top=18,bottom=30,plotWidth=width-left-right,plotHeight=height-top-bottom;
  const maximum=Math.max(1,...buckets.map(row => row.reduce((total,bucket) => total+bucket.length,0)));
  const step=Math.max(1,Math.ceil(maximum/4)),ceiling=step*4;
  context.textAlign='right';
  for(let index=0;index<=4;index++) {
    const value=index*step,y=top+plotHeight-value/ceiling*plotHeight;
    context.strokeStyle=tones.grid;context.beginPath();context.moveTo(left,y);context.lineTo(width-right,y);context.stroke();
    context.fillStyle=tones.muted;context.fillText(String(value),left-7,y+4);
  }
  const band=plotWidth/categories.length;
  context.textAlign='center';
  categories.forEach((category,index) => {
    const x=left+(index+.5)*band;
    context.fillStyle=tones.muted;context.fillText(category.label,x,height-8);
    let stacked=0;
    series.forEach((item,seriesIndex) => {
      const count=buckets[index][seriesIndex].length;
      const barWidth=Math.max(2,band*.6),barHeight=count/ceiling*plotHeight;
      const y=top+plotHeight-(stacked+count)/ceiling*plotHeight;
      if(kind!=='line') {context.fillStyle=item.color;context.fillRect(x-barWidth/2,y,barWidth,barHeight);}
      const label=`${category.label} · ${item.label} · ${count} 张`;
      if(kind!=='line' && count)model.hits.push({label,test:card => cards.includes(card) && category.test(card) && item.test(card),contains:(px,py) => px>=x-barWidth/2 && px<=x+barWidth/2 && py>=y && py<=y+barHeight});
      stacked+=count;
    });
    if(stacked && kind!=='line') {context.fillStyle=tones.label;context.fillText(String(stacked),x,top+plotHeight-stacked/ceiling*plotHeight-6);}
  });
  if(kind==='line') {
    const item=series[0];context.strokeStyle=item.color;context.lineWidth=2;context.beginPath();
    categories.forEach((category,index) => {
      const x=left+(index+.5)*band,y=top+plotHeight-buckets[index][0].length/ceiling*plotHeight;
      if(!index)context.moveTo(x,y);else context.lineTo(x,y);
    });context.stroke();
    categories.forEach((category,index) => {
      const count=buckets[index][0].length,x=left+(index+.5)*band,y=top+plotHeight-count/ceiling*plotHeight;
      context.fillStyle=item.color;context.beginPath();context.arc(x,y,3,0,Math.PI*2);context.fill();
      if(count){context.fillStyle=tones.label;context.fillText(String(count),x,y-8);}
      model.hits.push({label:`${category.label} · ${count} 张`,test:card => cards.includes(card) && category.test(card),contains:(px,py) => Math.abs(px-x)<band/2 && Math.abs(py-y)<15});
    });
  }
}

function render() {
  currentCards=allCards.filter(card => !expansion.value || expansionKey(card)===expansion.value);
  selection=null;plots=[];charts.replaceChildren();summary.replaceChildren();
  const units=currentCards.filter(card => card.type==='单位');
  const orders=currentCards.filter(card => card.type==='指令');
  const counters=currentCards.filter(card => card.type==='反制');
  const metrics=[['卡牌总数',currentCards.length],['单位',units.length],['指令',orders.length],['反制',counters.length]];
  for(const [name,count] of metrics) {const metric=element('div',undefined,'metric');metric.append(element('span',name),element('strong',String(count)));summary.append(metric);}
  const missingCost=currentCards.filter(card => !hasCost(card)).length;
  const missingRarity=currentCards.filter(card => rarity(card)==='暂缺').length;
  const missingRole=currentCards.filter(card => ['', '待填'].includes(card.role)).length;
  coverage.textContent=`费用暂缺 ${missingCost} · 稀有度暂缺 ${missingRarity} · 脱手性未填 ${missingRole}。点击图表或展开数据，可查看对应卡牌。`;
  const all={label:'总数',color:colors.iron,test:() => true};
  const costs=costCategories(currentCards);
  const raritySeries=rarityCategories(currentCards);
  createChart('费用与稀有度',currentCards,costs,raritySeries,'bar','',true);
  createChart('稀有度',currentCards,rarityCategories(currentCards),[all],'donut');
  createChart('单位稀有度',units,rarityCategories(units),[all],'donut');
  createChart('指令稀有度',orders,rarityCategories(orders),[all],'donut','反制单独计数');
  createChart('单位费用',units,costCategories(units),[{...all,color:colors.unit}]);
  createChart('指令费用',orders,costCategories(orders),[{...all,color:colors.order}],'bar','反制单独计数');
  const curve=currentCards.filter(card => role(card)==='曲线');
  createChart('曲线丰富度',curve,costCategories(curve),[{...all,label:'曲线',color:colors.curve}],'bar','曲线牌的费用分布');
  const roleSeries=[{label:'曲线',color:colors.curve,test:card => role(card)==='曲线'},{label:'对策',color:colors.policy,test:card => role(card)==='对策'}];
  for(const value of [...new Set(currentCards.map(role))].filter(value => !['曲线','对策'].includes(value)))roleSeries.push({label:value,color:colors.blank,test:card => role(card)===value});
  createChart('曲线与对策对比',currentCards,costs,roleSeries,'bar','按费用分组，未填写单列');
  createChart('费用',currentCards,costs,[all],'line');
  const common=currentCards.filter(card => ['铜','铁'].includes(rarity(card)));
  createChart('铜铁个数',common,costCategories(common),[all],'bar','铜卡与铁卡的费用分布');
  plots.forEach(drawChart);showCards();
}
let resizeTimer;
window.addEventListener('resize',() => {clearTimeout(resizeTimer);resizeTimer=setTimeout(() => plots.forEach(drawChart),100);});
expansion.addEventListener('change',render);
async function load() {
  refreshButton.disabled=true;status.textContent='正在读取中枢';
  try {
    const data=await options.loadData();
    if(!data || !Array.isArray(data.cards))throw new Error('监察资料缺失，请重新生成图鉴');
    const previous=expansion.disabled ? '进行曲' : expansion.value;
    allCards=data.cards;
    const packages=[...new Set(allCards.map(expansionKey))].sort((first,second) => first.localeCompare(second,'zh-CN'));
    expansion.replaceChildren(new Option('全部拓展包',''));
    for(const name of packages)expansion.append(new Option(name==='__missing__'?'暂缺':name,name));
    expansion.value=packages.includes(previous)?previous:'';expansion.disabled=false;
    monitorElement('error').hidden=true;status.textContent=options.status(data);render();
  } catch(error) {
    const message=monitorElement('error');message.textContent=error.message;message.hidden=false;status.textContent='读取失败';
  } finally {refreshButton.disabled=false;}
}
refreshButton.addEventListener('click',load);load();

return {show(){plots.forEach(drawChart);showCards();},count(){return currentCards.length;}};

};
