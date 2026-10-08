// ARCOR: progressive GLB loading, a local Three.js renderer, and an image fallback.
import {constrainCamera} from './camera-constraints.mjs';
const MODEL_URL = new URL('../assets/models/exposicao-shopping.glb', import.meta.url).href;
const stage = document.querySelector('#viewer-container');
const host = document.querySelector('#viewer-canvas');
const status = document.querySelector('#viewer-status');
const statusText = document.querySelector('#viewer-status-text');
const progress = document.querySelector('#model-progress');
const poster = document.querySelector('#model-poster');
const fallback = document.querySelector('#viewer-fallback');
let renderer, scene, camera, controls, THREE, resizeObserver;
let loading = null, loaded = false, visible = true, token = 0, currentView = 'all';
let visibilityObserver, renderListeners, fetchController;
let closing = false;
let previousCompact;
let environmentTarget;
function exploring(value=true){document.querySelector('#modelo3d').classList.toggle('is-exploring',value);}
function protectCamera(){
  if(!controls||!camera)return;
  camera.position.fromArray(constrainCamera(controls.target.toArray(),camera.position.toArray(),controls.minDistance,controls.maxDistance));
  camera.lookAt(controls.target);
}
const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
const limitedDevice = () => navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2);

function state(value, message) {
  stage.dataset.state = value;
  stage.setAttribute('aria-busy', value === 'loading' ? 'true' : 'false');
  statusText.textContent = message;
  status.classList.toggle('is-loaded', value === 'ready');
  progress.hidden = value !== 'loading';
  document.querySelectorAll('.model-toolbar button').forEach(b => b.disabled = value !== 'ready');
  document.dispatchEvent(new CustomEvent('arcor:model-status', {detail: value}));
}
function renderLoop() {
  if (!renderer) return;
  renderer.setAnimationLoop(loaded && visible && !document.hidden ? () => {controls.update(); protectCamera();renderer.render(scene, camera);} : null);
}
function disposeTree(root) {
  const resources=new Set();
  root?.traverse(o=>{
    if(o.geometry)resources.add(o.geometry);
    const materials=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    materials.forEach(material=>{resources.add(material);Object.values(material).forEach(value=>{if(value?.isTexture)resources.add(value);});});
  });
  resources.forEach(resource=>resource.dispose());
}
function cleanUp() {
  loaded = false;
  renderListeners?.abort();fetchController?.abort();
  renderer?.setAnimationLoop(null);
  resizeObserver?.disconnect();
  controls?.dispose();
  disposeTree(scene);
  renderer?.dispose();
  environmentTarget?.dispose();environmentTarget=null;
  renderer = null; scene = null; controls=null;camera=null;host.replaceChildren();
}
function showFallback(message) {
  token++; cleanUp();
  poster.classList.remove('loaded'); fallback.hidden = false;
  state('fallback', message);
}
function setView(id) {
  if (!camera || !controls) return;
  currentView = id;
  exploring(id!=='all');
  controls.minDistance=id==='all'?15.5:7.5;
  const aspect = Math.max(.35, stage.clientWidth / stage.clientHeight);
  if (id === 'all') {
    const distance = Math.max(21, 12.8 / (Math.tan(THREE.MathUtils.degToRad(20)) * aspect));
    controls.maxDistance=Math.max(48,distance*1.3);
    controls.target.set(0, 2.2, 0);
    camera.position.set(distance*.20, 2.2+distance*.25, distance*.95);
  } else {
    const x = {sete:-6.8, pacoca:0, poosh:6.8}[id] ?? 0;
    const distance = Math.max(11, 4 / (Math.tan(THREE.MathUtils.degToRad(20)) * aspect));
    controls.maxDistance=Math.max(30,distance*1.4);
    controls.target.set(x, 1.9, 0);
    camera.position.set(x+(id==='poosh' ? -.28 : .28)*distance, 1.9+distance*.28, distance*.92);
  }
  controls.update();protectCamera();
  document.querySelectorAll('[data-model-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modelView === id)));
}
function zoom(factor) {
  if (!loaded) return;
  exploring();
  const offset = camera.position.clone().sub(controls.target);
  offset.setLength(THREE.MathUtils.clamp(offset.length()*factor, controls.minDistance, controls.maxDistance));
  camera.position.copy(controls.target).add(offset); controls.update();protectCamera();
}
export function initViewer() {
  state('idle', 'A experiência está pronta para você.');
  document.querySelectorAll('[data-model-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.modelView)));
  document.querySelector('#model-reset').addEventListener('click', () => setView('all'));
  document.querySelector('#model-zoom-in').addEventListener('click', () => zoom(.85));
  document.querySelector('#model-zoom-out').addEventListener('click', () => zoom(1.18));
  document.querySelector('#model-rotate').addEventListener('click', e => {
    if (!loaded) return;
    controls.autoRotate = !controls.autoRotate;
    e.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
    e.currentTarget.setAttribute('aria-label', controls.autoRotate ? 'Pausar rotação automática' : 'Iniciar rotação automática');
    e.currentTarget.textContent = controls.autoRotate ? 'Pausar' : 'Girar';
  });
  document.querySelector('#retry-model').addEventListener('click', () => loadExperience(true));
  visibilityObserver=new IntersectionObserver(entries => {visible = entries[0].isIntersecting; renderLoop();}, {threshold:.01});visibilityObserver.observe(stage);
  document.addEventListener('visibilitychange', renderLoop);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
    if (e.matches && controls) { controls.autoRotate=false;document.querySelector('#model-rotate').setAttribute('aria-pressed','false');document.querySelector('#model-rotate').textContent='Girar'; }
  });
  addEventListener('pagehide',event=>{if(event.persisted){renderer?.setAnimationLoop(null);return;}closing=true;token++;visibilityObserver.disconnect();cleanUp();});
  addEventListener('pageshow',()=>{closing=false;renderLoop();});
}
export function loadExperience(force = false) {
  if (loaded) return Promise.resolve();
  if (loading) return loading;
  const params = new URLSearchParams(location.search);
  if (!force && (limitedDevice() || params.get('quality') === 'poster')) {
    showFallback('Uma vista leve para explorar o projeto.');return Promise.resolve();
  }
  const run = ++token;
  loading = (async () => {
    fallback.hidden = true;delete stage.dataset.error; state('loading','Carregando experiência ARCOR…');progress.value=0;
    try {
      if(params.get('webgl') === 'off') throw new Error('WebGL indisponível para este teste.');
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2');
      if (!gl) throw new Error('WebGL2 indisponível.');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      const [three, loaderModule, controlModule, environmentModule] = await Promise.all([import('three'), import('../assets/vendor/GLTFLoader.js'), import('../assets/vendor/OrbitControls.js'),import('../assets/vendor/RoomEnvironment.js')]);
      if(run!==token)return;
      THREE = three;
      renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default',preserveDrawingBuffer:false});
      renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1;
      renderer.shadowMap.enabled = innerWidth >= 700; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      const canvas=renderer.domElement; canvas.tabIndex=0; canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Exposição ARCOR em 3D. Use as setas para girar e mais ou menos para aproximar.');canvas.setAttribute('aria-describedby','model-help');host.append(canvas);
      renderListeners=new AbortController();
      canvas.addEventListener('webglcontextlost', e => {e.preventDefault();showFallback('A visualização foi pausada. Continue pelas imagens ou pelo vídeo.');},{signal:renderListeners.signal});
      scene=new THREE.Scene();scene.background=new THREE.Color('#eeece7');
      const environment=new environmentModule.RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);
      environmentTarget=pmrem.fromScene(environment,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.3;environment.dispose();pmrem.dispose();
      camera=new THREE.PerspectiveCamera(40,1,.08,160);
      controls=new controlModule.OrbitControls(camera,canvas);controls.enableDamping=!motion();controls.dampingFactor=.09;controls.minDistance=15.5;controls.maxDistance=65;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.46;controls.autoRotate=false;controls.autoRotateSpeed=.55;controls.zoomSpeed=.7;controls.enablePan=false;
      controls.addEventListener('start',()=>exploring());
      // One-finger touch scrolls the page; two fingers orbit the model.
      controls.touches.ONE=null;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
      canvas.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();
        if(e.key==='Home')return setView('all');if(e.key==='+'||e.key==='=')return zoom(.88);if(e.key==='-')return zoom(1.14);
        const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        if(e.key==='ArrowLeft')spherical.theta-=.12;if(e.key==='ArrowRight')spherical.theta+=.12;
        if(e.key==='ArrowUp')spherical.phi-=.08;if(e.key==='ArrowDown')spherical.phi+=.08;
        spherical.phi=THREE.MathUtils.clamp(spherical.phi,.25,Math.PI*.46);
        exploring();camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();protectCamera();
      },{signal:renderListeners.signal});
      scene.add(new THREE.HemisphereLight(0xe5f5ff,0x85705d,.9));
      const addLight=(color,power,position)=>{const l=new THREE.DirectionalLight(color,power);l.position.set(...position);scene.add(l);return l;};
      const key=addLight(0xfff1d4,3,[-3,14,10]);key.castShadow=true;const shadowSize=innerWidth>=1200?2048:1024;key.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(key.shadow.camera,{left:-15,right:15,top:10,bottom:-10,near:1,far:40});key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=2;
      addLight(0xb8dfff,1.1,[8,7,-6]);addLight(0xffffff,.65,[-12,4,2]);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0xeeece7,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.315;floor.receiveShadow=true;scene.add(floor);
      const resize=()=>{if(!renderer)return;const compact=stage.clientWidth<700;const switched=previousCompact!==compact;if(switched)currentView=compact?'pacoca':'all';previousCompact=compact;camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);setView(currentView);if(switched)exploring(false);};
      resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();
      let timeout;
      fetchController=new AbortController();
      const assetPromise=(async()=>{
        const response=await fetch(MODEL_URL,{signal:fetchController.signal});
        if(!response.ok)throw new Error(`GLB: HTTP ${response.status}`);
        const total=Number(response.headers.get('Content-Length'));const chunks=[];let received=0;
        if(response.body){const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;if(total){progress.value=Math.min(95,received/total*95);statusText.textContent=`Carregando experiência ARCOR… ${Math.round(progress.value)}%`;}}}
        else{const value=new Uint8Array(await response.arrayBuffer());chunks.push(value);received=value.length;}
        const bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
        const asset=await new loaderModule.GLTFLoader().parseAsync(bytes.buffer,new URL('../assets/models/',import.meta.url).href);
        if(run!==token||closing){disposeTree(asset.scene);throw new DOMException('Carregamento cancelado.','AbortError');}
        return asset;
      })();
      let gltf;
      try {gltf=await Promise.race([assetPromise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Tempo de carregamento excedido.')),30000);})]);}finally{clearTimeout(timeout);}
      if(run!==token){disposeTree(gltf.scene);return;}
      gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent&&!/CandyProps|Pacoca_Props|Lights|Neon/.test(o.name);o.receiveShadow=true;}});scene.add(gltf.scene);
      loaded=true;progress.value=100;poster.classList.add('loaded');state('ready','Experiência 3D carregada.');renderLoop();
    } catch(error) {
      if(!closing&&run===token){stage.dataset.error=error.message;showFallback('O 3D não está disponível neste momento.');}
      // Preserve the diagnostic on the DOM and notify observers; failures are not hidden.
      if(!closing)document.dispatchEvent(new CustomEvent('arcor:model-error',{detail:{message:error.message,cause:error}}));
    }
  })().finally(()=>{loading=null;});
  return loading;
}
