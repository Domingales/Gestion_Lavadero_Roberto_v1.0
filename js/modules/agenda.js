/* modules/agenda.js */
(function(){
  function overlaps(aStart, aEnd, bStart, bEnd){
    return (aStart < bEnd) && (bStart < aEnd);
  }

  async function render(container){
    UI.setPage("Agenda / Citas", "Evita solapes y gestiona clientes");

    const card = UI.el("div",{class:"card"});
    const top = UI.el("div",{class:"row space"});
    const date = UI.el("input",{class:"input", type:"date", value: U.todayISO(), style:"max-width:220px"});
    const view = UI.el("select",{class:"input", style:"max-width:220px"});
    ["Día","Listado próximas"].forEach(v=> view.appendChild(UI.el("option",{value:v}, v)));
    top.appendChild(UI.el("div",{class:"row"},[date, view]));
    top.appendChild(UI.el("div",{class:"row"},[
      UI.el("button",{class:"btn", onclick:()=>openAppointmentModal(null, date.value)}, "+ Nueva cita")
    ]));
    card.appendChild(top);
    card.appendChild(UI.el("hr",{class:"sep"}));
    const mount = UI.el("div");
    card.appendChild(mount);
    container.appendChild(card);

    const params = new URLSearchParams((location.hash.split("?")[1]||""));
    if(params.get("new")==="1"){
      openAppointmentModal(null, U.todayISO());
      location.hash = "#/agenda";
    }

    async function refresh(){
      const [apps, clients, services] = await Promise.all([DB.getAll("appointments"), DB.getAll("clients"), DB.getAll("services")]);
      const clientById = new Map(clients.map(c=>[c.id,c]));
      const svcById = new Map(services.map(s=>[s.id,s]));

      const v = view.value;
      UI.clear(mount);

      if(v==="Día"){
        const day = date.value || U.todayISO();
        const rows = apps
          .filter(a=> U.toISODate(a.start)===day)
          .slice()
          .sort((a,b)=> (a.start||"").localeCompare(b.start||""))
          .map(a=> ({
            ...a,
            clientName: a.clientName || (clientById.get(a.clientId)?.name || ""),
            serviceName: a.serviceName || (svcById.get(a.serviceId)?.name || "")
          }));

        mount.appendChild(UI.table([
          {label:"Inicio", value:(a)=> new Date(a.start).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}), class:"mono"},
          {label:"Fin", value:(a)=> new Date(a.end).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}), class:"mono"},
          {label:"Cliente", key:"clientName"},
          {label:"Servicio", key:"serviceName"},
          {label:"Estado", value:(a)=> a.status==="done" ? UI.badge("Hecha","good").outerHTML : (a.status==="cancel" ? UI.badge("Cancelada","bad").outerHTML : UI.badge("Pendiente","warn").outerHTML), html:true},
          {label:"Notas", key:"notes"},
        ], rows, {
          rowActions:(a)=> UI.el("div",{class:"row", style:"justify-content:flex-end"},[
            UI.el("button",{class:"btn btnGhost", onclick:()=>openAppointmentModal(a)}, "Editar"),
            UI.el("button",{class:"btn btnGhost", onclick:()=>markDone(a)}, "Hecha"),
            UI.el("button",{class:"btn btnDanger", onclick:()=>deleteAppointment(a)}, "Borrar")
          ]),
          emptyText:"No hay citas ese día."
        }));
      }else{
        const now = new Date().toISOString();
        const rows = apps
          .filter(a=>a.end >= now && a.status!=="cancel")
          .slice()
          .sort((a,b)=> (a.start||"").localeCompare(b.start||""))
          .slice(0, 200)
          .map(a=> ({
            ...a,
            clientName: a.clientName || (clientById.get(a.clientId)?.name || ""),
            serviceName: a.serviceName || (svcById.get(a.serviceId)?.name || "")
          }));
        mount.appendChild(UI.table([
          {label:"Fecha", value:(a)=> U.toLocalDate(U.toISODate(a.start)), class:"mono"},
          {label:"Hora", value:(a)=> new Date(a.start).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}), class:"mono"},
          {label:"Cliente", key:"clientName"},
          {label:"Servicio", key:"serviceName"},
          {label:"Estado", value:(a)=> a.status==="done" ? UI.badge("Hecha","good").outerHTML : UI.badge("Pendiente","warn").outerHTML, html:true},
        ], rows, {
          rowActions:(a)=> UI.el("div",{class:"row", style:"justify-content:flex-end"},[
            UI.el("button",{class:"btn btnGhost", onclick:()=>openAppointmentModal(a)}, "Editar"),
            UI.el("button",{class:"btn btnGhost", onclick:()=>markDone(a)}, "Hecha"),
            UI.el("button",{class:"btn btnDanger", onclick:()=>deleteAppointment(a)}, "Borrar")
          ]),
          emptyText:"No hay próximas citas."
        }));
      }
    }

    date.addEventListener("change", refresh);
    view.addEventListener("change", refresh);
    await refresh();

    async function markDone(a){
      a.status = "done";
      a.updatedAt = new Date().toISOString();
      await DB.put("appointments", a);
      UI.toast("Cita marcada como hecha.");
      refresh();
    }

    async function deleteAppointment(a){
      const ok = await Modal.confirm({title:"Borrar cita", message:"¿Borrar esta cita?", danger:true});
      if(!ok) return;
      await DB.del("appointments", a.id);
      UI.toast("Cita borrada.");
      refresh();
    }

    async function openAppointmentModal(appt=null, dayISO=null){
      const [clients, services] = await Promise.all([DB.getAll("clients"), DB.getAll("services")]);
      const clientsActive = clients.filter(c=>c.active!==false).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      const servicesActive = services.filter(s=>s.active!==false).sort((a,b)=>(a.name||"").localeCompare(b.name||""));

      const isNew = !appt;
      const baseDate = dayISO || (appt ? U.toISODate(appt.start) : U.todayISO());
      const startTime = appt ? new Date(appt.start).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "09:00";
      const endTime = appt ? new Date(appt.end).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "09:30";

      const body = UI.el("div",{class:"formGrid cols2"});
      const dateInp = UI.inputRow({label:"Fecha", type:"date", value: baseDate});
      const startInp = UI.inputRow({label:"Hora inicio", type:"time", value: startTime});
      const endInp = UI.inputRow({label:"Hora fin", type:"time", value: endTime});
      const clientSel = UI.selectRow({label:"Cliente", value: appt?.clientId || "", options:[
        {value:"", label:"— Selecciona —"},
        ...clientsActive.map(c=>({value:c.id, label:c.name}))
      ]});
      const svcSel = UI.selectRow({label:"Servicio", value: appt?.serviceId || "", options:[
        {value:"", label:"— Opcional —"},
        ...servicesActive.map(s=>({value:s.id, label:s.name}))
      ]});
      const statusSel = UI.selectRow({label:"Estado", value: appt?.status || "pending", options:[
        {value:"pending", label:"Pendiente"},
        {value:"done", label:"Hecha"},
        {value:"cancel", label:"Cancelada"},
      ]});
      const notes = UI.inputRow({label:"Notas", type:"textarea", value: appt?.notes || ""});

      [dateInp,statusSel,startInp,endInp,clientSel,svcSel,notes].forEach(x=> body.appendChild(x.wrap));

      Modal.open({
        title: isNew ? "Nueva cita" : "Editar cita",
        body,
        footerButtons:[
          {label:"Cancelar", kind:"btnGhost"},
          {label:"Guardar", onClick: async ()=>{
            const d = dateInp.input.value;
            const st = startInp.input.value;
            const en = endInp.input.value;
            if(!d || !st || !en) throw new Error("Fecha y horas son obligatorias.");
            const start = new Date(`${d}T${st}:00`).toISOString();
            const end = new Date(`${d}T${en}:00`).toISOString();
            if(end <= start) throw new Error("La hora fin debe ser posterior a inicio.");

            const clientId = clientSel.select.value;
            const client = clients.find(c=>c.id===clientId) || null;
            if(!client) throw new Error("Selecciona un cliente.");

            const all = await DB.getAll("appointments");
            const others = all.filter(a=>a.status!=="cancel" && (!appt || a.id!==appt.id) && U.toISODate(a.start)===d);
            const aStart = new Date(start).getTime();
            const aEnd = new Date(end).getTime();
            const hasOverlap = others.some(o=>{
              const bStart = new Date(o.start).getTime();
              const bEnd = new Date(o.end).getTime();
              return overlaps(aStart, aEnd, bStart, bEnd);
            });
            if(hasOverlap) throw new Error("Esa franja horaria se solapa con otra cita.");

            const svcId = svcSel.select.value;
            const svc = services.find(s=>s.id===svcId) || null;

            const obj = appt ? {...appt} : {id: U.uid("apt"), createdAt:new Date().toISOString()};
            obj.start = start;
            obj.end = end;
            obj.clientId = client.id;
            obj.clientName = client.name;
            obj.serviceId = svc ? svc.id : "";
            obj.serviceName = svc ? svc.name : "";
            obj.status = statusSel.select.value;
            obj.notes = notes.input.value.trim();
            obj.updatedAt = new Date().toISOString();

            await DB.put("appointments", obj);
            UI.toast("Cita guardada.");
            refresh();
          }}
        ]
      });
    }
  }

  window.AgendaModule = { render };
})();