/* modules/stock.js */
(function(){
  async function render(container){
    UI.setPage("Stock","Artículos, cantidades y mínimos");

    const card=UI.el("div",{class:"card"});
    const top=UI.el("div",{class:"row space"});
    const q=UI.el("input",{class:"input",placeholder:"Buscar artículo…",style:"max-width:420px"});
    const lowOnly=UI.el("select",{class:"input",style:"max-width:220px"});
    ["Todos","Solo bajo mínimo"].forEach(v=>lowOnly.appendChild(UI.el("option",{value:v},v)));
    top.appendChild(UI.el("div",{class:"row"},[q,lowOnly]));
    top.appendChild(UI.el("div",{class:"row"},[UI.el("button",{class:"btn",onclick:()=>openItemModal()}, "+ Nuevo artículo")]));
    card.appendChild(top); card.appendChild(UI.el("hr",{class:"sep"}));
    const mount=UI.el("div"); card.appendChild(mount); container.appendChild(card);

    async function refresh(){
      let rows=(await DB.getAll("stockItems")).slice().sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      const query=(q.value||"").trim().toLowerCase();
      if(query) rows=rows.filter(i=>`${i.name||""} ${i.supplier||""}`.toLowerCase().includes(query));
      if(lowOnly.value==="Solo bajo mínimo") rows=rows.filter(i=>Number(i.qty||0)<Number(i.minQty||0));

      UI.clear(mount);
      mount.appendChild(UI.table([
        {label:"Artículo",value:i=>`<div style="font-weight:700">${U.escapeHtml(i.name||"")}</div><div class="tiny muted">${U.escapeHtml(i.supplier||"")}</div>`,html:true},
        {label:"Cantidad",value:i=>String(Number(i.qty||0)),class:"right mono"},
        {label:"Mínimo",value:i=>String(Number(i.minQty||0)),class:"right mono"},
        {label:"Coste",value:i=>U.money(i.cost||0),class:"right mono"},
        {label:"PVP",value:i=>U.money(i.price||0),class:"right mono"},
        {label:"Estado",value:i=>(Number(i.qty||0)<Number(i.minQty||0))?UI.badge("Bajo","bad").outerHTML:UI.badge("OK","good").outerHTML,html:true},
      ],rows,{
        rowActions:(i)=>UI.el("div",{class:"row",style:"justify-content:flex-end"},[
          UI.el("button",{class:"btn btnGhost",onclick:()=>openItemModal(i)},"Editar"),
          UI.el("button",{class:"btn btnDanger",onclick:()=>deleteItem(i)},"Borrar"),
        ]),
        emptyText:"No hay artículos."
      }));
      window.__lastTable={headers:["Artículo","Proveedor","Coste","PVP","Cantidad","Mínimo","Notas"],rows:rows.map(i=>[i.name,i.supplier,i.cost,i.price,i.qty,i.minQty,i.notes])};
    }

    q.addEventListener("input",refresh);
    lowOnly.addEventListener("change",refresh);
    await refresh();
  }

  async function openItemModal(item=null){
    const isNew=!item;
    const body=UI.el("div",{class:"formGrid cols2"});
    const name=UI.inputRow({label:"Artículo",value:item?.name||""});
    const supplier=UI.inputRow({label:"Proveedor",value:item?.supplier||""});
    const cost=UI.inputRow({label:"Coste (€)",type:"number",value:item?.cost??"",attrs:{step:"0.01"}});
    const price=UI.inputRow({label:"PVP (€)",type:"number",value:item?.price??"",attrs:{step:"0.01"}});
    const qty=UI.inputRow({label:"Cantidad",type:"number",value:item?.qty??0,attrs:{step:"1"}});
    const minQty=UI.inputRow({label:"Mínimo",type:"number",value:item?.minQty??0,attrs:{step:"1"}});
    const notes=UI.inputRow({label:"Notas",type:"textarea",value:item?.notes||""});
    [name,supplier,cost,price,qty,minQty,notes].forEach(x=>body.appendChild(x.wrap));

    Modal.open({title:isNew?"Nuevo artículo":"Editar artículo",body,footerButtons:[
      {label:"Cancelar",kind:"btnGhost"},
      {label:"Guardar",onClick:async()=>{
        const n=name.input.value.trim(); if(!n) throw new Error("El nombre es obligatorio.");
        const obj=item?{...item}:{id:U.uid("stk"),createdAt:new Date().toISOString()};
        obj.name=n; obj.supplier=supplier.input.value.trim(); obj.cost=U.parseFloatSafe(cost.input.value); obj.price=U.parseFloatSafe(price.input.value);
        obj.qty=U.parseIntSafe(qty.input.value); obj.minQty=U.parseIntSafe(minQty.input.value); obj.notes=notes.input.value.trim(); obj.updatedAt=new Date().toISOString();
        await DB.put("stockItems",obj);
        UI.toast("Artículo guardado."); window.dispatchEvent(new Event("hashchange"));
      }}
    ]});
  }

  async function deleteItem(item){
    const ok=await Modal.confirm({title:"Borrar artículo",message:`¿Borrar "${item.name}"?`,danger:true});
    if(!ok) return;
    await DB.del("stockItems",item.id);
    UI.toast("Artículo borrado."); window.dispatchEvent(new Event("hashchange"));
  }

  window.StockModule={render};
})();