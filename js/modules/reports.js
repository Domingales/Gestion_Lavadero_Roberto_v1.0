/* modules/reports.js */
(function(){
  async function render(container){
    UI.setPage("Informes","Resúmenes exportables");

    const card=UI.el("div",{class:"card"});
    card.appendChild(UI.el("div",{style:"font-weight:900;font-size:16px"},"Informes"));
    card.appendChild(UI.el("div",{class:"tiny muted",style:"margin-top:4px"},"Genera un informe y cópialo a Excel."));
    card.appendChild(UI.el("hr",{class:"sep"}));

    const controls=UI.el("div",{class:"formGrid cols3"});
    const start=UI.inputRow({label:"Desde",type:"date",value:U.startOfMonthISO(U.todayISO())});
    const end=UI.inputRow({label:"Hasta",type:"date",value:U.todayISO()});
    const type=UI.selectRow({label:"Tipo",value:"Resumen financiero",options:[
      {value:"Resumen financiero",label:"Resumen financiero"},
      {value:"Cobros",label:"Cobros (clientes)"},
      {value:"Pagos",label:"Pagos (gastos)"},
      {value:"Pendientes",label:"Documentos pendientes"},
    ]});
    controls.appendChild(start.wrap); controls.appendChild(end.wrap); controls.appendChild(type.wrap);

    const btns=UI.el("div",{class:"row",style:"margin-top:10px"});
    const btnGen=UI.el("button",{class:"btn",onclick:()=>generate()},"Generar");
    const btnCopy=UI.el("button",{class:"btn btnGhost",onclick:()=>copy()},"Copiar Excel");
    const btnPrint=UI.el("button",{class:"btn btnGhost",onclick:()=>print()},"Imprimir");
    btns.appendChild(btnGen); btns.appendChild(btnCopy); btns.appendChild(btnPrint);

    const mount=UI.el("div",{style:"margin-top:12px"});
    card.appendChild(controls); card.appendChild(btns); card.appendChild(UI.el("hr",{class:"sep"})); card.appendChild(mount);
    container.appendChild(card);

    let last=null;

    async function generate(){
      const a=start.input.value, b=end.input.value;
      if(a && b && b<a) throw new Error("El rango es inválido (Hasta < Desde).");
      const t=type.select.value;

      const [dn,inv,exp,pays]=await Promise.all([DB.getAll("deliveryNotes"),DB.getAll("invoices"),DB.getAll("expenses"),DB.getAll("payments")]);
      UI.clear(mount);

      if(t==="Resumen financiero"){
        const inPays=pays.filter(p=>p.direction==="in" && U.isBetween(U.toISODate(p.ts),a,b));
        const outPays=pays.filter(p=>p.direction==="out" && U.isBetween(U.toISODate(p.ts),a,b));
        const income=U.sum(inPays,p=>p.amount), spend=U.sum(outPays,p=>p.amount), balance=income-spend;

        const kpis=UI.el("div",{class:"grid cols3"});
        const kpi=(lab,val)=>UI.el("div",{class:"kpi"},[UI.el("div",{class:"label"},lab),UI.el("div",{class:"value"},U.money(val)),UI.el("div",{class:"hint"},"")]);
        kpis.appendChild(kpi("Ingresos cobrados",income));
        kpis.appendChild(kpi("Gastos pagados",spend));
        kpis.appendChild(kpi("Balance",balance));
        mount.appendChild(kpis); mount.appendChild(UI.el("div",{style:"height:12px"}));

        const rows=[["Ingresos cobrados",income],["Gastos pagados",spend],["Balance",balance]];
        last={headers:["Concepto","Importe"],rows:rows.map(r=>[r[0],r[1]])};
        mount.appendChild(UI.table([{label:"Concepto",value:r=>r[0]},{label:"Importe",value:r=>U.money(r[1]),class:"right mono"}],rows));
      }

      if(t==="Cobros"){
        const rows=pays.filter(p=>p.direction==="in" && U.isBetween(U.toISODate(p.ts),a,b)).sort((x,y)=>(y.ts||"").localeCompare(x.ts||""));
        last={headers:["Fecha","Número","Cliente","Método","Importe"],rows:rows.map(p=>[U.toLocalDateTime(p.ts),p.refNumber||"",p.clientName||"",p.method||"",p.amount])};
        mount.appendChild(UI.table([
          {label:"Fecha",value:p=>U.toLocalDateTime(p.ts),class:"mono"},
          {label:"Documento",value:p=>p.refNumber||"",class:"mono"},
          {label:"Cliente",value:p=>p.clientName||""},
          {label:"Método",value:p=>p.method||""},
          {label:"Importe",value:p=>U.money(p.amount),class:"right mono"},
        ],rows,{emptyText:"No hay cobros en el rango."}));
      }

      if(t==="Pagos"){
        const rows=pays.filter(p=>p.direction==="out" && U.isBetween(U.toISODate(p.ts),a,b)).sort((x,y)=>(y.ts||"").localeCompare(x.ts||""));
        last={headers:["Fecha","Referencia","Método","Importe"],rows:rows.map(p=>[U.toLocalDateTime(p.ts),p.refNumber||"",p.method||"",p.amount])};
        mount.appendChild(UI.table([
          {label:"Fecha",value:p=>U.toLocalDateTime(p.ts),class:"mono"},
          {label:"Referencia",value:p=>p.refNumber||""},
          {label:"Método",value:p=>p.method||""},
          {label:"Importe",value:p=>U.money(p.amount),class:"right mono"},
        ],rows,{emptyText:"No hay pagos en el rango."}));
      }

      if(t==="Pendientes"){
        const docs=[...dn,...inv].filter(d=>d.status!=="paid" && U.isBetween(d.date,a,b)).sort((x,y)=>(y.date||"").localeCompare(x.date||""));
        last={headers:["Tipo","Número","Fecha","Cliente","Total"],rows:docs.map(d=>[(d.originId?"Factura":(d.number||"").startsWith("F")?"Factura":"Albarán"),d.number||"",U.toLocalDate(d.date),d.clientName||"",d.total])};
        mount.appendChild(UI.table([
          {label:"Tipo",value:d=>(d.number||"").startsWith("F")?"Factura":"Albarán"},
          {label:"Número",value:d=>d.number||"",class:"mono"},
          {label:"Fecha",value:d=>U.toLocalDate(d.date),class:"mono"},
          {label:"Cliente",value:d=>d.clientName||""},
          {label:"Total",value:d=>U.money(d.total),class:"right mono"},
        ],docs,{emptyText:"No hay pendientes en el rango."}));
      }

      UI.toast("Informe generado.");
    }

    async function copy(){ if(!last){UI.toast("Primero genera un informe.");return;} await Export.copyTableTSV({headers:last.headers,rows:last.rows}); }
    function print(){
      if(!last){UI.toast("Primero genera un informe.");return;}
      const html=`<div class="h1">Informe · ${U.escapeHtml(type.select.value)}</div>
        <div class="muted">Rango: ${U.toLocalDate(start.input.value)} → ${U.toLocalDate(end.input.value)}</div>
        <table><thead><tr>${last.headers.map(h=>`<th>${U.escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${last.rows.map(r=>`<tr>${r.map(x=>`<td>${U.escapeHtml(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      Printer.printHtml(html);
    }

    await generate();
  }

  window.ReportsModule={render};
})();