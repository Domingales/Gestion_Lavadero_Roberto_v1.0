/* modules/deliveryNotes.js · Albaranes */
(function(){
  const STORE="deliveryNotes", COUNTER="deliveryNote";

  async function render(container){
    UI.setPage("Albaranes","Crear, cobrar y convertir a factura");

    const card=UI.el("div",{class:"card"});
    const top=UI.el("div",{class:"row space"});
    const q=UI.el("input",{class:"input",placeholder:"Buscar por número o cliente…",style:"max-width:420px"});
    const statusSel=UI.el("select",{class:"input",style:"max-width:220px"});
    ["Todos","Pendientes","Pagados"].forEach(v=>statusSel.appendChild(UI.el("option",{value:v},v)));
    top.appendChild(UI.el("div",{class:"row"},[q,statusSel]));
    top.appendChild(UI.el("div",{class:"row"},[UI.el("button",{class:"btn",onclick:()=>openDocModal(null)}, "+ Nuevo albarán")]));
    card.appendChild(top); card.appendChild(UI.el("hr",{class:"sep"}));
    const mount=UI.el("div"); card.appendChild(mount); container.appendChild(card);

    const params=new URLSearchParams((location.hash.split("?")[1]||""));
    if(params.get("new")==="1"){
      const clientId=params.get("client");
      openDocModal(null,{clientId});
      location.hash="#/deliveryNotes";
    }

    async function refresh(){
      const [docs,settings]=await Promise.all([DB.getAll(STORE),Settings.getSettings()]);
      let rows=docs.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
      const query=(q.value||"").trim().toLowerCase();
      const st=statusSel.value;
      if(st==="Pendientes") rows=rows.filter(d=>d.status!=="paid");
      if(st==="Pagados") rows=rows.filter(d=>d.status==="paid");
      if(query) rows=rows.filter(d=>`${d.number||""} ${d.clientName||""}`.toLowerCase().includes(query));

      UI.clear(mount);
      mount.appendChild(UI.table([
        {label:"Número",key:"number",class:"mono"},
        {label:"Fecha",value:d=>U.toLocalDate(d.date),class:"mono"},
        {label:"Cliente",value:d=>U.escapeHtml(d.clientName||""),html:true},
        {label:"Estado",value:d=>d.status==="paid"?UI.badge("Pagado","good").outerHTML:UI.badge("Pendiente","warn").outerHTML,html:true},
        {label:"Total",value:d=>U.money(d.total),class:"right mono"},
      ],rows,{
        rowActions:(d)=>UI.el("div",{class:"row",style:"justify-content:flex-end"},[
          UI.el("button",{class:"btn btnGhost",onclick:()=>openDocModal(d)},"Editar"),
          UI.el("button",{class:"btn btnGhost",onclick:()=>printDoc(d,settings)},"Imprimir"),
          UI.el("button",{class:"btn btnSuccess",onclick:()=>payDoc(d)}, d.status==="paid"?"Pagado":"Cobrar"),
          UI.el("button",{class:"btn btnGhost",onclick:()=>convertToInvoice(d)},"A factura"),
          UI.el("button",{class:"btn btnDanger",onclick:()=>deleteDoc(d)},"Borrar"),
        ]),
        emptyText:"No hay albaranes."
      }));

      window.__lastTable={headers:["Número","Fecha","Cliente","Estado","Total"],rows:rows.map(d=>[d.number,U.toLocalDate(d.date),d.clientName,d.status,d.total])};
    }

    q.addEventListener("input",refresh);
    statusSel.addEventListener("change",refresh);
    await refresh();
  }

  async function openDocModal(doc=null,opts={}){
    const isNew=!doc;
    const settings=await Settings.getSettings();
    const [clients,services]=await Promise.all([DB.getAll("clients"),DB.getAll("services")]);
    const clientsActive=clients.filter(c=>c.active!==false).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    const servicesActive=services.filter(s=>s.active!==false).sort((a,b)=>(a.name||"").localeCompare(b.name||""));

    const body=UI.el("div",{class:"grid",style:"gap:12px"});

    const header=UI.el("div",{class:"card"});
    const g=UI.el("div",{class:"formGrid cols3"});
    const date=UI.inputRow({label:"Fecha",type:"date",value:doc?.date||U.todayISO()});
    const vat=UI.inputRow({label:"% IVA (opcional)",type:"number",value:(doc?.vatPercent??settings.defaultVat),attrs:{step:"0.01"}});
    const clientSel=UI.selectRow({label:"Cliente",value:doc?.clientId||opts.clientId||"",options:[
      {value:"",label:"— Selecciona —"},
      ...clientsActive.map(c=>({value:c.id,label:c.name}))
    ]});
    g.appendChild(date.wrap); g.appendChild(vat.wrap); g.appendChild(clientSel.wrap);
    header.appendChild(g); body.appendChild(header);

    const linesCard=UI.el("div",{class:"card"});
    linesCard.appendChild(UI.el("div",{class:"row space"},[
      UI.el("div",{style:"font-weight:800"},"Líneas"),
      UI.el("div",{class:"row"},[
        UI.el("button",{class:"btn btnGhost",type:"button",onclick:()=>addLineFromService()},"+ Servicio"),
        UI.el("button",{class:"btn btnGhost",type:"button",onclick:()=>addEmptyLine()},"+ Línea manual"),
      ])
    ]));
    linesCard.appendChild(UI.el("hr",{class:"sep"}));
    const linesMount=UI.el("div");
    linesCard.appendChild(linesMount);
    body.appendChild(linesCard);

    let lines=DocUtils.normalizeLines(doc?.lines||[]);

    function renderLines(){
      UI.clear(linesMount);
      const wrap=UI.el("div",{class:"tableWrap"});
      const table=UI.el("table");
      table.appendChild(UI.el("thead",{},UI.el("tr",{},[
        UI.el("th",{},"Concepto"),UI.el("th",{},"Cant."),UI.el("th",{},"Precio"),UI.el("th",{},"Dto."),UI.el("th",{},"Importe"),UI.el("th",{},"")
      ])));
      const tbody=UI.el("tbody");
      if(lines.length===0){
        tbody.appendChild(UI.el("tr",{},UI.el("td",{colspan:"6",class:"muted"},"Añade líneas para calcular importes.")));
      }else{
        lines.forEach((ln,idx)=>{
          const tr=UI.el("tr");
          const concept=UI.el("input",{class:"input",value:ln.concept});
          const qty=UI.el("input",{class:"input",type:"number",step:"1",value:ln.qty});
          const price=UI.el("input",{class:"input",type:"number",step:"0.01",value:ln.price});
          const disc=UI.el("input",{class:"input",type:"number",step:"0.01",value:ln.discount});
          [concept,qty,price,disc].forEach(inp=>inp.addEventListener("input",()=>{
            ln.concept=concept.value;
            ln.qty=U.parseIntSafe(qty.value)||1;
            ln.price=U.parseFloatSafe(price.value);
            ln.discount=U.parseFloatSafe(disc.value);
            renderLines(); renderTotals();
          }));
          tr.appendChild(UI.el("td",{},concept));
          tr.appendChild(UI.el("td",{},qty));
          tr.appendChild(UI.el("td",{},price));
          tr.appendChild(UI.el("td",{},disc));
          tr.appendChild(UI.el("td",{class:"right mono"},U.money((ln.qty*ln.price)-ln.discount)));
          tr.appendChild(UI.el("td",{class:"right"},UI.el("button",{class:"btn btnDanger",onclick:()=>{lines.splice(idx,1);renderLines();renderTotals();}},"×")));
          tbody.appendChild(tr);
        });
      }
      table.appendChild(tbody); wrap.appendChild(table); linesMount.appendChild(wrap);
    }
    function addEmptyLine(){ lines.push({id:U.uid("ln"),concept:"",qty:1,price:0,discount:0}); renderLines(); renderTotals(); }
    function addLineFromService(){
      const body2=UI.el("div",{class:"formGrid cols2"});
      const ssel=UI.selectRow({label:"Servicio",value:"",options:[
        {value:"",label:"— Selecciona —"},
        ...servicesActive.map(s=>({value:s.id,label:`${s.name} (${U.money(s.price)})`}))
      ]});
      const qty=UI.inputRow({label:"Cantidad",type:"number",value:1,attrs:{step:"1"}});
      body2.appendChild(ssel.wrap); body2.appendChild(qty.wrap);
      Modal.open({title:"Añadir servicio",body:body2,footerButtons:[
        {label:"Cancelar",kind:"btnGhost"},
        {label:"Añadir",onClick:()=>{
          const sid=ssel.select.value;
          const svc=servicesActive.find(s=>s.id===sid);
          if(!svc) throw new Error("Selecciona un servicio.");
          lines.push({id:U.uid("ln"),concept:svc.name,qty:U.parseIntSafe(qty.input.value)||1,price:Number(svc.price)||0,discount:0});
          renderLines(); renderTotals();
          return false;
        }}
      ]});
    }

    const totalsCard=UI.el("div",{class:"card"});
    totalsCard.appendChild(UI.el("div",{style:"font-weight:800;margin-bottom:8px"},"Totales"));
    const totalsRow=UI.el("div",{class:"grid cols3"});
    totalsCard.appendChild(totalsRow);
    body.appendChild(totalsCard);

    function kpi(label,value){ return UI.el("div",{class:"kpi"},[UI.el("div",{class:"label"},label),UI.el("div",{class:"value"},value),UI.el("div",{class:"hint"},"")]);}
    function renderTotals(){
      const vatPercent=U.parseFloatSafe(vat.input.value);
      const t=DocUtils.calcDocTotals(lines,vatPercent);
      UI.clear(totalsRow);
      totalsRow.appendChild(kpi("Base",U.money(t.base)));
      totalsRow.appendChild(kpi(`IVA (${vatPercent}%)`,U.money(t.vatAmount)));
      totalsRow.appendChild(kpi("Total",U.money(t.total)));
    }

    renderLines(); renderTotals();

    Modal.open({title:isNew?"Nuevo albarán":`Editar albarán ${doc.number||""}`,body,footerButtons:[
      {label:"Cancelar",kind:"btnGhost"},
      {label:"Guardar",onClick:async()=>{
        const clientId=clientSel.select.value;
        const client=clients.find(c=>c.id===clientId)||null;
        if(!client) throw new Error("Selecciona un cliente.");
        if(lines.length===0) throw new Error("Añade al menos una línea.");
        const vatPercent=U.parseFloatSafe(vat.input.value);
        const totals=DocUtils.calcDocTotals(lines,vatPercent);

        const obj=doc?{...doc}:{id:U.uid("alb"),createdAt:new Date().toISOString(),status:"pending"};
        obj.date=date.input.value||U.todayISO();
        obj.clientId=client.id; obj.clientName=client.name;
        obj.lines=lines; obj.vatPercent=vatPercent;
        obj.base=totals.base; obj.vatAmount=totals.vatAmount; obj.total=totals.total;
        obj.updatedAt=new Date().toISOString();

        if(isNew){
          const n=await DB.nextCounter(COUNTER,{prefix:settings.docSeriesDelivery||"A"});
          obj.number=`${settings.docSeriesDelivery||"A"}-${String(n).padStart(4,"0")}`;
        }
        await DB.put(STORE,obj);
        UI.toast("Albarán guardado.");
        window.dispatchEvent(new Event("hashchange"));
      }}
    ]});
  }

  async function payDoc(doc){
    if(doc.status==="paid"){UI.toast("Ya está pagado.");return;}
    const body=UI.el("div",{class:"formGrid cols2"});
    const method=UI.selectRow({label:"Método de pago",value:"Efectivo",options:[
      {value:"Efectivo",label:"Efectivo"},{value:"Tarjeta",label:"Tarjeta"},{value:"Transferencia",label:"Transferencia"},{value:"Bizum",label:"Bizum"},{value:"Otro",label:"Otro"},
    ]});
    body.appendChild(method.wrap);
    Modal.open({title:`Cobrar ${doc.number}`,body,footerButtons:[
      {label:"Cancelar",kind:"btnGhost"},
      {label:"Marcar como pagado",kind:"btnSuccess",onClick:async()=>{
        doc.status="paid"; doc.paidAt=new Date().toISOString(); doc.paymentMethod=method.select.value; doc.updatedAt=new Date().toISOString();
        await DB.put(STORE,doc);
        await DB.put("payments",{id:U.uid("pay"),ts:doc.paidAt,direction:"in",amount:doc.total,method:doc.paymentMethod,refType:STORE,refId:doc.id,refNumber:doc.number,clientId:doc.clientId,clientName:doc.clientName});
        UI.toast("Cobro registrado."); window.dispatchEvent(new Event("hashchange"));
      }}
    ]});
  }

  async function convertToInvoice(doc){
    const ok=await Modal.confirm({title:"Convertir a factura",message:`¿Crear factura a partir de ${doc.number}?`});
    if(!ok) return;
    const settings=await Settings.getSettings();
    const inv={id:U.uid("fac"),createdAt:new Date().toISOString(),date:doc.date,clientId:doc.clientId,clientName:doc.clientName,
      lines:doc.lines,vatPercent:doc.vatPercent,base:doc.base,vatAmount:doc.vatAmount,total:doc.total,status:"pending",originId:doc.id,originNumber:doc.number};
    const n=await DB.nextCounter("invoice",{prefix:settings.docSeriesInvoice||"F"});
    inv.number=`${settings.docSeriesInvoice||"F"}-${String(n).padStart(4,"0")}`;
    await DB.put("invoices",inv);
    UI.toast("Factura creada.");
    location.hash="#/invoices";
  }

  async function deleteDoc(doc){
    const ok=await Modal.confirm({title:"Borrar albarán",message:`¿Borrar ${doc.number}?`,danger:true});
    if(!ok) return;
    await DB.del(STORE,doc.id); UI.toast("Albarán borrado."); window.dispatchEvent(new Event("hashchange"));
  }

  async function printDoc(doc,settings){
    const lines=doc.lines||[];
    const html=`
      <div class="h1">Albarán ${U.escapeHtml(doc.number||"")}</div>
      <div class="muted">${U.escapeHtml(settings.companyName||"")} · CIF/NIF: ${U.escapeHtml(settings.taxId||"")}</div>
      <div class="muted">${U.escapeHtml(settings.address||"")} · ${U.escapeHtml(settings.postalCode||"")} · ${U.escapeHtml(settings.phone||"")}</div>
      <div style="height:8px"></div>
      <div class="muted"><b>Fecha:</b> ${U.toLocalDate(doc.date)} · <b>Cliente:</b> ${U.escapeHtml(doc.clientName||"")}</div>
      <table>
        <thead><tr><th>Concepto</th><th class="right">Cant.</th><th class="right">Precio</th><th class="right">Dto.</th><th class="right">Importe</th></tr></thead>
        <tbody>
          ${lines.map(l=>`<tr><td>${U.escapeHtml(l.concept||"")}</td><td class="right">${l.qty||1}</td><td class="right">${U.money(l.price||0)}</td><td class="right">${U.money(l.discount||0)}</td><td class="right">${U.money((l.qty*l.price)-(l.discount||0))}</td></tr>`).join("")}
        </tbody>
      </table>
      <table style="margin-top:10px">
        <tr><th class="right">Base</th><td class="right">${U.money(doc.base)}</td></tr>
        <tr><th class="right">IVA (${doc.vatPercent||0}%)</th><td class="right">${U.money(doc.vatAmount)}</td></tr>
        <tr><th class="right">Total</th><td class="right"><b>${U.money(doc.total)}</b></td></tr>
      </table>
      <div class="muted" style="margin-top:10px">Estado: ${doc.status==="paid"?"Pagado":"Pendiente"} ${doc.paidAt?("· Pago: "+U.toLocalDateTime(doc.paidAt)):""}</div>
    `;
    Printer.printHtml(html);
  }

  window.DeliveryNotesModule={render};
})();