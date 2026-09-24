import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../serviceWorker.js', import.meta.url), 'utf8');
function worker({failInstall = false, windows = []} = {}) {
  const handlers = {}, calls = {assets:[],deleted:[],opened:[],claimed:0,skipped:0,fetches:0};
  const cache = {addAll:async assets => {calls.assets=assets; if(failInstall) throw Error('offline');},match:async () => ({cached:true})};
  const context = {URL, self:{location:{href:'https://example.org/tools/still/serviceWorker.js'},addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:()=>calls.skipped++,clients:{claim:async()=>calls.claimed++, matchAll:async()=>windows,openWindow:async url=>calls.opened.push(url)}},caches:{open:async()=>cache,keys:async()=>['unrelated','still-shell-/tools/still/-v0','still-shell-/other/-v1','pomodoro-site-v10'],delete:async key=>calls.deleted.push(key)},fetch:async()=>{calls.fetches++;return {network:true};}};
  vm.runInNewContext(source,context);
  return {handlers,calls,cache};
}
test('installation awaits all assets and works below a subfolder', async()=>{
 const {handlers,calls}=worker(); let pending;
 handlers.install({waitUntil:promise=>pending=promise}); await pending;
 assert.ok(calls.assets.length>=10);
 assert.ok(calls.assets.every(url=>url.startsWith('https://example.org/tools/still/')));
 for(const url of calls.assets) if(!url.endsWith('/')) await readFile(new URL('../'+url.split('/tools/still/')[1],import.meta.url));
});
test('failed precache rejects installation', async()=>{
 const {handlers}=worker({failInstall:true});let pending;
 handlers.install({waitUntil:promise=>pending=promise});await assert.rejects(pending,/offline/);
});
test('activation removes only obsolete caches owned by this deployment',async()=>{
 const {handlers,calls}=worker();let pending;
 handlers.activate({waitUntil:promise=>pending=promise});await pending;
 assert.deepEqual(calls.deleted,['still-shell-/tools/still/-v0','pomodoro-site-v10']);assert.equal(calls.claimed,1);
});
test('navigation serves cached shell without a network connection',async()=>{
 const {handlers,calls}=worker();let pending;
 handlers.fetch({request:{url:'https://example.org/tools/still/',method:'GET',mode:'navigate'},respondWith:promise=>pending=promise});
 assert.deepEqual(await pending,{cached:true});assert.equal(calls.fetches,0);
 let intercepted=false;
 handlers.fetch({request:{url:'https://other.org/a.js',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 handlers.fetch({request:{url:'https://example.org/tools/still/',method:'POST'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
test('notification click opens fixed app URL, never supplied external target',async()=>{
 const {handlers,calls}=worker();let pending,closed=false;
 handlers.notificationclick({notification:{data:{url:'https://evil.example'},close:()=>closed=true},waitUntil:promise=>pending=promise});await pending;
 assert.equal(closed,true);assert.deepEqual(calls.opened,['https://example.org/tools/still/']);
});
test('notification click focuses existing app and update activation is explicit',async()=>{
 let focused=0;const {handlers,calls}=worker({windows:[{url:'https://example.org/tools/still/',focus:async()=>focused++}]});let pending;
 handlers.notificationclick({notification:{close(){}},waitUntil:promise=>pending=promise});await pending;
 assert.equal(focused,1);assert.equal(calls.opened.length,0);assert.equal(calls.skipped,0);
 handlers.message({data:{type:'SKIP_WAITING'}});assert.equal(calls.skipped,1);
});
