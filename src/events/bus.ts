/**
 * A small typed event bus (§10) so future features (alerts, AI, collaboration)
 * can subscribe to selection/data events without coupling to the stores that
 * produce them. Deliberately tiny — no deps.
 */
import type { Dataset, Selection } from '@/model/types';

export interface VantageEvents {
  'selection:changed': { selection: Selection };
  'dataset:added': { dataset: Dataset };
  'dataset:removed': { datasetId: string };
  'tile:added': { tileId: string };
  'query:executed': { sql: string; ms: number };
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<keyof VantageEvents, Set<Handler<any>>>();

  on<K extends keyof VantageEvents>(
    event: K,
    handler: Handler<VantageEvents[K]>,
  ): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit<K extends keyof VantageEvents>(event: K, payload: VantageEvents[K]): void {
    this.handlers.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch {
        /* a subscriber's failure must not break the emitter */
      }
    });
  }
}

export const eventBus = new EventBus();
