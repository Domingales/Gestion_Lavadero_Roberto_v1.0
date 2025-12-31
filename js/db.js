(function(){
  const DB_NAME="lavadero_roberto_db_v1", DB_VERSION=1;
  const STORES={settings:{keyPath:"id"},clients:{keyPath:"id"},services:{keyPath:"id"},stockItems:{keyPath:"id"},
    appointments:{keyPath:"id"},cashDays:{keyPath:"id"},deliveryNotes:{keyPath:"id"},invoices:{keyPath:"id"},
    expenses:{keyPath:"id"},payments:{keyPath:"id"},counters:{keyPath:"id"}};
  let _db=null;
  function open(){
    if(_db) return Promise.resolve(_db);
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result; Object.keys(STORES).forEach(n=>{ if(!db.objectStoreNames.contains(n)) db.createObjectStore(n,STORES[n]);});};
      req.onsuccess=()=>{_db=req.result; _db.onversionchange=()=>{_db.close(); _db=null;}; resolve(_db);};
      req.onerror=()=>reject(req.error);
    });
  }
  function tx(name,mode="readonly"){ if(!_db) throw new Error("DB not open"); return _db.transaction(name,mode).objectStore(name); }
  const get=(n,k)=>open().then(()=>new Promise((res,rej)=>{const r=tx(n).get(k); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error);}));
  const getAll=(n)=>open().then(()=>new Promise((res,rej)=>{const r=tx(n).getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error);}));
  const put=(n,v)=>open().then(()=>new Promise((res,rej)=>{const r=tx(n,"readwrite").put(v); r.onsuccess=()=>res(v); r.onerror=()=>rej(r.error);}));
  const del=(n,k)=>open().then(()=>new Promise((res,rej)=>{const r=tx(n,"readwrite").delete(k); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error);}));
  const clearStore=(n)=>open().then(()=>new Promise((res,rej)=>{const r=tx(n,"readwrite").clear(); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error);}));
  async function bulkPut(n,arr){ await open(); return new Promise((res,rej)=>{const t=_db.transaction(n,"readwrite"); const s=t.objectStore(n); (arr||[]).forEach(v=>s.put(v)); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error);});}
  async function exportAll(){ await open(); const out={}; for(const n of Object.keys(STORES)) out[n]=await getAll(n); out.__meta={db:DB_NAME,version:DB_VERSION,exportedAt:new Date().toISOString()}; return out;}
  async function importAll(payload,{mode="replace"}={}){ await open(); if(!payload||typeof payload!=="object") throw new Error("Backup inválido.");
    const names=Object.keys(STORES); const safe={}; names.forEach(n=>safe[n]=Array.isArray(payload[n])?payload[n]:[]);
    if(mode==="replace"){ for(const n of names){ await clearStore(n); await bulkPut(n,safe[n]); } } else { for(const n of names){ await bulkPut(n,safe[n]); } }
    return true;
  }
  async function nextCounter(counterId,{prefix=""}={}){ await open(); const cur=await get("counters",counterId); const next=(cur?.value||0)+1; await put("counters",{id:counterId,value:next,updatedAt:new Date().toISOString(),prefix}); return next;}
  window.DB={open,get,getAll,put,del,clearStore,bulkPut,exportAll,importAll,nextCounter,STORES,DB_NAME,DB_VERSION};
})();