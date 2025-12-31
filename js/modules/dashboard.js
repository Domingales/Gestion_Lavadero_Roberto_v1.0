(function(){
  async function computeKpis(){
    const today=U.todayISO(), monthStart=U.startOfMonthISO(today);
    const [dn,inv,exp,cash]=await Promise.all([DB.getAll("deliveryNotes"),DB.getAll("invoices"),DB.getAll("expenses"),DB.getAll("cashDays")]);
    const paid=[...dn,...inv].filter(d=>d.status==="paid");
    const dayIncome=U.sum(paid.filter(d=>d.paidAt&&U.toISODate(d.paidAt)===today),d=>d.total);
    const dayExp=U.sum(exp.filter(e=>e.status==="paid"&&e.paidAt&&U.toISODate(e.paidAt)===today),e=>e.total);
    const monthIncome=U.sum(paid.filter(d=>d.paidAt&&U.isBetween(U.toISODate(d.paidAt),monthStart,today)),d=>d.total);
    const monthExp=U.sum(exp.filter(e=>e.status==="paid"&&e.paidAt&&U.isBetween(U.toISODate(e.paidAt),monthStart,today)),e=>e.total);
    const totalIncome=U.sum(paid,d=>d.total);
    const totalExp=U.sum(exp.filter(e=>e.status==="paid"),e=>e.total);
    const toCollect=U.sum([...dn,...inv].filter(d=>d.status!=="paid"),d=>d.total);
    const toPay=U.sum(exp.filter(e=>e.status!=="paid"),e=>e.total);
    const todayCash=cash.find(c=>c.id===today)||null;
    const cashState=todayCash?(todayCash.closedAt?`Cerrada (${U.money(todayCash.closingCounted)})`:`Abierta (Apertura ${U.money(todayCash.opening)})`):"Sin caja abierta hoy";
    return {cashState,dayBalance:dayIncome-dayExp,monthBalance:monthIncome-monthExp,totalBalance:totalIncome-totalExp,toCollect,toPay};
  }
  function kpiCard(label,value){
    const kind=value>0?"good":(value<0?"bad":"warn");
    return UI.el("div",{class:"kpi"},[UI.el("div",{class:"label"},label),UI.el("div",{class:"value"},U.money(value)),UI.el("div",{class:"hint"},UI.badge(kind==="good"?"OK":(kind==="bad"?"Atención":"Neutro"),kind))]);
  }
  async function render(container){
    UI.setPage("Panel","Resumen y balances");
    const s=await Settings.getSettings();
    const k=await computeKpis();
    const wrap=UI.el("div",{class:"grid",style:"gap:14px"});
    const header=UI.el("div",{class:"card"},[
      UI.el("div",{class:"row space"},[
        UI.el("div",{},[UI.el("div",{style:"font-weight:900;font-size:18px"},s.companyName||"Empresa"),UI.el("div",{class:"tiny muted"},`Hoy: ${U.toLocalDate(U.todayISO())}`)]),
        UI.el("div",{class:"row"},[
          UI.el("button",{class:"btn",type:"button",onclick:()=>location.hash="#/deliveryNotes?new=1"},"+ Albarán"),
          UI.el("button",{class:"btn btnGhost",type:"button",onclick:()=>location.hash="#/cash"},"Caja")
        ])
      ]),
      UI.el("hr",{class:"sep"}),
      UI.el("div",{class:"row"},[UI.el("span",{class:"badge"},`Caja: ${k.cashState}`)])
    ]);
    const grid=UI.el("div",{class:"grid cols3"});
    grid.appendChild(kpiCard("Balance del día",k.dayBalance));
    grid.appendChild(kpiCard("Balance del mes",k.monthBalance));
    grid.appendChild(kpiCard("Balance total",k.totalBalance));
    grid.appendChild(kpiCard("Por cobrar",k.toCollect));
    grid.appendChild(kpiCard("Por pagar",-k.toPay));
    grid.appendChild(UI.el("div",{class:"kpi"},[
      UI.el("div",{class:"label"},"Accesos rápidos"),
      UI.el("div",{class:"row"},[
        UI.el("button",{class:"btn btnGhost",type:"button",onclick:()=>location.hash="#/agenda?new=1"},"Nueva cita"),
        UI.el("button",{class:"btn btnGhost",type:"button",onclick:()=>location.hash="#/invoices?new=1"},"Nueva factura"),
        UI.el("button",{class:"btn btnGhost",type:"button",onclick:()=>location.hash="#/reports"},"Informes")
      ])
    ]));
    wrap.appendChild(header); wrap.appendChild(grid); container.appendChild(wrap);
  }
  window.DashboardModule={render};
})();