/* modules/agenda.js */
(function(){
  function overlaps(aStart, aEnd, bStart, bEnd){
    return (aStart < bEnd) && (bStart < aEnd);
  }

  function timeToMinutes(hhmm){
    if(!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h,m]=hhmm.split(":").map(n=>parseInt(n,10));
    if(Number.isNaN(h) || Number.isNaN(m)) return null;
    return h*60+m;
  }

  function minutesToTime(min){
    const h = Math.floor(min/60);
    const m = min%60;
    return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
  }

  function addMinutesToDateISO(dateISO, minutes){
    const d = new Date(dateISO);
    d.setMinutes(d.getMinutes()+minutes);
    return d.toISOString();
  }

  function isoToHHMM(iso){
    try{
      return new Date(iso).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
    }catch(_){ return "09:00"; }
  }

  function safeInt(n, def=0){
    const x = parseInt(n,10);
    return Number.isFinite(x) ? x : def;
  }

  function uniqBy(arr, keyFn){
    const seen = new Set();
    const out = [];
    for(const x of arr){
      const k = keyFn(x);
      if(seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }

  function normalizeServicesFromAppt(appt, servicesCatalog){
    // Nuevo modelo: appt.services = [{serviceId,name,durationMin}]
    // Compatibilidad: appt.serviceId / appt.serviceName
    const svcById = new Map((servicesCatalog||[]).map(s=>[s.id,s]));
    let list = [];

    if(Array.isArray(appt?.services) && appt.services.length){
      list = appt.services
        .map(x=>{
          const sid = x.serviceId || x.id || "";
          const cat = sid ? svcById.get(sid) : null;
          return {
            serviceId: sid,
            name: (x.name || cat?.name || "").trim(),
            durationMin: safeInt(x.durationMin ?? cat?.durationMin ?? 0, 0)
          };
        })
        .filter(x=>x.serviceId || x.name);
    }else if(appt?.serviceId){
      const cat = svcById.get(appt.serviceId);
      list = [{
        serviceId: appt.serviceId,
        name: (appt.serviceName || cat?.name || "").trim(),
        durationMin: safeInt(cat?.durationMin ?? 0, 0)
      }].filter(x=>x.serviceId || x.name);
    }

    // Sin servicios: lista vacía
    // Quitar duplicados por serviceId
    list = uniqBy(list, x=>x.serviceId || x.name);
    return list;
  }

  function sumDuration(list){
    return (list||[]).reduce((acc,x)=>acc + safeInt(x.durationMin,0), 0);
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
      const [apps, clients, services] = await Promise.all([
        DB.getAll("appointments"),
        DB.getAll("clients"),
        DB.getAll("services")
      ]);
      const clientById = new Map(clients.map(c=>[c.id,c]));
      const svcById = new Map(services.map(s=>[s.id,s]));

      const v = view.value;
      UI.clear(mount);

      const getServicesLabel = (a)=>{
        const svcs = normalizeServicesFromAppt(a, services);
        if(!svcs.length) return "";
        if(svcs.length===1) return svcs[0].name || "";
        const names = svcs.map(x=>x.name).filter(Boolean);
        const short = names.slice(0,3).join(" + ");
        const more = names.length>3 ? ` +${names.length-3}` : "";
        return `${short}${more} (${svcs.length} servicios)`;
      };

      if(v==="Día"){
        const day = date.value || U.todayISO();
        const rows = apps
          .filter(a=> U.toISODate(a.start)===day)
          .slice()
          .sort((a,b)=> (a.start||"").localeCompare(b.start||""))
          .map(a=> ({
            ...a,
            clientName: a.clientName || (clientById.get(a.clientId)?.name || ""),
            serviceName: getServicesLabel(a)
          }));

        mount.appendChild(UI.table([
          {label:"Inicio", value:(a)=> new Date(a.start).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}), class:"mono"},
          {label:"Fin", value:(a)=> new Date(a.end).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}), class:"mono"},
          {label:"Cliente", key:"clientName"},
          {label:"Servicios", key:"serviceName"},
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
            serviceName: getServicesLabel(a)
          }));
        mount.appendChild(UI.table([
          {label:"Fecha", value:(a)=> U.toLocalDate(U.toISODate(a.start)), class:"mono"},
          {label:"Hora", value:(a)=> new Date(a.start).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}), class:"mono"},
          {label:"Cliente", key:"clientName"},
          {label:"Servicios", key:"serviceName"},
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
      const svcById = new Map(servicesActive.map(s=>[s.id,s]));

      const isNew = !appt;
      const baseDate = dayISO || (appt ? U.toISODate(appt.start) : U.todayISO());
      const startTime = appt ? isoToHHMM(appt.start) : "09:00";

      // Servicios seleccionados (multi)
      let selectedServices = appt ? normalizeServicesFromAppt(appt, servicesActive) : [];

      const body = UI.el("div",{class:"formGrid cols2"});

      const dateInp = UI.inputRow({label:"Fecha", type:"date", value: baseDate});
      const startInp = UI.inputRow({label:"Hora inicio", type:"time", value: startTime});

      // Hora fin se calcula automáticamente (readonly)
      const endInp = UI.inputRow({label:"Hora fin (auto)", type:"time", value: "09:30", attrs:{readonly:true}});
      try{ endInp.input.setAttribute("readonly","readonly"); }catch(_){}

      const clientSel = UI.selectRow({label:"Cliente", value: appt?.clientId || "", options:[
        {value:"", label:"— Selecciona —"},
        ...clientsActive.map(c=>({value:c.id, label:c.name}))
      ]});

      const statusSel = UI.selectRow({label:"Estado", value: appt?.status || "pending", options:[
        {value:"pending", label:"Pendiente"},
        {value:"done", label:"Hecha"},
        {value:"cancel", label:"Cancelada"},
      ]});

      // Selector de servicio + botón "+"
      const svcWrap = UI.el("div",{class:"formRow"});
      const svcLabel = UI.el("div",{class:"label"}, "Servicio");
      const svcRow = UI.el("div",{class:"row", style:"gap:8px; align-items:center"});
      const svcSel = UI.el("select",{class:"input", style:"flex:1"});
      svcSel.appendChild(UI.el("option",{value:""}, "— Selecciona —"));
      servicesActive.forEach(s=>{
        const dur = safeInt(s.durationMin,0);
        svcSel.appendChild(UI.el("option",{value:s.id}, `${s.name}${dur?` (${dur} min)`:``}`));
      });
      const btnAddSvc = UI.el("button",{class:"btn btnGhost", type:"button", title:"Añadir servicio", onclick:()=>addSelectedService()}, "+");
      svcRow.appendChild(svcSel);
      svcRow.appendChild(btnAddSvc);
      svcWrap.appendChild(svcLabel);
      svcWrap.appendChild(svcRow);

      const notes = UI.inputRow({label:"Notas", type:"textarea", value: appt?.notes || ""});

      // Bloque de lista de servicios + tiempos
      const svcListWrap = UI.el("div",{style:"grid-column:1/-1"});
      const svcListTitle = UI.el("div",{style:"font-weight:800; margin-top:6px"}, "Servicios de esta cita");
      const svcListMount = UI.el("div",{class:"tableWrap", style:"margin-top:8px"});
      const svcTotalsRow = UI.el("div",{class:"row space", style:"margin-top:10px"});
      const totalMinEl = UI.el("div",{class:"tiny muted"});
      const endInfoEl = UI.el("div",{class:"tiny muted"});
      svcTotalsRow.appendChild(totalMinEl);
      svcTotalsRow.appendChild(endInfoEl);

      svcListWrap.appendChild(svcListTitle);
      svcListWrap.appendChild(svcListMount);
      svcListWrap.appendChild(svcTotalsRow);

      // Montaje del formulario
      body.appendChild(dateInp.wrap);
      body.appendChild(statusSel.wrap);
      body.appendChild(startInp.wrap);
      body.appendChild(endInp.wrap);
      body.appendChild(clientSel.wrap);
      body.appendChild(svcWrap);
      body.appendChild(svcListWrap);
      body.appendChild(notes.wrap);

      function renderServicesList(){
        UI.clear(svcListMount);

        const table = UI.el("table");
        table.appendChild(UI.el("thead",{},UI.el("tr",{},[
          UI.el("th",{},"Servicio"),
          UI.el("th",{class:"right"},"Tiempo (min)"),
          UI.el("th",{class:"right"},"")
        ])));
        const tb = UI.el("tbody");

        if(!selectedServices.length){
          tb.appendChild(UI.el("tr",{},UI.el("td",{colspan:"3", class:"muted"},"No se han añadido servicios. Puedes reservar tiempo manualmente con servicios de 0 min, o añadir servicios reales.")));
        }else{
          selectedServices.forEach((x,idx)=>{
            const tr = UI.el("tr");
            tr.appendChild(UI.el("td",{}, x.name || "(Sin nombre)"));
            tr.appendChild(UI.el("td",{class:"right mono"}, String(safeInt(x.durationMin,0))));
            tr.appendChild(UI.el("td",{class:"right"}, UI.el("button",{class:"btn btnDanger", type:"button", onclick:()=>{selectedServices.splice(idx,1); syncEndTime(); renderServicesList();}}, "Quitar")));
            tb.appendChild(tr);
          });
        }

        table.appendChild(tb);
        svcListMount.appendChild(table);

        const totalMin = sumDuration(selectedServices);
        totalMinEl.textContent = `Tiempo total reservado: ${totalMin} min`;
      }

      function addSelectedService(){
        const sid = svcSel.value;
        if(!sid) { UI.toast("Selecciona un servicio."); return; }
        const svc = svcById.get(sid);
        if(!svc) { UI.toast("Servicio no válido."); return; }
        // evitar duplicados por id
        if(selectedServices.some(x=>x.serviceId===sid)){
          UI.toast("Ese servicio ya está añadido.");
          return;
        }
        selectedServices.push({
          serviceId: sid,
          name: svc.name || "",
          durationMin: safeInt(svc.durationMin,0)
        });
        syncEndTime();
        renderServicesList();
      }

      function computeStartISO(){
        const d = dateInp.input.value;
        const st = startInp.input.value;
        if(!d || !st) return null;
        return new Date(`${d}T${st}:00`).toISOString();
      }

      function syncEndTime(){
        const startISO = computeStartISO();
        if(!startISO){
          endInp.input.value = "00:00";
          endInfoEl.textContent = "";
          return;
        }
        const totalMin = sumDuration(selectedServices);
        const endISO = addMinutesToDateISO(startISO, totalMin || 0);
        endInp.input.value = isoToHHMM(endISO);
        endInfoEl.textContent = `Hora fin calculada: ${endInp.input.value}`;
      }

      // Inicializa lista/fin
      renderServicesList();
      syncEndTime();

      // Eventos de recalculo
      dateInp.input.addEventListener("change", ()=>{ syncEndTime(); });
      startInp.input.addEventListener("input", ()=>{ syncEndTime(); });

      Modal.open({
        title: isNew ? "Nueva cita" : "Editar cita",
        body,
        footerButtons:[
          {label:"Cancelar", kind:"btnGhost"},
          {label:"Guardar", onClick: async ()=>{
            const d = dateInp.input.value;
            const st = startInp.input.value;
            if(!d || !st) throw new Error("Fecha y hora inicio son obligatorias.");

            const clientId = clientSel.select.value;
            const client = clients.find(c=>c.id===clientId) || null;
            if(!client) throw new Error("Selecciona un cliente.");

            // Calcular start/end reales por duración total
            const start = new Date(`${d}T${st}:00`).toISOString();
            const totalMin = sumDuration(selectedServices);

            // Si no hay servicios, NO dejamos guardar (para forzar tiempo reservado coherente)
            // Si quieres permitirlo, dime y lo cambio.
            if(!selectedServices.length) throw new Error("Añade al menos un servicio para calcular el tiempo.");

            const end = addMinutesToDateISO(start, totalMin);
            if(end <= start) throw new Error("La hora fin debe ser posterior a inicio (duración total > 0).");

            // Comprobar solapes usando el rango real start/end
            const all = await DB.getAll("appointments");
            const others = all.filter(a =>
              a.status!=="cancel" &&
              (!appt || a.id!==appt.id) &&
              U.toISODate(a.start)===d
            );

            const aStart = new Date(start).getTime();
            const aEnd = new Date(end).getTime();

            const hasOverlap = others.some(o=>{
              const bStart = new Date(o.start).getTime();
              const bEnd = new Date(o.end).getTime();
              return overlaps(aStart, aEnd, bStart, bEnd);
            });

            if(hasOverlap) throw new Error("Esa franja horaria se solapa con otra cita.");

            // Persistir: congelar nombre/duración
            const frozenServices = selectedServices.map(x=>{
              const sid = x.serviceId;
              const cat = sid ? svcById.get(sid) : null;
              return {
                serviceId: sid,
                name: (x.name || cat?.name || "").trim(),
                durationMin: safeInt(x.durationMin ?? cat?.durationMin ?? 0, 0)
              };
            });

            const obj = appt ? {...appt} : {id: U.uid("apt"), createdAt:new Date().toISOString()};
            obj.start = start;
            obj.end = end;
            obj.clientId = client.id;
            obj.clientName = client.name;

            // Compatibilidad (primer servicio)
            obj.serviceIds = frozenServices.map(s=>s.serviceId).filter(Boolean);
            obj.services = frozenServices;
            obj.serviceId = frozenServices[0]?.serviceId || "";
            obj.serviceName = frozenServices[0]?.name || "";

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
