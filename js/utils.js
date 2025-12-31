(function(){
  const pad2=n=>String(n).padStart(2,"0");
  const uid=(p="id")=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const todayISO=()=>{const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;};
  const toISODate=(d)=>{const dt=(d instanceof Date)?d:new Date(d); return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;};
  const toLocalDate=(iso)=>{if(!iso) return ""; const [y,m,dd]=iso.split("-").map(Number); return `${pad2(dd)}/${pad2(m)}/${y}`;};
  const toLocalDateTime=(iso)=>{if(!iso) return ""; const dt=new Date(iso); return `${toLocalDate(toISODate(dt))} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;};
  const money=(n)=>Number(n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR"});
  const num=(n,d=2)=>Number(n||0).toLocaleString("es-ES",{minimumFractionDigits:d,maximumFractionDigits:d});
  const parseFloatSafe=(v)=>{const x=String(v??"").replace(",",".").trim(); const n=Number.parseFloat(x); return Number.isFinite(n)?n:0;};
  const parseIntSafe=(v)=>{const n=Number.parseInt(String(v??"").trim(),10); return Number.isFinite(n)?n:0;};
  const sum=(arr,fn)=> (arr||[]).reduce((a,x)=>a+(fn?(Number(fn(x))||0):(Number(x)||0)),0);
  const startOfMonthISO=(iso)=>{const [y,m]=(iso||todayISO()).split("-").map(Number); return `${y}-${pad2(m)}-01`;};
  const isBetween=(iso,start,end)=> (!start||iso>=start)&&(!end||iso<=end);
  const downloadText=(filename,text)=>{const b=new Blob([text],{type:"text/plain;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  const escapeHtml=(s)=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  window.U={uid,pad2,todayISO,toISODate,toLocalDate,toLocalDateTime,money,num,parseFloatSafe,parseIntSafe,sum,startOfMonthISO,isBetween,downloadText,escapeHtml};
})();