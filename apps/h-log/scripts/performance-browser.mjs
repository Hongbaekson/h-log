import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { verifyBrainDiscovery } from './brain-discovery.browser-check.mjs';

async function chooseLayout(page,layout) {
  if(await page.getByRole('button',{name:'필터 열기',exact:true}).isVisible())await page.getByRole('button',{name:'필터 열기',exact:true}).click();
  const button=page.locator(`button[data-layout="${layout}"]`).filter({visible:true});
  await button.evaluate((button,layout)=>{
    window.__perfInteraction=null;
    button.addEventListener('click',()=>{
      const started=performance.now();
      const ready=()=>{if(document.querySelector('.mem-app')?.dataset.layout!==layout)return;
        observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__perfInteraction=performance.now()-started;}));};
      const observer=new MutationObserver(ready);observer.observe(document.querySelector('.mem-app'),{attributes:true});ready();
    },{once:true});
  },layout);
  await button.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__perfInteraction!==null,{},{timeout:120000});
  const duration=await page.evaluate(()=>window.__perfInteraction);
  if(await page.getByRole('button',{name:'필터 닫기',exact:true}).isVisible())await page.getByRole('button',{name:'필터 닫기',exact:true}).click();
  return duration;
}

export async function measureBrainBrowser(browser,origin,graph,output,checkAbort) {
  const samples=[];
  for(const width of [1440,390])for(const rate of [1,4])for(let repeat=0;repeat<3;repeat++) {
    checkAbort();
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
    const errors=[];
    try {
      const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',error=>errors.push(error.name));
      const cdp=await context.newCDPSession(page);
      // Playwright routing disables the HTTP cache; CDP interception keeps cache measurements meaningful.
      await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
      cdp.on('Fetch.requestPaused',event=>{
        const local=new URL(event.request.url).origin===origin;
        void cdp.send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId:event.requestId}:{requestId:event.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
      });
      await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
      await cdp.send('Emulation.setCPUThrottlingRate',{rate});
      await cdp.send('Performance.enable');
      await page.addInitScript(()=>{
        window.__perfLongTasks=[];
        new PerformanceObserver(list=>window.__perfLongTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
      });
      for(const cache of ['cold','warm']) {
        checkAbort();
        await page.goto(origin+'/brain',{waitUntil:'load',timeout:120000});
        await page.waitForFunction(()=>document.querySelector('[data-node][style*="translate"]')&&!document.querySelector('.mem-loading'),{},{timeout:120000});
        assert.equal(await page.locator('[data-node]').count(),graph.nodes.length);
        const initial=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),maxLongTask:Math.max(0,...window.__perfLongTasks),cachedScripts:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script'&&r.transferSize===0&&r.decodedBodySize>0).length}));
        if(cache==='warm')assert(initial.cachedScripts>0,'Warm browser must reuse cached script bytes');
        await cdp.send('HeapProfiler.collectGarbage');
        const before=(await cdp.send('Runtime.getHeapUsage')).usedSize;
        const interaction=await chooseLayout(page,'topics');
        if(repeat===0)await page.screenshot({path:join(output,`brain-${graph.nodes.length}-${width}-${rate}-${cache}.png`)});
        await chooseLayout(page,'brain');
        await cdp.send('HeapProfiler.collectGarbage');
        const after=(await cdp.send('Runtime.getHeapUsage')).usedSize;
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://hlog.example.org/brain');
        assert.deepEqual(errors,[]);
        samples.push({nodes:graph.nodes.length,edges:graph.edges.length,width,height:900,cpuRate:rate,cache,repeat,
          graph_interaction_ms:interaction,retained_heap_bytes:after,heap_before_bytes:before,heap_delta_bytes:after-before,
          load_ms:initial.navigation.loadEventEnd,decoded_html_bytes:initial.navigation.decodedBodySize,cached_scripts:initial.cachedScripts,max_initial_long_task_ms:initial.maxLongTask});
      }
    } finally {await context.close();}
  }
  await writeFile(join(output,`browser-${graph.nodes.length}.json`),JSON.stringify(samples,null,2)+'\n');
  return samples;
}

export async function verifyProtectedUi(browser,origin,graph,output) {
  const discovery=await verifyBrainDiscovery(browser,origin,graph,output);
  for(const width of [1440,390,320]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    try {
      const page=await context.newPage();page.setDefaultTimeout(30000);
      await page.goto(origin+'/');await page.locator('.skills-radar').waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:join(output,`home-${width}.png`),fullPage:true});
      await page.goto(origin+'/brain');await page.locator('[data-node][style*="translate"]').first().waitFor({state:'attached'});
      for(const layout of ['free','topics','hierarchy','timeline','brain']) {
        await chooseLayout(page,layout);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.screenshot({path:join(output,`catalog-${width}-${layout}.png`)});
      }
      await page.getByRole('searchbox',{name:'기록 검색'}).fill(graph.nodes[0].title);
      await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'기록 읽기',exact:true}).waitFor();
      await page.screenshot({path:join(output,`reader-${width}.png`)});
      await page.goBack();await page.getByRole('dialog',{name:'기록 읽기',exact:true}).waitFor({state:'hidden'});
    } finally {await context.close();}
  }
  return {discoverySamples:discovery.length,layouts:5,widths:[1440,390,320],radar:true,readerAndHistory:true};
}
