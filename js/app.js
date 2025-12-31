(function(){
  const routes={
    dashboard: ()=>DashboardModule.render(UI.content()),
    cash: ()=>CashModule.render(UI.content()),
    clients: ()=>ClientsModule.render(UI.content()),
    services: ()=>ServicesModule.render(UI.content()),
    agenda: ()=>AgendaModule.render(UI.content()),
    deliveryNotes: ()=>DeliveryNotesModule.render(UI.content()),
    invoices: ()=>InvoicesModule.render(UI.content()),
    expenses: ()=>ExpensesModule.render(UI.content()),
    stock: ()=>StockModule.render(UI.content()),
    reports: ()=>ReportsModule.render(UI.content()),
    export: ()=>ExportHubModule.render(UI.content()),
    settings: ()=>SettingsModule.render(UI.content()),
  };

  function getRoute(){
    const h=location.hash||"#/dashboard";
    const name=(h.split("?")[0].replace("#/","")||"dashboard").trim();
    return routes[name]?name:"dashboard";
  }

  function setActiveNav(name){
    document.querySelectorAll(".navItem").forEach(a=>{
      const r=a.getAttribute("data-route");
      if(r===name) a.classList.add("active"); else a.classList.remove("active");
    });
  }

  async function render(){
    await DB.open();
    const name=getRoute();
    setActiveNav(name);
    const c=UI.content();
    UI.clear(c);
    try{
      await routes[name]();
    }catch(e){
      console.error(e);
      c.appendChild(UI.el("div",{class:"card"},[
        UI.el("div",{style:"font-weight:900"}, "Error"),
        UI.el("div",{class:"tiny muted",style:"margin-top:6px"}, e?.message||String(e))
      ]));
    }
  }

  function bindUI(){
    const btn=document.getElementById("btnToggleSidebar");
    const side=document.querySelector(".sidebar");
    btn?.addEventListener("click",()=>side.classList.toggle("open"));

    document.getElementById("btnQuickNewAppointment")?.addEventListener("click",()=>{location.hash="#/agenda?new=1";});
    document.getElementById("btnQuickNewDoc")?.addEventListener("click",()=>{location.hash="#/deliveryNotes?new=1";});
  }

  window.addEventListener("hashchange",render);
  window.addEventListener("load",()=>{bindUI(); render();});
})();