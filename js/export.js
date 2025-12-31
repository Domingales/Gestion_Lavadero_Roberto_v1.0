(function(){
  function toCSV(rows,columns){
    const esc=v=>{const s=String(v??""); const needs=/[",\n;]/.test(s); const s2=s.replaceAll('"','""'); return needs?`"${s2}"`:s2;};
    const header=columns.map(c=>esc(c.label)).join(";"); const lines=(rows||[]).map(r=>columns.map(c=>esc(typeof c.value==="function"?c.value(r):r[c.key])).join(";"));
    return [header,...lines].join("\n");
  }
  async function exportJSON(){const all=await DB.exportAll(); const name=`lavadero_backup_${new Date().toISOString().slice(0,10)}.json`; U.downloadText(name,JSON.stringify(all,null,2)); UI.toast("Backup JSON generado.");}
  async function exportCSVPack(){
    const all=await DB.exportAll(); const date=new Date().toISOString().slice(0,10);
    const files=[];
    const push=(name,csv)=>files.push({name,csv});
    push(`clientes_${date}.csv`, toCSV(all.clients,[{key:"id",label:"ID"},{key:"name",label:"Nombre"},{key:"phone",label:"Teléfono"},{key:"email",label:"Email"},{key:"taxId",label:"CIF/NIF"},{key:"active",label:"Activo"},{key:"notes",label:"Notas"},{key:"createdAt",label:"Alta"}]));
    push(`servicios_${date}.csv`, toCSV(all.services,[{key:"id",label:"ID"},{key:"name",label:"Servicio"},{key:"price",label:"Precio"},{key:"vat",label:"IVA%"},{key:"durationMin",label:"Duración(min)"},{key:"active",label:"Activo"}]));
    push(`stock_${date}.csv`, toCSV(all.stockItems,[{key:"id",label:"ID"},{key:"name",label:"Artículo"},{key:"supplier",label:"Proveedor"},{key:"cost",label:"Coste"},{key:"price",label:"PVP"},{key:"qty",label:"Cantidad"},{key:"minQty",label:"Mínimo"},{key:"notes",label:"Notas"}]));
    push(`agenda_${date}.csv`, toCSV(all.appointments,[{key:"id",label:"ID"},{key:"start",label:"Inicio"},{key:"end",label:"Fin"},{key:"clientName",label:"Cliente"},{key:"serviceName",label:"Servicio"},{key:"status",label:"Estado"},{key:"notes",label:"Notas"}]));
    push(`caja_${date}.csv`, toCSV(all.cashDays,[{key:"id",label:"Fecha"},{key:"openedAt",label:"Apertura"},{key:"opening",label:"Importe apertura"},{key:"closedAt",label:"Cierre"},{key:"closingCounted",label:"Contado"},{key:"closingTheoretical",label:"Teórico"},{key:"diff",label:"Descuadre"},{key:"notes",label:"Notas"}]));
    const docCols=[{key:"id",label:"ID"},{key:"number",label:"Número"},{key:"date",label:"Fecha"},{key:"clientName",label:"Cliente"},{key:"base",label:"Base"},{key:"vatPercent",label:"IVA%"},{key:"vatAmount",label:"IVA"},{key:"total",label:"Total"},{key:"status",label:"Estado"},{key:"paidAt",label:"Fecha pago"},{key:"paymentMethod",label:"Método"},{key:"originId",label:"Origen"}];
    push(`albaranes_${date}.csv`, toCSV(all.deliveryNotes,docCols));
    push(`facturas_${date}.csv`, toCSV(all.invoices,docCols));
    push(`gastos_${date}.csv`, toCSV(all.expenses,[{key:"id",label:"ID"},{key:"date",label:"Fecha"},{key:"concept",label:"Concepto"},{key:"category",label:"Categoría"},{key:"provider",label:"Proveedor"},{key:"base",label:"Base"},{key:"vatPercent",label:"IVA%"},{key:"vatAmount",label:"IVA"},{key:"total",label:"Total"},{key:"status",label:"Estado"},{key:"paidAt",label:"Fecha pago"},{key:"paymentMethod",label:"Método"},{key:"notes",label:"Notas"}]));
    for(const f of files) U.downloadText(f.name,f.csv);
    UI.toast("CSV exportado (varios archivos).");
  }
  async function copyTableTSV({headers,rows}){
    const esc=v=>String(v??"").replaceAll("\t"," ").replaceAll("\n"," ");
    const lines=[]; if(headers?.length) lines.push(headers.map(esc).join("\t"));
    (rows||[]).forEach(r=>lines.push(r.map(esc).join("\t")));
    const text=lines.join("\n");
    await navigator.clipboard.writeText(text);
    UI.toast("Copiado al portapapeles (formato Excel).");
    return text;
  }
  window.Export={toCSV,exportJSON,exportCSVPack,copyTableTSV};
})();