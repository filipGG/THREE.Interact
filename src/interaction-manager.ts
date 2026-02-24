import * as THREE from 'three';

export class InteractiveEvent {
  public propagationStopped = false;

  constructor(
    public readonly type: EventName,
    public readonly currentTarget: THREE.Object3D,
    public readonly currentTargetBatchId: number | undefined,
    public readonly currentTargetInstanceId: number | undefined,
  ) {}

  public stopPropagation() {
    this.propagationStopped = true;
  }
}

interface Intersection extends THREE.Intersection {
  // current target for the event. THREE.Intersection.object is the origin object
  currentObject: THREE.Object3D;
  propagationStopped: boolean;
}

export type EventName =
  | 'click'
  | 'dblclick'
  | 'mouseenter'
  | 'mouseleave'
  | 'mousedown'
  | 'mousemove'
  | 'mouseup'
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'pointerdown'
  | 'pointerup'
  | 'pointermove'
  | 'pointerover'
  | 'pointerout';

export class InteractiveObject {
  constructor(public readonly object3D: THREE.Object3D) {}
}

export class InteractionManager {
  private _raycaster = new THREE.Raycaster();
  private _mousePosition = new THREE.Vector2(-1, 1);

  private _interactiveObjects = new Set<THREE.Object3D>();

  private _hovered = new Map<string, Intersection>();
  private _initialHits: Intersection[] = [];
  private _duplicates = new Set<string>();

  constructor(
    private readonly _element: HTMLElement,
    private readonly _camera: THREE.Camera,
  ) {
    const domElement = this._element;
    domElement.addEventListener('pointerup', this.handlePointerUp);
    domElement.addEventListener('pointerdown', this.handlePointerDown);
    domElement.ownerDocument.addEventListener('pointermove', this.handleDocumentPointerMove);
    domElement.addEventListener('dblclick', this.handleDoubleClick);
  }

  public dispose = () => {
    const domElement = this._element;
    domElement.removeEventListener('pointerup', this.handlePointerUp);
    domElement.removeEventListener('pointerdown', this.handlePointerDown);
    domElement.removeEventListener('pointermove', this.handleDocumentPointerMove);
    domElement.removeEventListener('dblclick', this.handleDoubleClick);
  };

  public add = (object3D: THREE.Object3D) => {
    this._interactiveObjects.add(object3D);
  };

  public remove = (object3D: THREE.Object3D) => {
    this._interactiveObjects.delete(object3D);
  };

  private handlePointerUp = (pointerEvent: PointerEvent) => {
    this.updateMousePosition(pointerEvent.clientX, pointerEvent.clientY);

    const eventPath = this.getEventPath();

    if (eventPath.length > 0) {
      for (const event of eventPath) {
        const interactiveEvent = new InteractiveEvent(
          'pointerup',
          event.currentObject,
          event.batchId,
          event.instanceId,
        );
        event.currentObject.dispatchEvent(interactiveEvent);

        const eventId = createId(event);
        const shouldDispatchClick = this._initialHits.find(
          (initialHit) => createId(initialHit) === eventId,
        );

        if (shouldDispatchClick) {
          const interactiveClickEvent = new InteractiveEvent(
            'click',
            event.currentObject,
            event.batchId,
            event.instanceId,
          );
          event.currentObject.dispatchEvent(interactiveClickEvent);
        }
      }
    }

    this._initialHits = [];
  };

  private handlePointerDown = (pointerEvent: PointerEvent) => {
    this.updateMousePosition(pointerEvent.clientX, pointerEvent.clientY);

    const eventPath = this.getEventPath();

    this._initialHits = eventPath;

    if (eventPath.length === 0) {
      return;
    }

    for (const event of eventPath) {
      const interactiveEvent = new InteractiveEvent(
        'pointerdown',
        event.currentObject,
        event.batchId,
        event.instanceId,
      );

      event.currentObject.dispatchEvent(interactiveEvent);

      if (interactiveEvent.propagationStopped) {
        break;
      }
    }
  };

  private handleDoubleClick = (pointerEvent: MouseEvent) => {
    this.updateMousePosition(pointerEvent.clientX, pointerEvent.clientY);

    const eventPath = this.getEventPath();

    if (eventPath.length === 0) {
      return;
    }

    for (const event of eventPath) {
      const interactiveEvent = new InteractiveEvent(
        'dblclick',
        event.currentObject,
        event.batchId,
        event.instanceId,
      );

      event.currentObject.dispatchEvent(interactiveEvent);

      if (interactiveEvent.propagationStopped) {
        break;
      }
    }
  };

