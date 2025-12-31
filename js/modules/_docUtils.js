(function(){
  function calcDocTotals(lines,vatPercent){
    const base=U.sum(lines,l=>(Number(l.qty)||0)*(Number(l.price)||0)-(Number(l.discount)||0));
    const vatP=Number(vatPercent||0); const vatAmount=base*(vatP/100); const total=base+vatAmount;
    return {base,vatAmount,total};
  }
  function normalizeLines(lines){
    return (lines||[]).map(l=>({id:l.id||U.uid("ln"),concept:l.concept||"",qty:Number(l.qty||1),price:Number(l.price||0),discount:Number(l.discount||0)}));
  }
  window.DocUtils={calcDocTotals,normalizeLines};
})();