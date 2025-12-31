/* modules/exportHub.js */
(function(){
  async function render(container){
    UI.setPage("Exportar / Importar","Backup JSON, CSV y copiar a Excel");

    const card=UI.el("div",{class:"card"});
    card.appendChild(UI.el("div",{style:"font-weight:900;font-size:16px"},"Copias de seguridad y exportación"));
    card.appendChild(UI.el("div",{class:"tiny muted",style:"margin-top:4px"},"Recomendación: Exporta un JSON semanalmente."));
    card.appendChild(UI.el("hr",{class:"sep"}));

    const grid=UI.el("div",{class:"grid cols3"});
    grid.appendChild(tile("Backup JSON","Exporta todos los datos en un archivo .json","Exportar JSON",async()=>{await Export.exportJSON();},"btnSuccess"));
    grid.appendChild(tile("Exportar CSV","Exporta varios CSV (uno por entidad) compatibles con Excel","Exportar CSV",async()=>{await Export.exportCSVPack();},"btnGhost"));
    grid.appendChild(tile("Importar JSON","Restaura datos desde un backup (modo reemplazo)","Importar JSON",async()=>{Importer.pickAndImport({mode:"replace"});},"btnDanger"));
    card.appendChild(grid);

    card.appendChild(UI.el("hr",{class:"sep"}));
    card.appendChild(UI.el("div",{class:"row space"},[
      UI.el("div",{},[
        UI.el("div",{style:"font-weight:800"},"Copiar última tabla"),
        UI.el("div",{class:"tiny muted"},"Copia al portapapeles la última tabla vista en listados.")
      ]),
      UI.el("button",{class:"btn btnGhost",onclick:()=>copyLast()},"Copiar (Excel)")
    ]));

    container.appendChild(card);

    async function copyLast(){
      if(!window.__lastTable){UI.toast("No hay ninguna tabla reciente.");return;}
      await Export.copyTableTSV({headers:window.__lastTable.headers,rows:window.__lastTable.rows});
    }
  }

  function tile(title,desc,btnLabel,onClick,btnKind=""){
    return UI.el("div",{class:"kpi"},[
      UI.el("div",{class:"label"},title),
      UI.el("div",{class:"value",style:"font-size:16px"},title),
      UI.el("div",{class:"hint"},desc),
      UI.el("div",{style:"margin-top:10px"},UI.el("button",{class:`btn ${btnKind}`.trim(),onclick:onClick},btnLabel))
    ]);
  }

  window.ExportHubModule={render};
})();