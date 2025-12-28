// Script to create proper GLB floor models using Three.js GLTFExporter
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Since we're in Node.js, we'll create simple JSON-based GLTF structure
// that Three.js can load properly

function createBoxGLB(name, width, height, depth, color) {
  // Create a minimal GLTF JSON structure
  const gltf = {
    asset: {
      version: "2.0",
      generator: "Conscience Floor Generator"
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        mesh: 0,
        translation: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1]
      }
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1
            },
            indices: 2,
            material: 0
          }
        ]
      }
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [
            ((color >> 16) & 255) / 255,
            ((color >> 8) & 255) / 255,
            (color & 255) / 255,
            1.0
          ],
          metallicFactor: 0.1,
          roughnessFactor: 0.9
        }
      }
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 24,
        type: "VEC3",
        max: [width/2, height/2, depth/2],
        min: [-width/2, -height/2, -depth/2]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 24,
        type: "VEC3"
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: 36,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 288 },
      { buffer: 0, byteOffset: 288, byteLength: 288 },
      { buffer: 0, byteOffset: 576, byteLength: 72 }
    ],
    buffers: [
      {
        byteLength: 648
      }
    ]
  };
  
  // Create box vertices
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  
  const positions = new Float32Array([
    // Front face
    -hw, -hh,  hd,  hw, -hh,  hd,  hw,  hh,  hd, -hw,  hh,  hd,
    // Back face
    -hw, -hh, -hd, -hw,  hh, -hd,  hw,  hh, -hd,  hw, -hh, -hd,
    // Top face
    -hw,  hh, -hd, -hw,  hh,  hd,  hw,  hh,  hd,  hw,  hh, -hd,
    // Bottom face
    -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh,  hd, -hw, -hh,  hd,
    // Right face
     hw, -hh, -hd,  hw,  hh, -hd,  hw,  hh,  hd,  hw, -hh,  hd,
    // Left face
    -hw, -hh, -hd, -hw, -hh,  hd, -hw,  hh,  hd, -hw,  hh, -hd
  ]);
  
  const normals = new Float32Array([
    // Front
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // Back
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    // Top
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // Bottom
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // Right
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // Left
    -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
  ]);
  
  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3,    // front
    4, 5, 6,  4, 6, 7,    // back
    8, 9, 10,  8, 10, 11, // top
    12, 13, 14,  12, 14, 15, // bottom
    16, 17, 18,  16, 18, 19, // right
    20, 21, 22,  20, 22, 23  // left
  ]);
  
  // Create binary buffer
  const buffer = Buffer.alloc(648);
  let offset = 0;
  
  // Write positions
  for (let i = 0; i < positions.length; i++) {
    buffer.writeFloatLE(positions[i], offset);
    offset += 4;
  }
  
  // Write normals
  for (let i = 0; i < normals.length; i++) {
    buffer.writeFloatLE(normals[i], offset);
    offset += 4;
  }
  
  // Write indices
  for (let i = 0; i < indices.length; i++) {
    buffer.writeUInt16LE(indices[i], offset);
    offset += 2;
  }
  
  // Encode as base64 for data URI
  const base64Buffer = buffer.toString('base64');
  gltf.buffers[0].uri = `data:application/octet-stream;base64,${base64Buffer}`;
  
  return JSON.stringify(gltf);
}

// Create floor model (large flat box)
const floorGLB = createBoxGLB('floor', 100, 0.5, 100, 0x4a5f4a);
fs.writeFileSync(path.join(__dirname, 'public', 'assets', 'floor.glb'), floorGLB);
console.log('✓ Created floor.glb');

// Create ramp model
const rampGLB = createBoxGLB('ramp', 10, 0.5, 15, 0x6a5f4a);
fs.writeFileSync(path.join(__dirname, 'public', 'assets', 'ramp.glb'), rampGLB);
console.log('✓ Created ramp.glb');

// Create player model (capsule-like)
const playerGLB = createBoxGLB('player', 0.8, 1.6, 0.8, 0x00ff88);
fs.writeFileSync(path.join(__dirname, 'public', 'assets', 'player.glb'), playerGLB);
console.log('✓ Created player.glb');

// Create enemy model
const enemyGLB = createBoxGLB('enemy', 0.8, 1.6, 0.8, 0xff4444);
fs.writeFileSync(path.join(__dirname, 'public', 'assets', 'enemy.glb'), enemyGLB);
console.log('✓ Created enemy.glb');

console.log('✓ All GLB models created successfully!');
