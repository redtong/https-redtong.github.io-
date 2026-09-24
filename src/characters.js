import * as THREE from 'three';

// 几何和材质跨居民共享；外部清理场景时不要逐居民销毁这些共享资源。
const geometries = new Map();
const materials = new Map();
const TAU = Math.PI * 2;
const HEAD = { x: 0.45, y: 0.46, z: 0.405 };
const FORWARD = new THREE.Vector3(0, 0, 1);

const STYLES = {
  violet: { name: '紫堇', role: '花店少女', skin: '#f4c7b1', hair: '#7662a7', light: '#a294ca', shirt: '#fff4e5', accent: '#b49bd4', pants: '#e9d9ef', shoe: '#78608f', dress: true, long: true },
  brown: { name: '小栗', role: '小镇少年', skin: '#edbd98', hair: '#775039', light: '#a4754c', shirt: '#74afbb', accent: '#fff0d5', pants: '#687e96', shoe: '#c57c4f' },
  pink: { name: '桃桃', role: '抱兔少女', skin: '#f7cebd', hair: '#a17665', light: '#c9987e', shirt: '#edb0be', accent: '#fff3dd', pants: '#f7dce1', shoe: '#b57589', dress: true, long: true, toy: true },
  dino: { name: '阿蓝', role: '恐龙少年', skin: '#edc4a5', hair: '#65514a', light: '#91735c', shirt: '#68b8b3', accent: '#daedb7', pants: '#5da5a4', shoe: '#f4dfad' },
  police: { name: '小安', role: '小镇警察', skin: '#efc09f', hair: '#454450', light: '#686470', shirt: '#4b6487', accent: '#edc879', pants: '#3e536e', shoe: '#364453' },
  worker: { name: '阿筑', role: '小镇工人', skin: '#dfac82', hair: '#725644', light: '#997557', shirt: '#e9ab62', accent: '#fff0c7', pants: '#74929d', shoe: '#977451' },
  bunny: { name: '雪团', role: '兔耳少女', skin: '#f6d1c0', hair: '#e5e4ef', light: '#fff8f4', shirt: '#c6c4e0', accent: '#fff4e9', pants: '#e6ddee', shoe: '#9b92b0', dress: true, long: true, toy: true },
  black: { name: '小墨', role: '音乐少年', skin: '#ebc1a5', hair: '#363a48', light: '#565c70', shirt: '#454957', accent: '#e3dcca', pants: '#666b78', shoe: '#f3e7d4' },
  tan: { name: '阿阳', role: '海边少年', skin: '#ba855f', hair: '#533f36', light: '#7b5c44', shirt: '#d9856d', accent: '#fff0d2', pants: '#e1c397', shoe: '#668d9c' },
  mint: { name: '薄荷', role: '甜品店店员', skin: '#efd0b8', hair: '#7ea99b', light: '#b4d3b9', shirt: '#b7d2b6', accent: '#f1c285', pants: '#efe7ce', shoe: '#72998e' },
};

function geometry(key, build) {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key);
}

