export type Teardown = () => void;
export type Unsubscribe = () => void;

export type Subscriber<T> = (value: T) => void;

export class Observable<T> {
  private subscribers: Set<Subscriber<T>> = new Set();
  private onLastUnsubscribe?: Teardown;

  constructor(private onFirstSubscribe?: () => Teardown | void) {}

  subscribe(subscriber: Subscriber<T>): Unsubscribe {
    if (this.subscribers.size === 0 && this.onFirstSubscribe) {
      const maybeTeardown = this.onFirstSubscribe();
      this.onLastUnsubscribe = typeof maybeTeardown === 'function' ? maybeTeardown : undefined;
    }
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0 && this.onLastUnsubscribe) {
        this.onLastUnsubscribe();
        this.onLastUnsubscribe = undefined;
      }
    };
  }

  next(value: T): void {
    for (const subscriber of this.subscribers) subscriber(value);
  }
}
