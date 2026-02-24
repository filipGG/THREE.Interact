import { beforeEach, describe, expect, it } from 'vitest';
import { InteractionManager, PointerDelta } from './interaction-manager';
import { SHARED } from './shared';

describe('InteractionManager', () => {
  let element: HTMLElement;
  let manager: InteractionManager;

  beforeEach(() => {
    const camera = SHARED.createCamera();
    element = mockElement();
    manager = new InteractionManager(element, camera);
  });

  describe('Simple scenario with only one box in the center', () => {
    it('should trigger pointerover -> pointerout', () => {
      const { box } = SHARED.simpleScenario();
      manager.add(box);

      const triggeredEvents: string[] = [];

      box.addEventListener('pointerover', (e) => triggeredEvents.push(e.type));
      box.addEventListener('pointerout', (e) => triggeredEvents.push(e.type));

      element.dispatchEvent(mockEvent('pointermove', 0, 0, element));
      element.dispatchEvent(mockEvent('pointermove', 512, 512, element));
      element.dispatchEvent(mockEvent('pointermove', 505, 505, element));
      element.dispatchEvent(mockEvent('pointermove', 0, 0, element));

      expect(triggeredEvents).toEqual(['pointerover', 'pointerout']);
    });

    it('should no longer get events after removing', () => {
      const { box } = SHARED.simpleScenario();
      manager.add(box);

      const triggeredEvents: string[] = [];
      box.addEventListener('pointerdown', (e) => triggeredEvents.push(e.type));

      element.dispatchEvent(mockEvent('pointerdown', 512, 512, element));
      element.dispatchEvent(mockEvent('pointerdown', 512, 512, element));
      manager.remove(box);
      element.dispatchEvent(mockEvent('pointerdown', 512, 512, element));
      element.dispatchEvent(mockEvent('pointerdown', 512, 512, element));

      expect(triggeredEvents).toEqual(['pointerdown', 'pointerdown']);
    });

    it('should trigger pointerdown -> pointerup -> click', () => {
      const { box } = SHARED.simpleScenario();
      manager.add(box);

      const triggeredEvents: string[] = [];

      box.addEventListener('pointerdown', (e) => triggeredEvents.push(e.type));
      box.addEventListener('pointerup', (e) => triggeredEvents.push(e.type));
      box.addEventListener('click', (e) => triggeredEvents.push(e.type));

      element.dispatchEvent(mockEvent('pointermove', 512, 512, element));
      element.dispatchEvent(mockEvent('pointerdown', 512, 512, element));
      element.dispatchEvent(mockEvent('pointerup', 512, 512, element));

      expect(triggeredEvents).toEqual(['pointerdown', 'pointerup', 'click']);
    });

    it('should trigger pointerout when leaving the canvas', () => {
      const { box } = SHARED.simpleScenario();
      manager.add(box);

      const triggeredEvents: string[] = [];

      box.addEventListener('pointerover', (e) => triggeredEvents.push(e.type));
      box.addEventListener('pointerout', (e) => triggeredEvents.push(e.type));

      // Start hovering the box
      element.dispatchEvent(mockEvent('pointermove', 512, 512, element));
      // Simulate that we leave the canvas and hover some absolute positioned element, which will change the target
      element.dispatchEvent(mockEvent('pointermove', 512, 512, mockElement()));

      expect(triggeredEvents).toEqual(['pointerover', 'pointerout']);
    });

    it('should have event delta', () => {
      const { box } = SHARED.simpleScenario();
      manager.add(box);

      let pointerDelta: PointerDelta | undefined;
      box.addEventListener('click', (e) => {
        pointerDelta = e.delta;
      });

      element.dispatchEvent(mockEvent('pointerdown', 512, 512, element));
      element.dispatchEvent(mockEvent('pointerup', 518, 512, element));

      expect(pointerDelta).toBeDefined();
      expect(pointerDelta?.deltaX).toEqual(6);
      expect(pointerDelta?.deltaY).toEqual(0);
      expect(pointerDelta?.distance).toEqual(6);
    });
  });

  describe('Complex scenario', () => {
    it('should bubble click up to parents', () => {
      const { scene, parentBox, childBox, childBatched } = SHARED.complexScenario();
      manager.add(scene);
      manager.add(parentBox);
      manager.add(childBox);
      manager.add(childBatched);

      const triggeredEvents: string[] = [];

      scene.addEventListener('pointerdown', (e) => triggeredEvents.push('scene_down'));
      parentBox.addEventListener('pointerdown', (e) => triggeredEvents.push('parent_down'));
      childBox.addEventListener('pointerdown', (e) => triggeredEvents.push('child_down'));
      childBatched.addEventListener('pointerdown', (e) => triggeredEvents.push('batched_down'));

      element.dispatchEvent(mockEvent('pointerdown', 592, 512, element));

      expect(triggeredEvents).toEqual(['child_down', 'parent_down', 'scene_down']);
    });

    it('should stop propagation and prevent bubbling up to parent  | scene->parentBox->childBox |', () => {
      const { scene, parentBox, childBox, childBatched } = SHARED.complexScenario();
      manager.add(scene);
      manager.add(parentBox);
      manager.add(childBox);
      manager.add(childBatched);

      const triggeredEvents: string[] = [];

      scene.addEventListener('pointerdown', (e) => triggeredEvents.push('scene_down'));
      parentBox.addEventListener('pointerdown', (e) => {
        triggeredEvents.push('parent_down');
        e.stopPropagation();
      });
      childBox.addEventListener('pointerdown', (e) => {
        triggeredEvents.push('child_down');
      });

      element.dispatchEvent(mockEvent('pointerdown', 592, 512, element));

      expect(triggeredEvents).toEqual(['child_down', 'parent_down']);
    });

    it('should only emit one pointerover event for parent when pointer stays within parent hierarchy', () => {
      const { scene, parentBox, childBox, childBatched } = SHARED.complexScenario();
      manager.add(scene);
      manager.add(parentBox);
      manager.add(childBox);
      manager.add(childBatched);

      const triggeredEvents: string[] = [];

      scene.addEventListener('pointerover', (e) => triggeredEvents.push('scene_over'));

      // Move back and forth between parentBox and childBox
      element.dispatchEvent(mockEvent('pointermove', 512, 512, element));
      element.dispatchEvent(mockEvent('pointermove', 592, 512, element));
      element.dispatchEvent(mockEvent('pointermove', 512, 512, element));
      element.dispatchEvent(mockEvent('pointermove', 592, 512, element));

      expect(triggeredEvents).toEqual(['scene_over']);
    });

    it('should treat batched mesh & instancedMesh instances as separate objects', () => {
      const { scene, parentBox, childBox, childBatched, childInstanced } = SHARED.complexScenario();
      manager.add(scene);
      manager.add(parentBox);
      manager.add(childBox);
      manager.add(childBatched);
      manager.add(childInstanced);

      const triggeredEvents: string[] = [];

      scene.addEventListener('pointerover', (e) => triggeredEvents.push('scene_over'));
      childBatched.addEventListener('pointerover', (e) =>
        triggeredEvents.push('child_batched_over_' + e.currentTargetBatchId),
      );
      childInstanced.addEventListener('pointerover', (e) =>
        triggeredEvents.push('child_instanced_over_' + e.currentTargetInstanceId),
      );

      // Move back and forth between the two instances in the batched mesh
      element.dispatchEvent(mockEvent('pointermove', 606, 827, element));
      element.dispatchEvent(mockEvent('pointermove', 738, 827, element));

      // Move back and forth between the two instances in the instanced mesh
      element.dispatchEvent(mockEvent('pointermove', 606, 215, element));
      element.dispatchEvent(mockEvent('pointermove', 738, 215, element));

      expect(triggeredEvents).toEqual([
        'child_batched_over_0',
        'scene_over',
        'child_batched_over_1',
        'child_instanced_over_0',
        'child_instanced_over_1',
      ]);
    });
  });
});

function mockEvent(type: string, x: number, y: number, target: HTMLElement): Event {
  const event: Partial<PointerEvent> = {
    type,
    clientX: x,
    clientY: y,
    target,
  };

  return event as Event;
}

function mockElement(): HTMLElement {
  const listeners: Record<string, any[]> = {};

  const element: Partial<HTMLElement> = {
    getBoundingClientRect: () => {
      const result: Partial<DOMRect> = {
        left: 0,
        top: 0,
        width: 1024,
        height: 1024,
      };

      return result as DOMRect;
    },

    addEventListener(type: string, callback: (event: Event) => void) {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(callback);
    },
    removeEventListener: (...args: any) => {},

    dispatchEvent(event: Event) {
      const cbs = listeners[event.type] || [];
      cbs.forEach((cb) => cb(event));
      return true;
    },
  };

  (element as any).ownerDocument = element;

  return element as HTMLElement;
}
