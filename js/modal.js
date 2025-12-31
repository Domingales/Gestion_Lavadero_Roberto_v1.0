(function(){
  const root=()=>document.getElementById("modalRoot");
  function close(){const r=root(); r.classList.add("hidden"); r.setAttribute("aria-hidden","true"); UI.clear(r); if(open._onKey) window.removeEventListener("keydown",open._onKey);}
  function open({title,body,footerButtons=[]}){
    const r=root(); r.classList.remove("hidden"); r.setAttribute("aria-hidden","false"); UI.clear(r);
    const modal=UI.el("div",{class:"modal",role:"dialog","aria-modal":"true"});
    const header=UI.el("div",{class:"modalHeader"},[
      UI.el("div",{},[
        UI.el("div",{class:"modalTitle"},title||""),
        UI.el("div",{class:"tiny muted"},"Pulsa ESC para cerrar")
      ]),
      UI.el("button",{class:"xbtn",type:"button",onclick:close},"✕")
    ]);
    const bodyWrap=UI.el("div",{class:"modalBody"}); if(typeof body==="string") bodyWrap.innerHTML=body; else bodyWrap.appendChild(body);
    const footer=UI.el("div",{class:"modalFooter"});
    footerButtons.forEach(b=>{
      const btn=UI.el("button",{class:`btn ${b.kind||""}`.trim(),type:"button",onclick:async()=>{
        try{const res=b.onClick?await b.onClick():true; if(res!==false) close();}catch(e){console.error(e); UI.toast(e?.message||"Error");}
      }},b.label);
      if(b.disabled) btn.disabled=true;
      footer.appendChild(btn);
    });
    modal.appendChild(header); modal.appendChild(bodyWrap); modal.appendChild(footer); r.appendChild(modal);
    function onKey(ev){if(ev.key==="Escape") close();}
    window.addEventListener("keydown",onKey); open._onKey=onKey;
  }
  async function confirm({title="Confirmar",message="¿Seguro?",confirmText="Sí",cancelText="Cancelar",danger=false}){
    return new Promise(resolve=>{
      const body=UI.el("div",{},UI.el("div",{class:"card"},[
        UI.el("div",{style:"font-weight:800;margin-bottom:6px"},message),
        UI.el("div",{class:"tiny muted"},"Esta acción no se puede deshacer.")
      ]));
      open({title,body,footerButtons:[
        {label:cancelText,kind:"btnGhost",onClick:()=>resolve(false)},
        {label:confirmText,kind:danger?"btnDanger":"",onClick:()=>resolve(true)}
      ]});
    });
  }
  window.Modal={open,close,confirm};
})();