import {initViewer,loadExperience} from './viewer3d.js';
import {initNavigation} from './navigation.js';
document.documentElement.classList.add('js');
const params=new URLSearchParams(location.search);
if(params.get('motion')==='reduce')document.documentElement.classList.add('reduce-motion');
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion');
const portal=document.querySelector('#inicio');const content=document.querySelector('#site-content');
let opening=false;
function finishOpening(){portal.hidden=true;content.inert=false;document.body.classList.remove('at-door');opening=false;document.querySelector('#model-title').focus({preventScroll:true});}
function openDoors(skip=false){
  if(opening||portal.hidden)return;opening=true;document.querySelector('#open-doors').disabled=true;
  loadExperience();
  if(skip||reduced())finishOpening();
  else{portal.classList.add('is-opening');setTimeout(finishOpening,2100);}
}
initViewer();initNavigation();
if(location.hash&&location.hash!=='#inicio'){
  portal.hidden=true;content.inert=false;
  if(location.hash==='#modelo3d'||params.has('capture'))loadExperience();
  else new IntersectionObserver((entries,observer)=>{if(entries[0].isIntersecting){loadExperience();observer.disconnect();}},{threshold:.1}).observe(document.querySelector('#modelo3d'));
}else{document.body.classList.add('at-door');content.inert=true;window.scrollTo(0,0);}
document.querySelector('#open-doors').addEventListener('click',()=>openDoors());
document.querySelector('#skip-intro').addEventListener('click',()=>openDoors(true));
document.addEventListener('arcor:skip-intro',()=>openDoors(true));
document.querySelector('#replay-intro').addEventListener('click',()=>{
  window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'','#inicio');portal.hidden=false;portal.classList.remove('is-opening');document.body.classList.add('at-door');content.inert=true;document.querySelector('#open-doors').disabled=false;document.querySelector('#open-doors').focus();
});
if(params.has('capture')){document.documentElement.classList.add('capture-model');portal.hidden=true;content.inert=false;document.body.classList.remove('at-door');loadExperience();}

const revealObserver=new IntersectionObserver((entries,observer)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('active');observer.unobserve(entry.target);}});},{threshold:.08,rootMargin:'0px 0px -20px 0px'});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

// Native lightbox, deduplicated across project sections and the gallery.
const dialog=document.querySelector('#lightbox');const photo=document.querySelector('#lightbox-image');const caption=document.querySelector('#lightbox-caption');
const pictures=[...new Map([...document.querySelectorAll('[data-lightbox]')].map(b=>[b.dataset.lightbox,{src:b.dataset.lightbox,caption:b.dataset.caption,alt:b.querySelector('img').alt}])).values()];
let pictureIndex=0,previousFocus;
function updatePhoto(index){pictureIndex=(index+pictures.length)%pictures.length;const item=pictures[pictureIndex];photo.src=item.src;photo.alt=item.alt;caption.textContent=item.caption;document.querySelector('#lightbox-count').textContent=`${pictureIndex+1} / ${pictures.length}`;}
document.querySelectorAll('[data-lightbox]').forEach(b=>b.addEventListener('click',()=>{previousFocus=b;updatePhoto(pictures.findIndex(p=>p.src===b.dataset.lightbox));dialog.showModal();document.body.classList.add('modal-open');}));
document.querySelector('#lightbox-close').addEventListener('click',()=>dialog.close());
document.querySelector('#lightbox-prev').addEventListener('click',()=>updatePhoto(pictureIndex-1));
document.querySelector('#lightbox-next').addEventListener('click',()=>updatePhoto(pictureIndex+1));
dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();updatePhoto(pictureIndex+1);}if(e.key==='ArrowLeft'){e.preventDefault();updatePhoto(pictureIndex-1);}});
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');previousFocus?.focus({preventScroll:true});});

// A conceptual interaction: nothing here claims to trigger real sensors or aroma.
const senses={luz:'O neon desenha o espaço e transforma o gelo em um cenário vibrante.',movimento:'Na proposta, a presença e os movimentos dos visitantes podem ativar respostas do ambiente.',aroma:'A ideia de aroma acrescenta uma camada sensorial à cenografia e à identidade do chiclete.',projecao:'Projeções foram imaginadas para ampliar o universo congelado e a explosão do recheio.',interacao:'Luzes, aromas e projeções podem se conectar para colocar o visitante no centro da experiência.'};
document.querySelectorAll('[data-sense]').forEach(button=>{if(button.tagName!=='BUTTON')return;button.addEventListener('click',()=>{document.querySelectorAll('button[data-sense]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#sense-description').textContent=senses[button.dataset.sense];document.querySelector('.poosh-visual').dataset.sense=button.dataset.sense;});});

// Video transfers only near the viewport, and pauses offscreen or in a hidden tab.
const video=document.querySelector('#prototype-video');let videoVisible=false,videoStarted=false,manualPause=false,automaticPause=false;
if(reduced())video.autoplay=false;
function ensureVideo(){if(videoStarted)return;const source=video.querySelector('source');source.src=source.dataset.src;video.load();videoStarted=true;}
function manageVideo(){
  if(videoVisible&&!document.hidden){ensureVideo();if(!reduced()&&!manualPause)video.play().catch(()=>{});}
  else if(!video.paused){automaticPause=true;video.pause();}
}
video.addEventListener('pause',()=>{if(automaticPause){automaticPause=false;return;}if(videoVisible)manualPause=true;});
video.addEventListener('play',()=>{manualPause=false;});
video.addEventListener('click',()=>ensureVideo(),{once:true});
new IntersectionObserver((entries,observer)=>{if(entries[0].isIntersecting){ensureVideo();observer.disconnect();}},{rootMargin:'250px',threshold:0}).observe(video);
new IntersectionObserver(entries=>{videoVisible=entries[0].isIntersecting;manageVideo();},{threshold:.1}).observe(video);
document.addEventListener('visibilitychange',manageVideo);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(reduced()){video.autoplay=false;if(!video.paused){automaticPause=true;video.pause();}}});
