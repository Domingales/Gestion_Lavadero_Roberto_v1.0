(function(){
  const DEFAULT={id:"settings",companyName:"Lavadero Roberto",taxId:"",address:"",postalCode:"",phone:"",email:"",defaultVat:21,docSeriesDelivery:"A",docSeriesInvoice:"F"};
  async function getSettings(){const s=await DB.get("settings","settings"); if(s) return s; await DB.put("settings",DEFAULT); return DEFAULT;}
  async function setSettings(partial){const s=await getSettings(); const next={...s,...partial,id:"settings",updatedAt:new Date().toISOString()}; await DB.put("settings",next); return next;}
  window.Settings={getSettings,setSettings,DEFAULT};
})();