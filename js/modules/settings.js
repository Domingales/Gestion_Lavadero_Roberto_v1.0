/* modules/settings.js */
(function(){
  async function render(container){
    UI.setPage("Ajustes","Empresa, IVA por defecto y series");

    const s=await Settings.getSettings();
    const card=UI.el("div",{class:"card"});
    card.appendChild(UI.el("div",{style:"font-weight:900;font-size:16px"},"Datos de empresa"));
    card.appendChild(UI.el("div",{class:"tiny muted",style:"margin-top:4px"},"Estos datos aparecen en impresiones de albaranes/facturas."));
    card.appendChild(UI.el("hr",{class:"sep"}));

    const form=UI.el("div",{class:"formGrid cols2"});
    const companyName=UI.inputRow({label:"Nombre comercial",value:s.companyName||""});
    const taxId=UI.inputRow({label:"CIF/NIF",value:s.taxId||""});
    const address=UI.inputRow({label:"Dirección",value:s.address||""});
    const postalCode=UI.inputRow({label:"CP",value:s.postalCode||""});
    const phone=UI.inputRow({label:"Teléfono",value:s.phone||""});
    const email=UI.inputRow({label:"Email",value:s.email||""});
    const defaultVat=UI.inputRow({label:"IVA por defecto (%)",type:"number",value:s.defaultVat??21,attrs:{step:"0.01"}});
    const seriesA=UI.inputRow({label:"Serie albaranes (prefijo)",value:s.docSeriesDelivery||"A"});
    const seriesF=UI.inputRow({label:"Serie facturas (prefijo)",value:s.docSeriesInvoice||"F"});

    [companyName,taxId,address,postalCode,phone,email,defaultVat,seriesA,seriesF].forEach(x=>form.appendChild(x.wrap));

    const btns=UI.el("div",{class:"row",style:"margin-top:12px"});
    btns.appendChild(UI.el("button",{class:"btn btnSuccess",onclick:()=>save()},"Guardar cambios"));
    btns.appendChild(UI.el("button",{class:"btn btnDanger",onclick:()=>factoryReset()},"Borrar todos los datos"));

    card.appendChild(form); card.appendChild(btns);
    container.appendChild(card);

    async function save(){
      await Settings.setSettings({
        companyName:companyName.input.value.trim(),
        taxId:taxId.input.value.trim(),
        address:address.input.value.trim(),
        postalCode:postalCode.input.value.trim(),
        phone:phone.input.value.trim(),
        email:email.input.value.trim(),
        defaultVat:U.parseFloatSafe(defaultVat.input.value)||0,
        docSeriesDelivery:(seriesA.input.value.trim()||"A"),
        docSeriesInvoice:(seriesF.input.value.trim()||"F")
      });
      UI.toast("Ajustes guardados.");
    }

    async function factoryReset(){
      const ok=await Modal.confirm({title:"Borrado total",message:"¿Borrar TODOS los datos de la aplicación?",danger:true});
      if(!ok) return;
      for(const name of Object.keys(DB.STORES)){ await DB.clearStore(name); }
      UI.toast("Datos borrados."); location.hash="#/dashboard"; location.reload();
    }
  }
  window.SettingsModule={render};
})();