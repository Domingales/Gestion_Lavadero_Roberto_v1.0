(function(){
  const content=()=>document.getElementById("content");
  const setPage=(t,st="")=>{const a=document.getElementById("pageTitle"); const b=document.getElementById("pageSubtitle"); if(a) a.textContent=t||""; if(b) b.textContent=st||"";};
  function el(tag,attrs={},children=[]){
    const n=document.createElement(tag);
    Object.entries(attrs||{}).forEach(([k,v])=>{
      if(k==="class") n.className=v;
      else if(k==="html") n.innerHTML=v;
      else if(k.startsWith("on")&&typeof v==="function") n.addEventListener(k.slice(2),v);
      else if(v===true) n.setAttribute(k,"");
      else if(v!==false&&v!=null) n.setAttribute(k,String(v));
    });
    (Array.isArray(children)?children:[children]).filter(Boolean).forEach(ch=>n.appendChild(typeof ch==="string"?document.createTextNode(ch):ch));
    return n;
  }
  const clear=(n)=>{while(n.firstChild) n.removeChild(n.firstChild);};
  function toast(msg,{ms=2600}={}){
    let t=document.querySelector(".toast"); if(!t){t=el("div",{class:"toast hidden"}); document.body.appendChild(t);}
    t.textContent=msg; t.classList.remove("hidden"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add("hidden"),ms);
  }
  const badge=(text,kind="")=>el("span",{class:`badge ${kind}`.trim()},text);
  function table(columns,rows,{rowActions=null,emptyText="Sin datos"}={}){
    const wrap=el("div",{class:"tableWrap"}); const tbl=el("table"); const thead=el("thead"); const trh=el("tr");
    columns.forEach(c=>trh.appendChild(el("th",{},c.label))); if(rowActions) trh.appendChild(el("th",{},"Acciones")); thead.appendChild(trh); tbl.appendChild(thead);
    const tbody=el("tbody");
    if(!rows||rows.length===0){
      const tr=el("tr"); tr.appendChild(el("td",{colspan:columns.length+(rowActions?1:0),class:"muted"},emptyText)); tbody.appendChild(tr);
    }else{
      rows.forEach(r=>{
        const tr=el("tr");
        columns.forEach(c=>{
          const raw=(typeof c.value==="function")?c.value(r):r[c.key];
          const val=(raw==null)?"":raw;
          const td=el("td",{class:c.class||""},c.html?"":String(val));
          if(c.html) td.innerHTML=String(val);
          tr.appendChild(td);
        });
        if(rowActions){const td=el("td",{class:"right"}); td.appendChild(rowActions(r)); tr.appendChild(td);}
        tbody.appendChild(tr);
      });
    }
    tbl.appendChild(tbody); wrap.appendChild(tbl); return wrap;
  }
  function inputRow({label,type="text",value="",placeholder="",attrs={}}){
    const w=el("div"); w.appendChild(el("div",{class:"label"},label));
    const inp=el(type==="textarea"?"textarea":"input",{class:"input",type:type==="textarea"?undefined:type,value:type==="textarea"?undefined:value,placeholder,...attrs});
    if(type==="textarea") inp.value=value||""; w.appendChild(inp); return {wrap:w,input:inp};
  }
  function selectRow({label,value="",options=[],attrs={}}){
    const w=el("div"); w.appendChild(el("div",{class:"label"},label));
    const sel=el("select",{class:"input",...attrs});
    options.forEach(o=>{const opt=el("option",{value:o.value},o.label); if(String(o.value)===String(value)) opt.selected=true; sel.appendChild(opt);});
    w.appendChild(sel); return {wrap:w,select:sel};
  }
  window.UI={content,setPage,el,clear,toast,badge,table,inputRow,selectRow};
})();