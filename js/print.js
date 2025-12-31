(function(){
  function printHtml(html){
    const w=window.open("","_blank"); if(!w){UI.toast("Ventana de impresión bloqueada."); return;}
    w.document.open();
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Imprimir</title><link rel="stylesheet" href="assets/css/print.css" />
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;}
        .doc{max-width:820px;margin:0 auto;}
        .h1{font-size:18px;font-weight:900;margin:0 0 6px}
        .muted{color:#555;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ddd;padding:8px;font-size:12px}
        th{background:#f3f4f6;text-align:left}
        .right{text-align:right}
      </style>
    </head><body><div class="doc">${html}</div><script>setTimeout(()=>window.print(),250);</script></body></html>`);
    w.document.close();
  }
  window.Printer={printHtml};
})();