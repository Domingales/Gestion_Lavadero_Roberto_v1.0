(function(){
  async function ensureTodayCash(){
    const id=U.todayISO(); let c=await DB.get("cashDays",id);
    if(!c){c={id,openedAt:null,opening:0,movements:[],closedAt:null,closingCounted:0,closingTheoretical:0,diff:0,notes:""}; await DB.put("cashDays",c);}
    return c;
  }
  const calcTheoretical=c=> (c.opening||0)+U.sum(c.movements||[],m=>m.type==="in"?m.amount:-m.amount);
  function kpi(label,valueHtml,isHtml=false){
    return UI.el("div",{class:"kpi"},[UI.el("div",{class:"label"},label),isHtml?UI.el("div",{class:"value",html:valueHtml}):UI.el("div",{class:"value"},valueHtml),UI.el("div",{class:"hint"},"")]);
  }
  async function render(container){
    UI.setPage("Caja diaria","Apertura, movimientos y cierre");
    const today=U.todayISO(); const cash=await ensureTodayCash();
    const top=UI.el("div",{class:"card"});
    top.appendChild(UI.el("div",{class:"row space"},[
      UI.el("div",{},[UI.el("div",{style:"font-weight:900;font-size:16px"},`Caja del día ${U.toLocalDate(today)}`),UI.el("div",{class:"tiny muted"},cash.openedAt?`Apertura: ${U.toLocalDateTime(cash.openedAt)}`:"Sin apertura aún")]),
      UI.el("div",{class:"row"},[
        UI.el("button",{class:"btn",onclick:()=>openCashModal(cash)},cash.openedAt?"Editar apertura":"Abrir caja"),
        UI.el("button",{class:"btn btnGhost",onclick:()=>addMovementModal(cash)},"+ Movimiento"),
        UI.el("button",{class:"btn btnSuccess",onclick:()=>closeCashModal(cash)},cash.closedAt?"Reabrir / Editar cierre":"Cerrar caja")
      ])
    ]));
    const theo=calcTheoretical(cash);
    const status=cash.closedAt?UI.badge("Cerrada","good"):(cash.openedAt?UI.badge("Abierta","warn"):UI.badge("Sin abrir","bad"));
    top.appendChild(UI.el("hr",{class:"sep"}));
    top.appendChild(UI.el("div",{class:"grid cols4"},[
      kpi("Estado",status.outerHTML,true),
      kpi("Apertura",U.money(cash.opening)),
      kpi("Teórico",U.money(theo)),
      kpi("Cierre contado",cash.closedAt?U.money(cash.closingCounted):"—")
    ]));
    container.appendChild(top);

    const movs=(cash.movements||[]).slice().sort((a,b)=>(a.ts||"").localeCompare(b.ts||""));
    const table=UI.table([
      {label:"Hora",value:m=>U.toLocalDateTime(m.ts),class:"mono"},
      {label:"Tipo",value:m=>m.type==="in"?"Ingreso":"Gasto"},
      {label:"Concepto",key:"concept"},
      {label:"Método",key:"method"},
      {label:"Importe",value:m=>U.money(m.amount),class:"right mono"}
    ],movs,{rowActions:m=>UI.el("div",{class:"row",style:"justify-content:flex-end"},[
      UI.el("button",{class:"btn btnGhost",onclick:()=>editMovementModal(cash,m)},"Editar"),
      UI.el("button",{class:"btn btnDanger",onclick:()=>deleteMovement(cash,m)},"Borrar")
    ]),emptyText:"No hay movimientos manuales hoy."});

    const card=UI.el("div",{class:"card"},[
      UI.el("div",{class:"row space"},[UI.el("div",{style:"font-weight:800"},"Movimientos manuales"),UI.el("div",{class:"tiny muted"},"Movimientos extra (si los necesitas).")]),
      UI.el("hr",{class:"sep"}),table
    ]);
    container.appendChild(card);

    const allDays=(await DB.getAll("cashDays")).slice().sort((a,b)=>b.id.localeCompare(a.id)).slice(0,31);
    const hist=UI.table([
      {label:"Fecha",value:d=>U.toLocalDate(d.id),class:"mono"},
      {label:"Apertura",value:d=>U.money(d.opening),class:"right mono"},
      {label:"Teórico",value:d=>U.money(calcTheoretical(d)),class:"right mono"},
      {label:"Cierre contado",value:d=>d.closedAt?U.money(d.closingCounted):"—",class:"right mono"},
      {label:"Descuadre",value:d=>d.closedAt?U.money(d.diff):"—",class:"right mono"},
    ],allDays,{rowActions:d=>UI.el("div",{class:"row",style:"justify-content:flex-end"},[
      UI.el("button",{class:"btn btnGhost",onclick:()=>printDay(d)},"Imprimir")
    ]),emptyText:"Aún no hay historial."});
    container.appendChild(UI.el("div",{class:"card"},[UI.el("div",{style:"font-weight:800"},"Histórico (últimos 31 días)"),UI.el("hr",{class:"sep"}),hist]));

    async function openCashModal(c){
      const body=UI.el("div",{class:"formGrid cols2"});
      const opening=UI.inputRow({label:"Importe de apertura (€)",type:"number",value:c.opening??0,attrs:{step:"0.01"}});
      const notes=UI.inputRow({label:"Notas",type:"textarea",value:c.notes||""});
      body.appendChild(opening.wrap); body.appendChild(notes.wrap);
      Modal.open({title:c.openedAt?"Editar apertura de caja":"Abrir caja",body,footerButtons:[
        {label:"Cancelar",kind:"btnGhost"},
        {label:"Guardar",onClick:async()=>{c.openedAt=c.openedAt||new Date().toISOString(); c.opening=U.parseFloatSafe(opening.input.value); c.notes=notes.input.value.trim(); await DB.put("cashDays",c); UI.toast("Caja guardada."); window.dispatchEvent(new Event("hashchange"));}}
      ]});
    }
    async function closeCashModal(c){
      const theo=calcTheoretical(c);
      const body=UI.el("div",{class:"formGrid cols2"});
      const counted=UI.inputRow({label:"Efectivo contado (€)",type:"number",value:c.closingCounted??theo,attrs:{step:"0.01"}});
      const notes=UI.inputRow({label:"Notas de cierre",type:"textarea",value:c.notes||""});
      body.appendChild(counted.wrap); body.appendChild(notes.wrap);
      Modal.open({title:c.closedAt?"Editar cierre de caja":"Cerrar caja",body,footerButtons:[
        {label:"Cancelar",kind:"btnGhost"},
        {label:"Guardar cierre",kind:"btnSuccess",onClick:async()=>{c.closedAt=new Date().toISOString(); c.closingTheoretical=theo; c.closingCounted=U.parseFloatSafe(counted.input.value); c.diff=c.closingCounted-theo; c.notes=notes.input.value.trim(); await DB.put("cashDays",c); UI.toast("Cierre guardado."); window.dispatchEvent(new Event("hashchange"));}}
      ]});
    }
    async function addMovementModal(c){
      if(!c.openedAt){UI.toast("Primero abre la caja del día."); return;}
      const body=UI.el("div",{class:"formGrid cols2"});
      const type=UI.selectRow({label:"Tipo",value:"in",options:[{value:"in",label:"Ingreso"},{value:"out",label:"Gasto"}]});
      const method=UI.selectRow({label:"Método",value:"Efectivo",options:[{value:"Efectivo",label:"Efectivo"},{value:"Tarjeta",label:"Tarjeta"},{value:"Transferencia",label:"Transferencia"},{value:"Otro",label:"Otro"}]});
      const concept=UI.inputRow({label:"Concepto",value:""});
      const amount=UI.inputRow({label:"Importe (€)",type:"number",value:"",attrs:{step:"0.01"}});
      [type.wrap,method.wrap,concept.wrap,amount.wrap].forEach(x=>body.appendChild(x));
      Modal.open({title:"Añadir movimiento manual",body,footerButtons:[
        {label:"Cancelar",kind:"btnGhost"},
        {label:"Añadir",onClick:async()=>{const m={id:U.uid("mov"),ts:new Date().toISOString(),type:type.select.value,method:method.select.value,concept:concept.input.value.trim(),amount:U.parseFloatSafe(amount.input.value)}; if(!m.concept) throw new Error("Indica un concepto."); if(m.amount<=0) throw new Error("El importe debe ser > 0."); c.movements=c.movements||[]; c.movements.push(m); await DB.put("cashDays",c); UI.toast("Movimiento añadido."); window.dispatchEvent(new Event("hashchange"));}}
      ]});
    }
    async function editMovementModal(c,m){
      const body=UI.el("div",{class:"formGrid cols2"});
      const type=UI.selectRow({label:"Tipo",value:m.type,options:[{value:"in",label:"Ingreso"},{value:"out",label:"Gasto"}]});
      const method=UI.selectRow({label:"Método",value:m.method||"Efectivo",options:[{value:"Efectivo",label:"Efectivo"},{value:"Tarjeta",label:"Tarjeta"},{value:"Transferencia",label:"Transferencia"},{value:"Otro",label:"Otro"}]});
      const concept=UI.inputRow({label:"Concepto",value:m.concept||""});
      const amount=UI.inputRow({label:"Importe (€)",type:"number",value:m.amount??0,attrs:{step:"0.01"}});
      [type.wrap,method.wrap,concept.wrap,amount.wrap].forEach(x=>body.appendChild(x));
      Modal.open({title:"Editar movimiento",body,footerButtons:[
        {label:"Cancelar",kind:"btnGhost"},
        {label:"Guardar",onClick:async()=>{m.type=type.select.value; m.method=method.select.value; m.concept=concept.input.value.trim(); m.amount=U.parseFloatSafe(amount.input.value); if(!m.concept) throw new Error("Indica un concepto."); if(m.amount<=0) throw new Error("El importe debe ser > 0."); await DB.put("cashDays",c); UI.toast("Movimiento actualizado."); window.dispatchEvent(new Event("hashchange"));}}
      ]});
    }
    async function deleteMovement(c,m){
      const ok=await Modal.confirm({title:"Borrar movimiento",message:`¿Borrar "${m.concept}"?`,danger:true}); if(!ok) return;
      c.movements=(c.movements||[]).filter(x=>x.id!==m.id); await DB.put("cashDays",c); UI.toast("Movimiento borrado."); window.dispatchEvent(new Event("hashchange"));
    }
    function printDay(day){
      const theo=calcTheoretical(day);
      const html=`<div class="h1">Parte de caja · ${U.toLocalDate(day.id)}</div>
      <div class="muted">Apertura: ${day.openedAt?U.toLocalDateTime(day.openedAt):"—"} · Cierre: ${day.closedAt?U.toLocalDateTime(day.closedAt):"—"}</div>
      <table>
        <tr><th>Apertura</th><td class="right">${U.money(day.opening)}</td></tr>
        <tr><th>Teórico</th><td class="right">${U.money(theo)}</td></tr>
        <tr><th>Cierre contado</th><td class="right">${day.closedAt?U.money(day.closingCounted):"—"}</td></tr>
        <tr><th>Descuadre</th><td class="right">${day.closedAt?U.money(day.diff):"—"}</td></tr>
      </table>
      <div style="height:10px"></div>
      <div class="h1" style="font-size:14px">Movimientos manuales</div>
      <table><thead><tr><th>Hora</th><th>Tipo</th><th>Concepto</th><th>Método</th><th class="right">Importe</th></tr></thead>
      <tbody>${(day.movements||[]).map(mm=>`<tr><td>${U.toLocalDateTime(mm.ts)}</td><td>${mm.type==="in"?"Ingreso":"Gasto"}</td><td>${U.escapeHtml(mm.concept)}</td><td>${U.escapeHtml(mm.method||"")}</td><td class="right">${U.money(mm.amount)}</td></tr>`).join("")}</tbody></table>
      <div class="muted" style="margin-top:8px">Notas: ${U.escapeHtml(day.notes||"")}</div>`;
      Printer.printHtml(html);
    }
  }
  window.CashModule={render};
})();