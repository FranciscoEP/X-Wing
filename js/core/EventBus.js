/** Pub/sub mínimo: la simulación emite eventos y la presentación (sonido, partículas) reacciona. */
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(name, handler) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(handler);
    return () => this.off(name, handler);
  }

  off(name, handler) {
    const list = this.handlers.get(name);
    if (list) this.handlers.set(name, list.filter((h) => h !== handler));
  }

  emit(name, payload) {
    for (const handler of this.handlers.get(name) ?? []) handler(payload);
  }
}
