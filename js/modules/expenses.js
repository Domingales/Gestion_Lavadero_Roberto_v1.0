/* modules/expenses.js */
(function(){
  async function render(container){
    UI.setPage("Gastos","Registro de gastos y pagos");

    const card=UI.el("div",{class:"card"});
    const top=UI.el("div",{class:"row space"});
    const q=UI.el("input",{class:"input",placeholder:"Buscar…",style:"max-width:420px"});
    const statusSel=UI.el("select",{class:"input",style:"max-width:220px"});
    ["Todos","Pendientes","Pagados"].forEach(v=>statusSel.appendChild(UI.el("option",{value:v},v)));
    top.appendChild(UI.el("div",{class:"row"},[q,statusSel]));
    top.appendChild(UI.el("div",{class:"row"},[UI.el("button",{class:"btn",onclick:()=>openExpenseModal()}, "+ Nuevo gasto")]));
    card.appendChild(top); card.appendChild(UI.el("hr",{class:"sep"}));
    const mount=UI.el("div"); card.appendChild(mount); container.appendChild(card);

    async function refresh(){
      const rows0=(await DB.getAll("expenses")).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
      const query=(q.value||"").trim().toLowerCase();
      const st=statusSel.value;
      let rows=rows0;
      if(st==="Pendientes") rows=rows.filter(e=>e.status!=="paid");
      if(st==="Pagados") rows=rows.filter(e=>e.status==="paid");
      if(query) rows=rows.filter(e=>`${e.concept||""} ${e.provider||""} ${e.category||""}`.toLowerCase().includes(query));

      UI.clear(mount);
      mount.appendChild(UI.table([
        {label:"Fecha",value:e=>U.toLocalDate(e.date),class:"mono"},
        {label:"Concepto",value:e=>`<div style="font-weight:700">${U.escapeHtml(e.concept||"")}</div><div class="tiny muted">${U.escapeHtml(e.category||"")} · ${U.escapeHtml(e.provider||"")}</div>`,html:true},
        {label:"Estado",value:e=>e.status==="paid"?UI.badge("Pagado","good").outerHTML:UI.badge("Pendiente","warn").outerHTML,html:true},
        {label:"Total",value:e=>U.money(e.total),class:"right mono"},
      ],rows,{
        rowActions:(e)=>UI.el("div",{class:"row",style:"justify-content:flex-end"},[
          UI.el("button",{class:"btn btnGhost",onclick:()=>openExpenseModal(e)},"Editar"),
          UI.el("button",{class:"btn btnSuccess",onclick:()=>payExpense(e)},e.status==="paid"?"Pagado":"Pagar"),
          UI.el("button",{class:"btn btnDanger",onclick:()=>deleteExpense(e)},"Borrar")
        ]),
        emptyText:"No hay gastos."
      }));
      window.__lastTable={headers:["Fecha","Concepto","Categoría","Proveedor","Estado","Total"],rows:rows.map(e=>[U.toLocalDate(e.date),e.concept,e.category,e.provider,e.status,e.total])};
    }

    q.addEventListener("input",refresh);
    statusSel.addEventListener("change",refresh);
    await refresh();
  }

  async function openExpenseModal(exp=null){
    const isNew=!exp;
    const settings=await Settings.getSettings();
    const body=UI.el("div",{class:"formGrid cols2"});
    const date=UI.inputRow({label:"Fecha",type:"date",value:exp?.date||U.todayISO()});
    const concept=UI.inputRow({label:"Concepto",value:exp?.concept||""});
    const category=UI.inputRow({label:"Categoría",value:exp?.category||"",placeholder:"Ej: suministros, mantenimiento…"});
    const provider=UI.inputRow({label:"Proveedor",value:exp?.provider||""});
    const base=UI.inputRow({label:"Base imponible (€)",type:"number",value:exp?.base??"",attrs:{step:"0.01"}});
    const vatPercent=UI.inputRow({label:"IVA (%)",type:"number",value:exp?.vatPercent??settings.defaultVat,attrs:{step:"0.01"}});
    const status=UI.selectRow({label:"Estado",value:exp?.status||"pending",options:[{value:"pending",label:"Pendiente"},{value:"paid",label:"Pagado"}]});
    const method=UI.selectRow({label:"Método (si pagado)",value:exp?.paymentMethod||"Efectivo",options:[
      {value:"Efectivo",label:"Efectivo"},{value:"Tarjeta",label:"Tarjeta"},{value:"Transferencia",label:"Transferencia"},{value:"Bizum",label:"Bizum"},{value:"Otro",label:"Otro"},
    ]});
    const notes=UI.inputRow({label:"Notas",type:"textarea",value:exp?.notes||""});
    [date,status,concept,category,provider,method,base,vatPercent,notes].forEach(x=>body.appendChild(x.wrap));

    function calc(){const b=U.parseFloatSafe(base.input.value); const vp=U.parseFloatSafe(vatPercent.input.value); const va=b*(vp/100); return {b,vp,va,t:b+va};}

    Modal.open({title:isNew?"Nuevo gasto":"Editar gasto",body,footerButtons:[
      {label:"Cancelar",kind:"btnGhost"},
      {label:"Guardar",onClick:async()=>{
        const c=concept.input.value.trim(); if(!c) throw new Error("El concepto es obligatorio.");
        const {b,vp,va,t}=calc(); if(b<=0) throw new Error("La base debe ser > 0.");
        const obj=exp?{...exp}:{id:U.uid("exp"),createdAt:new Date().toISOString()};
        obj.date=date.input.value||U.todayISO(); obj.concept=c; obj.category=category.input.value.trim(); obj.provider=provider.input.value.trim();
        obj.base=b; obj.vatPercent=vp; obj.vatAmount=va; obj.total=t; obj.status=status.select.value; obj.paymentMethod=method.select.value;
        obj.paidAt=obj.status==="paid"?(exp?.paidAt||new Date().toISOString()):null; obj.notes=notes.input.value.trim(); obj.updatedAt=new Date().toISOString();
        await DB.put("expenses",obj);
        if(isNew && obj.status==="paid"){
          await DB.put("payments",{id:U.uid("pay"),ts:obj.paidAt,direction:"out",amount:obj.total,method:obj.paymentMethod,refType:"expenses",refId:obj.id,refNumber:obj.concept});
        }
        UI.toast("Gasto guardado."); window.dispatchEvent(new Event("hashchange"));
      }}
    ]});
  }

  async function payExpense(exp){
    if(exp.status==="paid"){UI.toast("Ya está pagado.");return;}
    const body=UI.el("div",{class:"formGrid cols2"});
    const method=UI.selectRow({label:"Método de pago",value:"Efectivo",options:[
      {value:"Efectivo",label:"Efectivo"},{value:"Tarjeta",label:"Tarjeta"},{value:"Transferencia",label:"Transferencia"},{value:"Bizum",label:"Bizum"},{value:"Otro",label:"Otro"},
    ]});
    body.appendChild(method.wrap);
    Modal.open({title:"Marcar gasto como pagado",body,footerButtons:[
      {label:"Cancelar",kind:"btnGhost"},
      {label:"Pagar",kind:"btnSuccess",onClick:async()=>{
        exp.status="paid"; exp.paidAt=new Date().toISOString(); exp.paymentMethod=method.select.value; exp.updatedAt=new Date().toISOString();
        await DB.put("expenses",exp);
        await DB.put("payments",{id:U.uid("pay"),ts:exp.paidAt,direction:"out",amount:exp.total,method:exp.paymentMethod,refType:"expenses",refId:exp.id,refNumber:exp.concept});
        UI.toast("Pago registrado."); window.dispatchEvent(new Event("hashchange"));
      }}
    ]});
  }

  async function deleteExpense(exp){
    const ok=await Modal.confirm({title:"Borrar gasto",message:"¿Borrar este gasto?",danger:true});
    if(!ok) return;
    await DB.del("expenses",exp.id);
    UI.toast("Gasto borrado."); window.dispatchEvent(new Event("hashchange"));
  }

  window.ExpensesModule={render};
})();