  private handleDocumentPointerMove = (pointerEvent: PointerEvent) => {
    this.updateMousePosition(pointerEvent.clientX, pointerEvent.clientY);

    const isMouseOverElement = pointerEvent.target === this._element;
    const fullEventPath = isMouseOverElement ? this.getEventPath() : [];

    const pathUntilPropagationWasStopped: Intersection[] = [];

    for (const event of fullEventPath) {
      const eventId = createId(event);

      pathUntilPropagationWasStopped.push(event);

      const hoveredItem = this._hovered.get(eventId);
      if (!hoveredItem) {
        this._hovered.set(eventId, event);

        const interactiveEvent = new InteractiveEvent(
          'pointerover',
          event.currentObject,
          event.batchId,
          event.instanceId,
        );

        event.currentObject.dispatchEvent(interactiveEvent);

        if (interactiveEvent.propagationStopped) {
          event.propagationStopped = true;
          break;
        }
      } else if (hoveredItem.propagationStopped) {
        break;
      }
    }

    this.processUnhoveredObjects(pathUntilPropagationWasStopped);
  };

  private processUnhoveredObjects = (eventPath: Intersection[]) => {
    const leaveEvents: InteractiveEvent[] = [];

    for (const hoverEvent of this._hovered.values()) {
      const hoverEventId = createId(hoverEvent);

      const isNotHoveredAnymore = () =>
        !eventPath.find((event) => createId(event) === hoverEventId);

      if (eventPath.length === 0 || isNotHoveredAnymore()) {
        this._hovered.delete(hoverEventId);

        const interactiveEvent = new InteractiveEvent(
          'pointerout',
          hoverEvent.currentObject,
          hoverEvent.batchId,
          hoverEvent.instanceId,
        );

        leaveEvents.push(interactiveEvent);
      }
    }

    // Sort them by scene-depth so that children gets the events first
    leaveEvents.sort((a, b) => {
      const depthA = getDepth(a.currentTarget);
      const depthB = getDepth(b.currentTarget);
      return depthB - depthA;
    });

    for (const event of leaveEvents) {
      event.currentTarget.dispatchEvent(event);
    }
  };

  private updateMousePosition = (x: number, y: number) => {
    const rect: DOMRect = this._element.getBoundingClientRect();
    this._mousePosition.x = ((x - rect.left) / rect.width) * 2 - 1;
    this._mousePosition.y = -((y - rect.top) / rect.height) * 2 + 1;
  };

  /**
   * Builds a flat list of all interactive objects along all raycast intersections,
   * ordered by intersection distance (closest first).
   *
   * For each raw intersection (closest to farthest), it walks up the parent chain
   * and includes every ancestor that is registered via {@link add}
   *
   * This creates the full event delivery path, enabling proper bubbling from
   * innermost → outermost objects per hit.
   */
  private getEventPath = () => {
    const rawIntersections = this.getUniqueIntersections();

    const eventPath: Intersection[] = [];

    for (const intersection of rawIntersections) {
      let eventObject: THREE.Object3D | null = intersection.object;
      let eventObjectBatchId: number | undefined = intersection.batchId;
      let eventObjectInstanceId: number | undefined = intersection.instanceId;

      // Bubble event up through its parents
      while (eventObject) {
        const isInteractive = this._interactiveObjects.has(eventObject);

        if (isInteractive) {
          eventPath.push({
            ...intersection,
            currentObject: eventObject,
            batchId: eventObjectBatchId,
            instanceId: eventObjectInstanceId,
            propagationStopped: false,
          });
        }

        eventObject = eventObject.parent;
        // Reset after the initial hit: BatchedMesh & InstancedMesh instances have no children.
        eventObjectBatchId = undefined;
        eventObjectInstanceId = undefined;
      }
    }

    return eventPath;
  };

  private getUniqueIntersections = (): THREE.Intersection<THREE.Object3D>[] => {
    this._raycaster.setFromCamera(this._mousePosition, this._camera);
    this._duplicates.clear();

    const result = Array.from(this._interactiveObjects)
      // Intersect objects
      .flatMap((obj) => this._raycaster.intersectObject(obj, true))
      // Sort by distance
      .sort((a, b) => a.distance - b.distance)
      // Filter out duplicates
      .filter((intersection) => {
        const id = createId(intersection as Intersection);
        if (this._duplicates.has(id)) {
          return false;
        }
        this._duplicates.add(id);
        return true;
      });

    return result;
  };
}

function createId(hit: Intersection) {
  const obj = hit.currentObject || hit.object;
  return `${obj.name}/${obj.uuid}/${hit.index}/${hit.batchId}/${hit.instanceId}`;
}

function getDepth(obj: THREE.Object3D): number {
  let depth = 0;
  let current = obj;
  while (current.parent) {
    depth++;
    current = current.parent;
  }
  return depth;
}
