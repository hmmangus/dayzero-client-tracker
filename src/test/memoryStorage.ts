/** In-memory Storage so repository tests don't share global localStorage state. */
export class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  /** Set to make the next setItem throw, e.g. to simulate a full quota. */
  failWrites = false;

  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    this.items.set(key, String(value));
  }
}
