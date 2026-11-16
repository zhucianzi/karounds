window.CatalogMonitor=window.createCardMonitor(document.getElementById('monitoring'),{
 dark:true,
 loadData(){const data=window.CARD_DATA.monitoring;if(!data || data.revision!==window.CARD_DATA.hubRevision)throw new Error('监察资料缺失或版本不一致，请重新生成图鉴');return data;},
 actions:()=>window.CatalogActions,
 status:data=>`中枢实况 · 修订 ${data.revision}`
});