function material(color, roughness = 0.78, metalness = 0) {
  const key = `${color}/${roughness}/${metalness}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }
  return materials.get(key);
}

function group(parent, name, x = 0, y = 0, z = 0) {
  const result = new THREE.Group();
  result.name = name;
  result.position.set(x, y, z);
  parent.add(result);
  return result;
}

function mesh(parent, name, geo, mat, position, scale, shadow = true) {
  const result = new THREE.Mesh(geo, mat);
  result.name = name;
  if (position) result.position.set(...position);
  if (scale) result.scale.set(...scale);
  result.castShadow = shadow;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

function ball(parent, name, mat, position, scale, shadow = true) {
  return mesh(parent, name, geometry('sphere', () => new THREE.SphereGeometry(1, 24, 16)), mat, position, scale, shadow);
}

function capsule(parent, name, mat, position, size, shadow = true) {
  return mesh(parent, name, geometry('capsule', () => new THREE.CapsuleGeometry(1, 1, 6, 12)), mat, position, [size[0] / 2, size[1] / 3, size[2] / 2], shadow);
}

function tube(parent, name, mat, points, radius = 0.012, shadow = true) {
  const key = `tube:${radius}:${JSON.stringify(points)}`;
  const geo = geometry(key, () => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))),
    Math.max(12, points.length * 4), radius, 6, false,
  ));
  return mesh(parent, name, geo, mat, null, null, shadow);
}

// 额前开口高、后脑覆盖低，避免完整发球吞掉眼睛和眉毛。
function crownGeometry(front, back, radii) {
  return geometry(`crown:${front}:${back}:${radii}`, () => {
    const vertices = [], indices = [], uvs = [];
    const rows = 16, columns = 40;
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const phi = column / columns * TAU;
        const theta = row / rows * (front + (back - front) * (1 - Math.cos(phi)) / 2);
        vertices.push(radii[0] * Math.sin(theta) * Math.sin(phi), radii[1] * Math.cos(theta), radii[2] * Math.sin(theta) * Math.cos(phi));
        uvs.push(column / columns, row / rows);
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

function lock(parent, name, mat, points, radius) {
  const key = `lock:${radius}:${JSON.stringify(points)}`;
  const geo = geometry(key, () => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const segments = 14, sides = 8;
    const frames = curve.computeFrenetFrames(segments, false);
    const vertices = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPointAt(t);
      const width = radius * (0.045 + 0.955 * Math.pow(Math.sin(Math.PI * t), 0.65)) * (1 - t * 0.35);
      for (let j = 0; j <= sides; j++) {
        const angle = j / sides * TAU;
        const offset = frames.normals[i].clone().multiplyScalar(Math.cos(angle) * width)
          .addScaledVector(frames.binormals[i], Math.sin(angle) * width * 0.68);
        vertices.push(p.x + offset.x, p.y + offset.y, p.z + offset.z);
      }
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j, b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  });
  return mesh(parent, name, geo, mat);
}

function faceZ(x, y) {
  return HEAD.z * Math.sqrt(Math.max(0.01, 1 - (x / HEAD.x) ** 2 - (y / HEAD.y) ** 2));
}

function faceAnchor(head, name, x, y, lift = 0.012) {
  const z = faceZ(x, y);
  const anchor = group(head, name, x, y, z + lift);
  const normal = new THREE.Vector3(x / HEAD.x ** 2, y / HEAD.y ** 2, z / HEAD.z ** 2).normalize();
  anchor.quaternion.setFromUnitVectors(FORWARD, normal);
  return anchor;
}

function facialCurve(head, name, mat, xy, radius, lift = 0.014) {
  return tube(head, name, mat, xy.map(([x, y]) => [x, y, faceZ(x, y) + lift]), radius, false);
}

function createFace(head, style, variant) {
  const eyes = [];
  const white = material('#fff9ef', 0.5);
  const ink = material('#3b3037', 0.63);
  const iris = material(variant === 'violet' || variant === 'bunny' ? '#776582' : variant === 'mint' ? '#4b796c' : '#775442', 0.5);
  for (const side of [-1, 1]) {
    const eye = faceAnchor(head, `${side < 0 ? 'left' : 'right'}-eye`, side * 0.143, 0.016);
    ball(eye, 'eye-white', white, [0, 0, 0], [0.077, 0.092, 0.022], false);
    ball(eye, 'iris', iris, [side * -0.003, -0.002, 0.024], [0.050, 0.064, 0.014], false);
    ball(eye, 'pupil', ink, [side * -0.003, -0.001, 0.035], [0.026, 0.044, 0.009], false);
    ball(eye, 'eye-catchlight', white, [-0.015, 0.024, 0.045], [0.014, 0.017, 0.006], false);
    ball(eye, 'eye-small-catchlight', white, [0.017, -0.025, 0.044], [0.006, 0.008, 0.004], false);
    eyes.push(eye);
    const blush = faceAnchor(head, 'blush', side * 0.258, -0.095, 0.008);
    ball(blush, 'soft-cheek', material(style.skin === '#ba855f' ? '#c67d68' : '#ecaa9f'), [0, 0, 0], [0.066, 0.028, 0.009], false);
    const x = side * 0.143;
    facialCurve(head, 'eyebrow', material(style.hair), [[x - 0.065, 0.144], [x, 0.16], [x + 0.056, 0.147]], 0.011);
    if (style.dress) {
      facialCurve(head, 'upper-eyelash', ink, [[x - 0.061, 0.073], [x, 0.109], [x + 0.061, 0.073]], 0.008, 0.024);
    }
  }
  const nose = faceAnchor(head, 'nose', 0, -0.072, 0.007);
  ball(nose, 'button-nose', material(style.skin), [0, 0, 0.01], [0.029, 0.032, 0.024], false);
  facialCurve(head, 'smile', material('#9a6259'), [[-0.073, -0.155], [-0.04, -0.18], [0, -0.188], [0.044, -0.178], [0.074, -0.152]], 0.011);
  return eyes;
}

function createHair(head, style, variant) {
  const hair = material(style.hair), shine = material(style.light);
  const hairRoot = group(head, 'hair');
  mesh(hairRoot, 'sculpted-hair-cap', crownGeometry(1.07, 2.12, [0.467, 0.477, 0.428]), hair);
  if (style.long || variant === 'mint') {
    ball(hairRoot, 'back-hair', hair, [0, -0.13, -0.188], [0.43, style.long ? 0.405 : 0.30, 0.255]);
  }
  const count = variant === 'dino' ? 5 : 7;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.095;
    const part = variant === 'black' ? 0.066 : variant === 'brown' ? -0.042 : 0.016;
    const endY = 0.205 + 0.032 * Math.cos(i * 1.9);
    const endX = x + part;
    lock(hairRoot, `fringe-${i}`, i % 3 === 0 ? shine : hair, [
      [x - part * 0.5, 0.413 - Math.abs(x) * 0.16, 0.16],
      [x - part * 0.2, 0.36, 0.30],
      [endX, endY + 0.06, faceZ(endX, endY + 0.06) + 0.032],
      [endX + part * 0.2, endY, faceZ(endX + part * 0.2, endY) + 0.023],
    ], 0.079);
  }
  for (const side of [-1, 1]) {
    const length = style.long ? 0.43 : 0.16;
    for (let i = 0; i < (style.long ? 3 : 2); i++) {
      const x = side * (0.355 + i * 0.032);
      lock(hairRoot, 'side-lock', i === 1 ? shine : hair, [
        [side * 0.35, 0.25, 0.11 - i * 0.08],
        [x + side * 0.035, 0.06, 0.14 - i * 0.09],
        [x + side * 0.02, -length * 0.6, 0.14 - i * 0.095],
        [x - side * 0.025, -length, 0.12 - i * 0.09],
      ], style.long ? 0.086 : 0.063);
    }
    if (variant === 'violet') {
      ball(hairRoot, 'ponytail-tie', material('#e9c88f'), [side * 0.421, -0.03, -0.13], [0.068, 0.044, 0.074]);
      for (let i = 0; i < 2; i++) {
        lock(hairRoot, 'curled-ponytail', i ? shine : hair, [[side * 0.41, 0.015, -0.14], [side * (0.50 + i * 0.05), -0.18, -0.16], [side * (0.49 + i * 0.04), -0.35, -0.12], [side * 0.40, -0.43, -0.09]], 0.11);
      }
    }
  }
  if (variant === 'brown' || variant === 'black') {
    for (let i = 0; i < 3; i++) {
      lock(hairRoot, 'crown-tuft', i === 1 ? shine : hair, [[-0.13 + i * 0.105, 0.40, -0.04], [-0.18 + i * 0.105, 0.49, 0.035], [-0.24 + i * 0.115, 0.47, 0.10]], 0.063);
    }
  }
  if (variant === 'tan') {
    for (let i = 0; i < 9; i++) {
      const a = i / 8 * Math.PI;
      ball(hairRoot, 'soft-curl', i % 3 ? hair : shine, [Math.cos(a) * 0.365, 0.19 + Math.sin(a) * 0.235, 0.095], [0.095, 0.10, 0.11]);
    }
  }
  if (variant === 'mint') {
    const clip = capsule(hairRoot, 'cream-hair-clip', material('#f7e4b5'), [0.305, 0.233, 0.30], [0.125, 0.035, 0.035]);
    clip.rotation.z = -0.25;
  }
}

function bow(parent, mat, position, size = 1) {
  const root = group(parent, 'bow', ...position);
  root.scale.setScalar(size);
  for (const side of [-1, 1]) {
    const wing = ball(root, 'bow-wing', mat, [side * 0.054, 0, 0], [0.055, 0.039, 0.025]);
    wing.rotation.z = side * 0.26;
  }
  ball(root, 'bow-knot', mat, [0, 0, 0.015], [0.025, 0.027, 0.025]);
  return root;
}

function star(parent, mat, position, radius) {
  const geo = geometry('star', () => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.46 : 1;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, steps: 1 });
  });
  return mesh(parent, 'star-badge', geo, mat, position, [radius, radius, radius], false);
}

function rabbit(parent, style) {
  const toy = group(parent, 'rabbit-plush', 0, -0.015, 0.36);
  const cream = material('#fff0de'), pink = material('#e6a5b1'), dark = material('#66545c');
  ball(toy, 'plush-body', cream, [0, -0.04, 0], [0.14, 0.167, 0.105]);
  ball(toy, 'plush-head', cream, [0, 0.135, 0.027], [0.151, 0.136, 0.117]);
  for (const side of [-1, 1]) {
    const ear = group(toy, 'plush-ear', side * 0.075, 0.294, 0.019);
    ear.rotation.z = side * -0.17;
    capsule(ear, 'plush-outer-ear', cream, [0, 0, 0], [0.065, 0.197, 0.067]);
    capsule(ear, 'plush-inner-ear', pink, [0, 0.009, 0.030], [0.03, 0.135, 0.017], false);
    ball(toy, 'plush-eye', dark, [side * 0.050, 0.144, 0.136], [0.011, 0.015, 0.007], false);
    ball(toy, 'plush-paw', cream, [side * 0.127, -0.015, 0.031], [0.057, 0.066, 0.066]);
    ball(toy, 'plush-foot', cream, [side * 0.071, -0.17, 0.038], [0.058, 0.045, 0.065]);
  }
  ball(toy, 'plush-nose', pink, [0, 0.111, 0.143], [0.015, 0.011, 0.008], false);
  tube(toy, 'plush-mouth', dark, [[-0.024, 0.09, 0.137], [0, 0.081, 0.144], [0.024, 0.09, 0.137]], 0.0035, false);
  bow(toy, material(style.accent), [0, 0.018, 0.105], 0.55);
  return toy;
}

function createHat(head, torso, style, variant) {
  const accent = material(style.accent), gold = material('#e6bf6c', 0.48, 0.2);
  if (variant === 'pink') {
    const hat = group(head, 'pink-bucket-hat');
    const rose = material('#d894a8');
    capsule(hat, 'hat-crown', rose, [0, 0.415, -0.015], [0.71, 0.28, 0.61]);
    ball(hat, 'soft-wide-brim', material('#e7aabb'), [0, 0.319, 0.027], [0.455, 0.041, 0.391]);
    capsule(hat, 'hat-ribbon', accent, [0, 0.387, -0.004], [0.704, 0.064, 0.615]);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      ball(hat, 'hat-flower-petal', material('#fff0df'), [0.263 + Math.cos(a) * 0.035, 0.407 + Math.sin(a) * 0.035, 0.242], [0.028, 0.03, 0.016], false);
    }
    ball(hat, 'hat-flower-center', gold, [0.263, 0.407, 0.259], [0.021, 0.021, 0.012], false);
  }
  if (variant === 'police') {
    const navy = material('#3b506e');
    capsule(head, 'police-cap-crown', navy, [0, 0.413, -0.022], [0.745, 0.25, 0.635]);
    capsule(head, 'police-cap-band', material('#2e3c54'), [0, 0.335, 0.009], [0.756, 0.075, 0.642]);
    ball(head, 'police-cap-visor', navy, [0, 0.295, 0.273], [0.334, 0.032, 0.226]);
    tube(head, 'cap-gold-piping', gold, [[-0.27, 0.346, 0.24], [0, 0.349, 0.338], [0.27, 0.346, 0.24]], 0.011, false);
    ball(head, 'cap-badge', gold, [0, 0.429, 0.291], [0.066, 0.073, 0.019], false);
    star(head, material('#fff0ba', 0.55, 0.1), [0, 0.431, 0.313], 0.043);
  }
  if (variant === 'worker') {
    const yellow = material('#efc65e');
    mesh(head, 'helmet-dome', geometry('helmet-dome', () => new THREE.SphereGeometry(1, 28, 14, 0, TAU, 0, Math.PI / 2)), yellow, [0, 0.307, -0.015], [0.401, 0.235, 0.356]);
    ball(head, 'helmet-brim', yellow, [0, 0.313, 0.012], [0.449, 0.03, 0.397]);
    tube(head, 'helmet-center-rib', material('#f6d784'), [[0, 0.321, 0.349], [0, 0.479, 0.235], [0, 0.548, -0.015], [0, 0.479, -0.267], [0, 0.321, -0.37]], 0.021);
    capsule(head, 'helmet-front-label', material('#fff4cf'), [0, 0.399, 0.319], [0.104, 0.056, 0.022], false);
    for (const side of [-1, 1]) {
      tube(head, 'helmet-side-rib', yellow, [[side * 0.17, 0.364, 0.305], [side * 0.17, 0.511, 0], [side * 0.17, 0.364, -0.335]], 0.015);
    }
  }
  if (variant === 'bunny') {
    tube(head, 'rabbit-ear-headband', accent, [[-0.37, 0.28, -0.015], [-0.25, 0.421, -0.025], [0, 0.48, -0.025], [0.25, 0.421, -0.025], [0.37, 0.28, -0.015]], 0.023);
    for (const side of [-1, 1]) {
      const ear = group(head, 'rabbit-ear', side * 0.185, 0.562, -0.027);
      ear.rotation.z = side * -0.17;
      capsule(ear, 'white-rabbit-ear', material('#fff3e9'), [0, 0, 0], [0.128, 0.344, 0.103]);
      capsule(ear, 'pink-rabbit-ear-center', material('#e8b6c3'), [0, 0.015, 0.046], [0.061, 0.245, 0.022], false);
    }
    bow(head, material('#a893c0'), [-0.30, 0.365, 0.194], 0.7);
  }
  if (variant === 'dino') {
    const teal = material('#63afad'), trim = material('#b1d7c2');
    mesh(head, 'dino-hood', crownGeometry(0.99, 2.38, [0.502, 0.51, 0.455]), teal);
    for (const side of [-1, 1]) {
      capsule(head, 'hood-side-panel', teal, [side * 0.443, -0.115, -0.025], [0.143, 0.545, 0.255]);
    }
    tube(head, 'hood-face-trim', trim, [[-0.393, -0.309, 0.15], [-0.458, -0.04, 0.16], [-0.385, 0.28, 0.23], [0, 0.48, 0.22], [0.385, 0.28, 0.23], [0.458, -0.04, 0.16], [0.393, -0.309, 0.15]], 0.026);
    ball(head, 'dino-rounded-snout', teal, [0, 0.442, 0.31], [0.251, 0.11, 0.182]);
    for (const side of [-1, 1]) {
      ball(head, 'hood-cartoon-eye', material('#fbefcf'), [side * 0.188, 0.477, 0.25], [0.068, 0.073, 0.06]);
      ball(head, 'hood-eye-pupil', material('#375954'), [side * 0.188, 0.479, 0.307], [0.023, 0.032, 0.011], false);
      ball(head, 'hood-nostril', material('#438d89'), [side * 0.101, 0.455, 0.475], [0.015, 0.009, 0.008], false);
    }
    const spikeGeo = geometry('dino-spike', () => new THREE.ConeGeometry(1, 1, 4, 1));
    for (let i = 0; i < 4; i++) {
      const a = 0.20 + i * 0.47;
      const spike = mesh(head, 'hood-back-spike', spikeGeo, accent, [0, Math.cos(a) * 0.55, -Math.sin(a) * 0.47], [0.092, 0.14, 0.075]);
      spike.rotation.x = -a;
    }
    const tail = group(torso, 'dino-tail', 0, -0.195, -0.10);
    lock(tail, 'soft-dino-tail', teal, [[0, 0, -0.02], [0, -0.17, -0.25], [0.04, -0.21, -0.47], [0.08, -0.11, -0.63]], 0.18);
    for (let i = 0; i < 3; i++) {
      const spike = mesh(tail, 'tail-spike', spikeGeo, accent, [i * 0.023, -0.06 - i * 0.025, -0.21 - i * 0.13], [0.065 - i * 0.01, 0.095, 0.062]);
      spike.rotation.x = -0.25;
    }
    return tail;
  }
  return null;
}

function createArm(torso, side, style, variant) {
  const skin = material(style.skin), shirt = material(style.shirt);
  const shoulder = group(torso, side < 0 ? 'left-shoulder' : 'right-shoulder', side * 0.278, 0.19, 0);
  capsule(shoulder, 'upper-arm', skin, [0, -0.113, 0], [0.133, 0.261, 0.137]);
  const longSleeve = ['dino', 'police', 'black', 'bunny', 'mint'].includes(variant);
  capsule(shoulder, 'rounded-sleeve', shirt, [0, -0.058, 0], [0.169, longSleeve ? 0.233 : 0.171, 0.175]);
  const elbow = group(shoulder, 'elbow', 0, -0.225, 0);
  capsule(elbow, 'forearm', longSleeve ? shirt : skin, [0, -0.086, 0], [0.122, 0.212, 0.127]);
  if (longSleeve) capsule(elbow, 'sleeve-cuff', material(style.accent), [0, -0.161, 0], [0.127, 0.039, 0.132]);
  const hand = group(elbow, 'wrist', 0, -0.212, 0.005);
  ball(hand, 'mitten-hand', skin, [0, 0, 0], [0.073, 0.077, 0.067]);
  ball(hand, 'thumb', skin, [-side * 0.055, 0.014, 0.033], [0.028, 0.038, 0.031]);
  shoulder.rotation.z = side * 0.1;
  return { shoulder, elbow, hand, side };
}

function createLeg(rig, side, style) {
  const pants = material(style.pants), skin = material(style.skin), cream = material('#fff2df');
  const hip = group(rig, side < 0 ? 'left-hip' : 'right-hip', side * 0.125, 0.67, 0);
  capsule(hip, 'upper-leg', style.dress ? skin : pants, [0, -0.113, 0], [0.172, 0.275, 0.18]);
  const knee = group(hip, 'knee', 0, -0.255, 0);
  capsule(knee, 'lower-leg', style.dress ? cream : pants, [0, -0.102, 0], [0.138, 0.255, 0.145]);
  if (style.dress) capsule(knee, 'sock-cuff', material(style.accent), [0, -0.016, 0], [0.15, 0.046, 0.155]);
  const foot = group(knee, 'ankle', 0, -0.279, 0.029);
  ball(foot, 'round-shoe', material(style.shoe), [0, -0.012, 0.035], [0.108, 0.081, 0.157]);
  capsule(foot, 'cream-shoe-sole', cream, [0, -0.089, 0.035], [0.22, 0.054, 0.32]);
  ball(foot, 'shoe-vamp', style.dress ? material(style.accent) : cream, [0, 0.047, 0.06], [0.073, 0.022, 0.071], false);
  if (!style.dress) {
    tube(foot, 'shoe-lace', material(style.shoe), [[-0.048, 0.064, 0.07], [0, 0.071, 0.076], [0.048, 0.064, 0.07]], 0.007, false);
  }
  return { hip, knee, foot, side };
}

function createClothes(torso, style, variant) {
  const shirt = material(style.shirt), accent = material(style.accent), gold = material('#e6bd75', 0.52, 0.12);
  capsule(torso, 'soft-torso', shirt, [0, -0.008, 0], [0.51, 0.555, 0.35]);
  ball(torso, 'waist', material(style.pants), [0, -0.226, 0], [0.245, 0.112, 0.169]);
  if (style.dress) {
    const geo = geometry('bell-skirt', () => new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(0.245, 0), new THREE.Vector2(0.301, 0.025),
      new THREE.Vector2(0.313, 0.057), new THREE.Vector2(0.293, 0.115), new THREE.Vector2(0.235, 0.238), new THREE.Vector2(0.218, 0.264),
    ], 32));
    mesh(torso, 'rounded-bell-skirt', geo, shirt, [0, -0.319, 0], [1, 1, 0.7]);
    const hem = mesh(torso, 'dress-hem', geometry('hem', () => new THREE.TorusGeometry(1, 0.047, 6, 36)), accent, [0, -0.278, 0], [0.299, 0.212, 0.23]);
    hem.rotation.x = Math.PI / 2;
    bow(torso, accent, [0, 0.143, 0.174], 0.9);
  }
  for (const side of [-1, 1]) {
    const collar = capsule(torso, 'folded-collar', variant === 'police' ? material('#7588a5') : material('#fff2df'), [side * 0.068, 0.196, 0.134], [0.095, 0.143, 0.037]);
    collar.rotation.z = side * -0.48;
  }
  if (variant === 'black' || variant === 'dino') {
    for (const side of [-1, 1]) {
      tube(torso, 'hood-drawstring', accent, [[side * 0.066, 0.172, 0.177], [side * 0.073, 0.063, 0.184], [side * 0.089, 0.014, 0.181]], 0.009, false);
      ball(torso, 'drawstring-tip', accent, [side * 0.089, 0.014, 0.181], [0.014, 0.024, 0.011], false);
    }
    capsule(torso, 'kangaroo-pocket', variant === 'dino' ? accent : material('#5e626e'), [0, -0.122, 0.16], [0.272, 0.141, 0.061]);
    if (variant === 'black') star(torso, accent, [0.142, 0.091, 0.163], 0.037);
  } else {
    for (let i = 0; i < 3; i++) {
      ball(torso, 'shirt-button', variant === 'police' ? gold : accent, [0, 0.06 - i * 0.075, 0.18], [0.015, 0.015, 0.011], false);
    }
  }
  if (variant === 'police') {
    capsule(torso, 'utility-belt', material('#354355'), [0, -0.177, 0], [0.512, 0.056, 0.354]);
    capsule(torso, 'belt-buckle', gold, [0, -0.175, 0.179], [0.070, 0.047, 0.018], false);
    capsule(torso, 'uniform-tie', material('#303e59'), [0, 0.088, 0.192], [0.035, 0.135, 0.019], false);
    for (const side of [-1, 1]) {
      capsule(torso, 'uniform-pocket', material('#3f5776'), [side * 0.139, 0.035, 0.154], [0.100, 0.085, 0.023], false);
      capsule(torso, 'gold-epaulet', gold, [side * 0.205, 0.194, 0.05], [0.086, 0.034, 0.11]);
    }
    star(torso, gold, [-0.136, 0.097, 0.176], 0.034);
  }
  if (variant === 'worker') {
    for (const side of [-1, 1]) {
      capsule(torso, 'reflective-vest-stripe', accent, [side * 0.13, -0.012, 0.166], [0.040, 0.31, 0.023], false);
    }
    capsule(torso, 'vest-waist-stripe', accent, [0, -0.126, 0.167], [0.415, 0.045, 0.023], false);
    capsule(torso, 'tool-pouch', material('#a88158'), [0.249, -0.183, 0.06], [0.133, 0.143, 0.118]);
  }
  if (variant === 'brown') {
    capsule(torso, 'shirt-chest-stripe', accent, [0, 0.079, 0.171], [0.391, 0.054, 0.027], false);
    capsule(torso, 'little-backpack', material('#c99a60'), [0, -0.026, -0.235], [0.346, 0.382, 0.172]);
    capsule(torso, 'backpack-pocket', material('#e0b477'), [0, -0.083, -0.326], [0.227, 0.143, 0.045]);
    for (const side of [-1, 1]) {
      tube(torso, 'backpack-strap', material('#bd925e'), [[side * 0.18, -0.12, 0.114], [side * 0.18, 0.15, 0.12], [side * 0.18, 0.24, -0.045], [side * 0.18, 0.10, -0.2]], 0.022);
    }
  }
  if (variant === 'mint') {
    capsule(torso, 'apron', material('#f5e8cb'), [0, -0.088, 0.175], [0.331, 0.275, 0.038]);
    capsule(torso, 'apron-pocket', material('#d3c6a4'), [0, -0.137, 0.197], [0.148, 0.094, 0.017], false);
    bow(torso, accent, [0, 0.157, 0.187], 0.8);
  }
  if (variant === 'tan') {
    star(torso, accent, [0, 0.019, 0.183], 0.066);
    capsule(torso, 'shirt-bottom-band', accent, [0, -0.203, 0], [0.47, 0.044, 0.32]);
  }
}

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** 创建约 2.1–2.33 高的居民；正面为 +Z，角色脚底贴近 y=0。 */
export function createResident(options = {}) {
  const variant = Object.prototype.hasOwnProperty.call(STYLES, options.variant) ? options.variant : 'brown';
  const style = STYLES[variant];
  const name = options.name ?? style.name;
  const role = options.role ?? style.role;
  const behavior = ['walk', 'idle', 'sit'].includes(options.behavior) ? options.behavior : 'idle';
  const baseX = finite(options.x, 0), baseZ = finite(options.z, 0);
  const rotation = finite(options.rotation, 0);
  let hash = 0;
  for (const char of `${name}:${variant}`) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  const phase = finite(options.phase, ((hash >>> 0) % 6283) / 1000);
  const path = options.path ?? {};
  const rx = Math.abs(finite(path.rx, 0.9)), rz = Math.abs(finite(path.rz, 0.58));
  const speed = finite(path.speed, 0.38);
  const root = new THREE.Group();
  root.name = `resident-${name}`;
  root.position.set(baseX, 0, baseZ);
  root.rotation.y = rotation;
  root.scale.setScalar(Math.max(0.01, finite(options.scale, 1)));
  root.userData = { name, role, variant, behavior, isResident: true };

  const rig = group(root, 'animated-rig');
  const torso = group(rig, 'torso-pivot', 0, 0.94, 0);
  createClothes(torso, style, variant);
  capsule(torso, 'neck', material(style.skin), [0, 0.264, 0], [0.157, 0.159, 0.149]);
  const head = group(torso, 'head-pivot', 0, 0.65, 0.012);
  ball(head, 'round-head', material(style.skin), [0, 0, 0], [HEAD.x, HEAD.y, HEAD.z]);
  for (const side of [-1, 1]) {
    ball(head, 'ear', material(style.skin), [side * 0.433, -0.024, 0], [0.073, 0.094, 0.063]);
    ball(head, 'inner-ear', material('#dea093'), [side * 0.469, -0.022, 0.039], [0.025, 0.047, 0.017], false);
  }
  const eyes = createFace(head, style, variant);
  createHair(head, style, variant);
  const tail = createHat(head, torso, style, variant);
  const arms = [-1, 1].map(side => createArm(torso, side, style, variant));
  const legs = [-1, 1].map(side => createLeg(rig, side, style));
  const toy = style.toy ? rabbit(torso, style) : null;
  if (toy) {
    for (const arm of arms) {
      arm.shoulder.rotation.set(-0.58, 0, -arm.side * 0.35);
      arm.elbow.rotation.x = -0.90;
    }
  }

  let clock = 0, walkingTime = 0, gait = phase, lastT = null;
  let waveStart = -Infinity, waveUntil = -Infinity;
  const rotate = (object, x, y, z, weight) => {
    object.rotation.x = THREE.MathUtils.lerp(object.rotation.x, x, weight);
    object.rotation.y = THREE.MathUtils.lerp(object.rotation.y, y, weight);
    object.rotation.z = THREE.MathUtils.lerp(object.rotation.z, z, weight);
  };

  function wave(t) {
    waveStart = finite(t, lastT ?? 0);
    waveUntil = waveStart + 3.2;
  }

  // 动画时钟只在更新时推进，freeze 不改任何姿态或内部时钟。
  function update(t, dt, mode = 'life') {
    if (mode === 'freeze') return;
    const now = finite(t, lastT ?? 0);
    const delta = clamp(finite(dt, lastT === null ? 0 : now - lastT), 0, 0.1);
    lastT = now;
    clock += delta;
    const weight = 1 - Math.exp(-delta * 14);
    const p = clock + phase;
    const dancing = mode === 'dance';
    const walking = !dancing && behavior === 'walk';
    const sitting = !dancing && behavior === 'sit';
    let walkStrength = 0;

    if (walking && speed !== 0 && (rx > 0 || rz > 0)) {
      walkingTime += delta;
      const a = phase + walkingTime * speed;
      // 从原点平滑进入以初始位置为中心的椭圆，首次更新不会瞬移。
      const ramp = smoothstep(walkingTime / 1.5);
      const nextX = baseX + rx * Math.sin(a) * ramp;
      const nextZ = baseZ + rz * Math.cos(a) * ramp;
      const dx = nextX - root.position.x, dz = nextZ - root.position.z;
      const distance = Math.hypot(dx, dz);
      root.position.x = nextX;
      root.position.z = nextZ;
      gait += distance / root.scale.x * 9;
      walkStrength = delta > 0 ? clamp(distance / delta / root.scale.x * 1.8, 0, 1) : 0;
      if (distance > 0.000001) {
        const target = Math.atan2(dx, dz);
        root.rotation.y += angleDelta(root.rotation.y, target) * (1 - Math.exp(-delta * 7));
      }
    }

    const step = Math.sin(gait);
    const beat = p * 4.8;
    let bodyY = 0.009 + Math.sin(p * 1.75) * 0.009;
    let rigX = 0, rigY = 0, rigZ = 0;
    let torsoX = 0, torsoZ = Math.sin(p * 1.3) * 0.012;
    if (walking) {
      bodyY += Math.abs(step) * 0.025 * walkStrength;
      torsoX = 0.035 * walkStrength;
      torsoZ = step * 0.035 * walkStrength;
    }
    if (sitting) {
      bodyY = -0.24 + Math.sin(p * 1.7) * 0.005;
      torsoX = -0.035;
    }
    if (dancing) {
      bodyY = 0.025 + Math.max(0, Math.sin(beat)) * 0.105;
      rigX = Math.sin(beat * 0.5) * 0.035;
      rigY = Math.sin(beat * 0.5) * 0.24;
      rigZ = Math.sin(beat) * 0.046;
      torsoZ = Math.sin(beat + 0.4) * 0.065;
    }
    rig.position.y = THREE.MathUtils.lerp(rig.position.y, bodyY, weight);
    rotate(rig, rigX, rigY, rigZ, weight);
    rotate(torso, torsoX, 0, torsoZ, weight);
    rotate(head, Math.sin(p * 1.4) * 0.022 + (dancing ? Math.sin(beat) * 0.055 : 0), Math.sin(p * 0.73) * 0.085, Math.sin(p * 0.91) * 0.022, weight);

    for (const leg of legs) {
      const s = leg.side;
      let hipX = -s * step * 0.53 * walkStrength;
      let hipZ = s * 0.024;
      let kneeX = 0.035 + Math.max(0, s * step) * 0.43 * walkStrength;
      let footX = -hipX * 0.18;
      if (sitting) {
        hipX = -Math.PI / 2;
        kneeX = Math.PI / 2;
        hipZ = s * 0.06;
        footX = Math.sin(p * 2 + s) * 0.06;
      }
      if (dancing) {
        hipX = s * Math.sin(beat) * 0.32;
        hipZ = s * (0.08 + Math.cos(beat * 0.5) * 0.045);
        kneeX = 0.12 + Math.max(0, -s * Math.sin(beat)) * 0.32;
        footX = -hipX * 0.3;
      }
      rotate(leg.hip, hipX, 0, hipZ, weight);
      rotate(leg.knee, kneeX, 0, 0, weight);
      rotate(leg.foot, footX, 0, 0, weight);
    }

    const waveWeight = now >= waveStart && now < waveUntil
      ? Math.min(smoothstep((now - waveStart) / 0.25), smoothstep((waveUntil - now) / 0.4)) : 0;
    for (const arm of arms) {
      const s = arm.side;
      let shoulderX = s * step * 0.47 * walkStrength + Math.sin(p * 1.5 + s) * 0.035;
      let shoulderZ = s * (0.11 + Math.sin(p * 1.2) * 0.024);
      let elbowX = -0.09 - Math.abs(step) * 0.10 * walkStrength;
      let elbowZ = 0, wristZ = 0;
      if (sitting) {
        shoulderX = -0.49;
        shoulderZ = -s * 0.12;
        elbowX = -0.65;
      }
      if (toy) {
        shoulderX = -0.58 + Math.sin(p * 1.75) * 0.017;
        shoulderZ = -s * 0.35;
        elbowX = -0.90;
      }
      if (dancing && (!toy || s === 1)) {
        shoulderX = -0.35 + Math.sin(beat + s) * 0.26;
        shoulderZ = s * (1.48 + Math.sin(beat * 0.5 + s) * 0.45);
        elbowX = -0.55 + Math.cos(beat) * 0.25;
        elbowZ = s * 0.16;
        wristZ = Math.sin(beat + s) * 0.18;
      }
      if (s === 1 && waveWeight > 0) {
        shoulderX = THREE.MathUtils.lerp(shoulderX, -0.23, waveWeight);
        shoulderZ = THREE.MathUtils.lerp(shoulderZ, 2.48 + Math.sin(p * 11) * 0.11, waveWeight);
        elbowX = THREE.MathUtils.lerp(elbowX, -0.35, waveWeight);
        elbowZ = THREE.MathUtils.lerp(elbowZ, 0.21 + Math.sin(p * 11) * 0.21, waveWeight);
        wristZ = Math.sin(p * 13) * 0.27 * waveWeight;
      }
      rotate(arm.shoulder, shoulderX, 0, shoulderZ, weight);
      rotate(arm.elbow, elbowX, 0, elbowZ, weight);
      rotate(arm.hand, 0, 0, wristZ, weight);
    }

    const blinkPhase = ((clock + phase * 0.77) % 4.9 + 4.9) % 4.9;
    const openness = blinkPhase < 0.17 ? 1 - Math.sin(blinkPhase / 0.17 * Math.PI) * 0.92 : 1;
    for (const eye of eyes) eye.scale.y = openness;
    if (toy) {
      toy.rotation.z = Math.sin(p * (dancing ? 4.8 : 1.75)) * (dancing ? 0.045 : 0.018);
      toy.rotation.x = Math.sin(p * 1.5) * 0.022;
    }
    if (tail) tail.rotation.y = Math.sin(p * (dancing ? 4.8 : 2.4)) * (dancing ? 0.28 : 0.14);
  }

  return { root, update, wave, name, role };
}
