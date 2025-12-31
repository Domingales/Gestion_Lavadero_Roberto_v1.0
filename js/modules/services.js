/* modules/services.js */
(function(){
  async function render(container){
    UI.setPage("Servicios / Tarifas", "Gestión de precios e impresión");

    const card = UI.el("div",{class:"card"});
    const top = UI.el("div",{class:"row space"});
    const q = UI.el("input",{class:"input", placeholder:"Buscar servicio…", style:"max-width:420px"});
    top.appendChild(UI.el("div",{class:"row"},[q]));
    top.appendChild(UI.el("div",{class:"row"},[
      UI.el("button",{class:"btn", onclick:()=>openServiceModal()}, "+ Nuevo servicio"),
      UI.el("button",{class:"btn btnGhost", onclick:()=>printServices()}, "Imprimir tarifas")
    ]));
    card.appendChild(top);
    card.appendChild(UI.el("hr",{class:"sep"}));
    const mount = UI.el("div");
    card.appendChild(mount);
    container.appendChild(card);

    async function refresh(){
      const s = await Settings.getSettings();
      const rows = (await DB.getAll("services")).slice()
        .filter(x=> ((q.value||"").trim() ? (x.name||"").toLowerCase().includes((q.value||"").trim().toLowerCase()) : true))
        .sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      UI.clear(mount);
      mount.appendChild(UI.table([
        {label:"Servicio", value:(x)=> `<div style="font-weight:700">${U.escapeHtml(x.name||"")}</div><div class="tiny muted">Duración: ${(x.durationMin||0)} min · IVA: ${(x.vat ?? s.defaultVat)}%</div>`, html:true},
        {label:"Precio", value:(x)=> U.money(x.price), class:"right mono"},
        {label:"Estado", value:(x)=> x.active ? UI.badge("Activo","good").outerHTML : UI.badge("Inactivo","bad").outerHTML, html:true}
      ], rows, {
        rowActions:(x)=> UI.el("div",{class:"row", style:"justify-content:flex-end"},[
          UI.el("button",{class:"btn btnGhost", onclick:()=>openServiceModal(x)}, "Editar"),
          UI.el("button",{class:"btn btnDanger", onclick:()=>deleteService(x)}, "Borrar")
        ]),
        emptyText:"No hay servicios."
      }));
      window.__lastTable = {
        headers:["Servicio","Precio","IVA","Duración","Activo"],
        rows: rows.map(x=>[x.name,x.price,(x.vat??""),x.durationMin,x.active])
      };
    }

    q.addEventListener("input", ()=> refresh());
    await refresh();
  }

  async function openServiceModal(service=null){
    const isNew = !service;
    const s = await Settings.getSettings();

    const body = UI.el("div",{class:"formGrid cols2"});
    const name = UI.inputRow({label:"Nombre del servicio", value: service?.name || ""});
    const price = UI.inputRow({label:"Precio (€)", type:"number", value: service?.price ?? "", attrs:{step:"0.01"}});
    const vat = UI.inputRow({label:"IVA (%) (vacío = por defecto)", type:"number", value: (service?.vat ?? ""), attrs:{step:"0.01", placeholder:String(s.defaultVat)}});
    const duration = UI.inputRow({label:"Duración estimada (min)", type:"number", value: service?.durationMin ?? "", attrs:{step:"1"}});
    const active = UI.selectRow({label:"Estado", value: service?.active===false ? "0":"1", options:[
      {value:"1", label:"Activo"},
      {value:"0", label:"Inactivo"}
    ]});

    [name,price,vat,duration,active].forEach(x=> body.appendChild(x.wrap));

    Modal.open({
      title: isNew ? "Nuevo servicio" : "Editar servicio",
      body,
      footerButtons:[
        {label:"Cancelar", kind:"btnGhost"},
        {label:"Guardar", onClick: async ()=>{
          const n = name.input.value.trim();
          if(!n) throw new Error("El nombre es obligatorio.");
          const p = U.parseFloatSafe(price.input.value);
          if(p <= 0) throw new Error("El precio debe ser > 0.");
          const obj = service ? {...service} : {id: U.uid("svc"), createdAt:new Date().toISOString()};
          obj.name = n;
          obj.price = p;
          const v = vat.input.value.trim();
          obj.vat = v ? U.parseFloatSafe(v) : null;
          obj.durationMin = U.parseIntSafe(duration.input.value);
          obj.active = active.select.value==="1";
          obj.updatedAt = new Date().toISOString();
          await DB.put("services", obj);
          UI.toast("Servicio guardado.");
          window.dispatchEvent(new Event("hashchange"));
        }}
      ]
    });
  }

  async function deleteService(service){
    const ok = await Modal.confirm({title:"Borrar servicio", message:`¿Borrar "${service.name}"?`, danger:true});
    if(!ok) return;
    await DB.del("services", service.id);
    UI.toast("Servicio borrado.");
    window.dispatchEvent(new Event("hashchange"));
  }

  async function printServices(){
    const s = await Settings.getSettings();
    const rows = (await DB.getAll("services")).filter(x=>x.active!==false).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    const html = `
      <div class="h1">Tarifas · ${U.escapeHtml(s.companyName||"")}</div>
      <div class="muted">Fecha: ${U.toLocalDate(U.todayISO())}</div>
      <table>
        <thead><tr><th>Servicio</th><th class="right">Precio</th><th class="right">IVA</th><th class="right">Duración</th></tr></thead>
        <tbody>
          ${rows.map(r=>`
            <tr>
              <td>${U.escapeHtml(r.name||"")}</td>
              <td class="right">${U.money(r.price)}</td>
              <td class="right">${(r.vat ?? s.defaultVat)}%</td>
              <td class="right">${(r.durationMin||0)} min</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    Printer.printHtml(html);
  }

  window.ServicesModule = { render };
})();