const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09090b);
scene.fog = new THREE.Fog(0x09090b, 10, 50);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// إضاءة
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// الأرضية
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// محرك الفيزياء
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.SAPBroadphase(world);

// أرضية الفيزياء
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// الشبكة العصبية
class NeuralNet {
  constructor() { this.w = Array.from({length: 4}, () => Math.random() * 2 - 1); }
  predict(inputs) {
    let out = [0, 0];
    for (let i = 0; i < inputs.length; i++) {
      out[0] += inputs[i] * this.w[i];
      out[1] += inputs[i] * this.w[(i+2)%4];
    }
    return out.map(Math.tanh);
  }
  mutate() { this.w = this.w.map(v => Math.random() < 0.1 ? v + (Math.random()*2-1)*0.5 : v); }
}

// المخلوق
class Creature {
  constructor(brain) {
    this.brain = brain || new NeuralNet();
    this.body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)) });
    this.body.position.set(0, 2, 0);
    world.addBody(this.body);
    
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.5 })
    );
    scene.add(this.mesh);
    
    this.startX = 0;
    this.dead = false;
  }
  
  update() {
    if (this.dead) return;
    // مدخلات الشبكة: السرعة والموقع
    let inputs = [this.body.velocity.y, this.body.velocity.z, this.body.position.y, 1];
    let out = this.brain.predict(inputs);
    
    // القفز أو التحرك للأمام
    if (this.body.position.y < 0.6) {
      this.body.applyImpulse(new CANNON.Vec3(0, out[0] * 5, out[1] * 3), new CANNON.Vec3(0, -0.5, 0));
    }
    
    // تحديث الرسم
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
    
    // حساب اللياقة (المسافة المقطوعة)
    this.fitness = this.body.position.z;
    
    // الموت إذا سقط أو مر وقت طويل
    if (this.body.position.y < -5) this.dead = true;
  }
}

let creatures = [];
let bestBrain = null;
let bestFitness = 0;
let gen = 1;
let speed = 1;

function init() {
  creatures.forEach(c => { world.removeBody(c.body); scene.remove(c.mesh); });
  creatures = [];
  for (let i = 0; i < 20; i++) creatures.push(new Creature(bestBrain));
}

function evolve() {
  creatures.sort((a, b) => b.fitness - a.fitness);
  if (creatures[0].fitness > bestFitness) {
    bestFitness = creatures[0].fitness;
    bestBrain = creatures[0].brain;
  }
  
  let newBrains = [];
  for (let i = 0; i < 20; i++) {
    let b = new NeuralNet();
    b.w = [...bestBrain.w];
    b.mutate();
    newBrains.push(b);
  }
  
  creatures.forEach(c => { world.removeBody(c.body); scene.remove(c.mesh); });
  creatures = [];
  newBrains.forEach(b => creatures.push(new Creature(b)));
  
  gen++;
  document.getElementById('genText').innerText = gen;
  document.getElementById('fitText').innerText = bestFitness.toFixed(2);
}

document.getElementById('btnSpeed').onclick = () => {
  speed = speed === 1 ? 5 : (speed === 5 ? 10 : 1);
  document.getElementById('btnSpeed').innerText = '⏩ السرعة: x' + speed;
};
document.getElementById('btnReset').onclick = () => { bestBrain = null; bestFitness = 0; gen = 1; init(); };

function animate() {
  requestAnimationFrame(animate);
  
  for (let s = 0; s < speed; s++) {
    world.step(1/60);
    let alive = 0;
    creatures.forEach(c => { c.update(); if (!c.dead) alive++; });
    if (alive === 0) evolve();
  }
  
  // تتبع أفضل مخلوق
  if (creatures.length > 0) {
    let leader = creatures.reduce((prev, curr) => (prev.fitness > curr.fitness) ? prev : curr);
    camera.position.z = leader.body.position.z + 15;
    camera.lookAt(0, 2, leader.body.position.z);
  }
  
  renderer.render(scene, camera);
}

init();
animate();
