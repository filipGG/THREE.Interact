import * as THREE from 'three';

function createCamera() {
  const camera = new THREE.PerspectiveCamera();
  camera.near = 0.1;
  camera.far = 10_000;
  camera.position.y = 10;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function simpleScenario() {
  const box = addBox(0, 0, 0);
  return { box };
}

function complexScenario() {
  const scene = new THREE.Scene();

  const parentBox = addBox(0, 0, 0);
  scene.add(parentBox);

  const childBox = addBox(0.5, -1, 0);
  parentBox.add(childBox);

  const childBatched = addBatchedMesh(0, -1, 3);
  parentBox.add(childBatched);

  const childInstanced = addInstancedMesh(0, -1, -3);
  parentBox.add(childInstanced);

  return { scene, parentBox, childBox, childBatched, childInstanced };
}

function addBox(x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 'green' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  mesh.updateMatrixWorld();
  mesh.updateMatrix();
  return mesh;
}

function addBatchedMesh(x: number, y: number, z: number) {
  const mesh = new THREE.BatchedMesh(10000, 10000, 10000, new THREE.MeshBasicMaterial());
  const circle = new THREE.BoxGeometry();
  const geometryId = mesh.addGeometry(circle);

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color('green');

  matrix.setPosition(1, 0, 0);

  const batchId_1 = mesh.addInstance(geometryId);
  mesh.setMatrixAt(batchId_1, matrix);
  mesh.setColorAt(batchId_1, color);

  matrix.setPosition(2, 0, 0);

  const batchId_2 = mesh.addInstance(geometryId);
  mesh.setMatrixAt(batchId_2, matrix);
  mesh.setColorAt(batchId_2, color);

  mesh.position.set(x, y, z);

  mesh.updateMatrixWorld();

  return mesh;
}

function addInstancedMesh(x: number, y: number, z: number) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 2);

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color('green');

  matrix.setPosition(1, 0, 0);
  mesh.setMatrixAt(0, matrix);
  mesh.setColorAt(0, color);

  matrix.setPosition(2, 0, 0);
  mesh.setMatrixAt(1, matrix);
  mesh.setColorAt(1, color);

  mesh.position.set(x, y, z);

  mesh.updateMatrixWorld();

  mesh.instanceColor!.needsUpdate = true;

  return mesh;
}

export const SHARED = {
  createCamera,
  simpleScenario,
  complexScenario,
  canvasSize: 1024,
};
