/* modules/clients.js */
(function(){
  async function render(container){
    UI.setPage("Clientes", "Base de datos de clientes");

    const card = UI.el("div",{class:"card"});
    const top = UI.el("div",{class:"row space"});
    const q = UI.el("input",{class:"input", placeholder:"Buscar cliente…", style:"max-width:420px"});
    top.appendChild(UI.el("div",{class:"row"},[q]));
    top.appendChild(UI.el("div",{class:"row"},[
      UI.el("button",{class:"btn", onclick:()=>openClientModal()}, "+ Nuevo cliente")
    ]));
    card.appendChild(top);
    card.appendChild(UI.el("hr",{class:"sep"}));
    const mount = UI.el("div");
    card.appendChild(mount);
    container.appendChild(card);

    async function refresh(){
      const rows = (await DB.getAll("clients")).slice()
        .filter(x=> ((q.value||"").trim() ? (x.name||"").toLowerCase().includes((q.value||"").trim().toLowerCase()) : true))
        .sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      UI.clear(mount);
      mount.appendChild(UI.table([
        {label:"Cliente", value:(x)=> `<div style="font-weight:700">${U.escapeHtml(x.name||"")}</div><div class="tiny muted">${U.escapeHtml(x.phone||"")} · ${U.escapeHtml(x.email||"")}</div>`, html:true},
        {label:"CIF/NIF", key:"taxId", class:"mono"},
        {label:"Estado", value:(x)=> x.active ? UI.badge("Activo","good").outerHTML : UI.badge("Inactivo","bad").outerHTML, html:true},
      ], rows, {
        rowActions:(x)=> UI.el("div",{class:"row", style:"justify-content:flex-end"},[
          UI.el("button",{class:"btn btnGhost", onclick:()=>openClientModal(x)}, "Editar"),
          UI.el("button",{class:"btn btnGhost", onclick:()=>goNewDelivery(x)}, "Nuevo albarán"),
          UI.el("button",{class:"btn btnDanger", onclick:()=>deleteClient(x)}, "Borrar")
        ]),
        emptyText:"No hay clientes."
      }));
      window.__lastTable = {
        headers:["Nombre","Teléfono","Email","CIF/NIF","Activo"],
        rows: rows.map(x=>[x.name,x.phone,x.email,x.taxId,x.active])
      };
    }

    q.addEventListener("input", ()=> refresh());
    await refresh();
  }

  function goNewDelivery(client){
    location.hash = `#/deliveryNotes?new=1&client=${encodeURIComponent(client.id)}`;
  }

  async function openClientModal(client=null){
    const isNew = !client;
    const body = UI.el("div",{class:"formGrid cols2"});
    const name = UI.inputRow({label:"Nombre", value: client?.name || ""});
    const phone = UI.inputRow({label:"Teléfono", value: client?.phone || ""});
    const email = UI.inputRow({label:"Email", value: client?.email || ""});
    const taxId = UI.inputRow({label:"CIF/NIF", value: client?.taxId || ""});
    const address = UI.inputRow({label:"Dirección", value: client?.address || ""});
    const notes = UI.inputRow({label:"Notas", type:"textarea", value: client?.notes || ""});
    const active = UI.selectRow({label:"Estado", value: client?.active===false ? "0":"1", options:[
      {value:"1", label:"Activo"},
      {value:"0", label:"Inactivo"}
    ]});

    [name,phone,email,taxId,address,active,notes].forEach(x=> body.appendChild(x.wrap));

    Modal.open({
      title: isNew ? "Nuevo cliente" : "Editar cliente",
      body,
      footerButtons:[
        {label:"Cancelar", kind:"btnGhost"},
        {label:"Guardar", onClick: async ()=>{
          const n = name.input.value.trim();
          if(!n) throw new Error("El nombre es obligatorio.");
          const obj = client ? {...client} : {id: U.uid("cli"), createdAt:new Date().toISOString()};
          obj.name = n;
          obj.phone = phone.input.value.trim();
          obj.email = email.input.value.trim();
          obj.taxId = taxId.input.value.trim();
          obj.address = address.input.value.trim();
          obj.notes = notes.input.value.trim();
          obj.active = active.select.value==="1";
          obj.updatedAt = new Date().toISOString();
          await DB.put("clients", obj);
          UI.toast("Cliente guardado.");
          window.dispatchEvent(new Event("hashchange"));
        }}
      ]
    });
  }

  async function deleteClient(client){
    const ok = await Modal.confirm({title:"Borrar cliente", message:`¿Borrar "${client.name}"?`, danger:true});
    if(!ok) return;
    await DB.del("clients", client.id);
    UI.toast("Cliente borrado.");
    window.dispatchEvent(new Event("hashchange"));
  }

  window.ClientsModule = { render };
})();