import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { InteractionManager } from './interaction-manager';
import { SHARED } from './shared';

export class InteractionManagerExample {
  private readonly _renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  });
  private readonly _scene = new THREE.Scene();
  private readonly _camera: THREE.PerspectiveCamera;
  private readonly _controls: OrbitControls;
  private readonly _interactionManager: InteractionManager;

  constructor() {
    this._camera = SHARED.createCamera();

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._interactionManager = new InteractionManager(this._renderer.domElement, this._camera);

    this._scene.background = new THREE.Color(0x222222);

    this.configureRenderer();

    this.setupSimpleScenario();

    this.update();
  }

  private setupSimpleScenario() {
    const { box } = SHARED.simpleScenario();
    this._interactionManager.add(box);
    this._scene.add(box);

    box.addEventListener('pointerover', () => {
      box.material.color.set('red');
    });
    box.addEventListener('pointerout', () => {
      box.material.color.set('green');
    });
    box.addEventListener('pointerdown', () => {
      box.material.color.set('darkred');
    });
    box.addEventListener('pointerup', () => {
      box.material.color.set('green');
    });
    box.addEventListener('click', () => {
      box.material.color.set('pink');
    });
  }

  private setupComplexScenario() {
    const { scene, parentBox, childBox, childBatched, childInstanced } = SHARED.complexScenario();
    this._scene.add(scene);
    this._interactionManager.add(scene);
    this._interactionManager.add(parentBox);
    this._interactionManager.add(childBox);
    this._interactionManager.add(childBatched);
    this._interactionManager.add(childInstanced);

    scene.addEventListener('pointerover', () => {
      parentBox.material.color.set('red');
      childBox.material.color.set('red');
    });
    scene.addEventListener('pointerout', () => {
      parentBox.material.color.set('green');
      childBox.material.color.set('green');
    });

    childInstanced.addEventListener('dblclick', (e) => {
      childInstanced.setColorAt(e.currentTargetInstanceId!, new THREE.Color('orange'));
      childInstanced.instanceColor!.needsUpdate = true;
    });

    childInstanced.addEventListener('click', (e) => {
      childInstanced.setColorAt(e.currentTargetInstanceId!, new THREE.Color('pink'));
      childInstanced.instanceColor!.needsUpdate = true;
    });

    childInstanced.addEventListener('pointerover', (e) => {
      childInstanced.setColorAt(e.currentTargetInstanceId!, new THREE.Color('red'));
      childInstanced.instanceColor!.needsUpdate = true;
    });

    childInstanced.addEventListener('pointerout', (e) => {
      childInstanced.setColorAt(e.currentTargetInstanceId!, new THREE.Color('green'));
      childInstanced.instanceColor!.needsUpdate = true;
    });

    childBatched.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      childBatched.setColorAt(e.currentTargetBatchId!, new THREE.Color('orange'));
    });
  }

  private update() {
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
    requestAnimationFrame(() => this.update());
  }

  private configureRenderer() {
    this._renderer.domElement.width = SHARED.canvasSize;
    this._renderer.domElement.height = SHARED.canvasSize;
    this._renderer.setSize(SHARED.canvasSize, SHARED.canvasSize);
    document.body.appendChild(this._renderer.domElement);
  }
}
