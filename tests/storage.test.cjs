const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/js/storage.js'),'utf8').replaceAll('export ','');
function harness(response, failStorage=false){
  const data=new Map(), alerts=[];let calls=[];
  const ctx={JSON,console:{warn(){}},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem:k=>data.get(k),setItem(k,v){if(failStorage)throw Error('quota');data.set(k,v)}},window:{alert:s=>alerts.push(s),addEventListener(){}},fetch:async(url,opts)=>{calls.push(opts);return opts?.method==='PUT'?response:{ok:true,json:async()=>({diary:[]})}}};
  vm.createContext(ctx);vm.runInContext(source+';globalThis.api={save,load,flush};',ctx);return {api:ctx.api,data,alerts,calls};
}
test('save writes a detached browser recovery copy before timer fires',()=>{const h=harness({ok:true}),s={diary:[{note:'demo'}]};h.api.save(s);s.diary[0].note='changed';assert.equal(JSON.parse(h.data.get('ballast.v1')).diary[0].note,'demo');});
test('HTTP rejection warns and retains local copy',async()=>{const h=harness({ok:false,status:500});await h.api.load();h.api.save({diary:[]});await h.api.flush();assert.ok(h.data.has('ballast.v1'));assert.equal(h.alerts.length,1);assert.equal(h.calls.at(-1).keepalive,true);});
test('storage quota failure is visible',()=>{const h=harness({ok:true},true);h.api.save({diary:[]});assert.equal(h.alerts.length,1);});
