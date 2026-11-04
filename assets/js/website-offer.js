(function(){
  'use strict';
  // Offer ends November 19, 2026 at 23:59 Dubai time (UTC+4).
  const ends=Date.parse('2026-11-19T23:59:00+04:00');
  const fmt=n=>String(n).padStart(2,'0');
  function update(){
    const left=Math.max(0,Math.floor((ends-Date.now())/1000));
    const d=Math.floor(left/86400),h=Math.floor(left%86400/3600),m=Math.floor(left%3600/60),s=left%60;
    for(const [name,val] of [['days',d],['hours',h],['minutes',m],['seconds',s]]){
      document.querySelectorAll('[data-offer-'+name+']').forEach(el=>el.textContent=fmt(val));
    }
    const label=left===0?'Offer ended':d>0?d+'d '+fmt(h)+'h '+fmt(m)+'m left':fmt(h)+'h '+fmt(m)+'m left';
    document.querySelectorAll('[data-offer-banner-countdown]').forEach(el=>el.textContent=label);
    if(left===0){const a=document.getElementById('offer-apply-cta');if(a){a.textContent='Offer closed';a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.style.opacity='.6';a.style.pointerEvents='none';} const f=document.querySelector('.offer-form');if(f){f.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);}}
  }
  update();setInterval(update,1000);
})();