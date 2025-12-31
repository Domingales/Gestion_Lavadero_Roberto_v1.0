(function(){
  async function importJSONFile(file,{mode="replace"}={}){
    const text=await file.text(); let payload=null; try{payload=JSON.parse(text);}catch{throw new Error("El archivo no es un JSON válido.");}
    await DB.importAll(payload,{mode}); UI.toast(mode==="replace"?"Importación completada (reemplazo).":"Importación completada (fusión)."); window.location.reload();
  }
  function pickAndImport({mode="replace"}={}){
    const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json,.json";
    inp.onchange=async()=>{const file=inp.files&&inp.files[0]; if(!file) return; try{await importJSONFile(file,{mode});}catch(e){console.error(e); UI.toast(e?.message||"Error al importar");}};
    inp.click();
  }
  window.Importer={pickAndImport,importJSONFile};
})();