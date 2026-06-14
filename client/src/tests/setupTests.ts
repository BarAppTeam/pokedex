import "@testing-library/jest-dom/vitest";

type ObserverEntry = {
  isIntersecting: boolean;
  target: Element;
};
type ObserverCallback = (entries: ObserverEntry[]) => void;

class MockIntersectionObserver {
  static observers: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  elements: Element[] = [];

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.observers.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  disconnect() {
    this.elements = [];
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter((observed) => observed !== element);
  }

  static trigger(isIntersecting = true) {
    MockIntersectionObserver.observers.forEach((observer) => {
      observer.callback(
        observer.elements.map((target) => ({ isIntersecting, target })),
      );
    });
  }

  static triggerElement(target: Element, isIntersecting = true) {
    MockIntersectionObserver.observers.forEach((observer) => {
      if (observer.elements.includes(target)) {
        observer.callback([{ isIntersecting, target }]);
        return;
      }

      const observedChild = observer.elements.find((element) =>
        target.contains(element),
      );
      if (observedChild) {
        observer.callback([{ isIntersecting, target: observedChild }]);
      }
    });
  }

  static reset() {
    MockIntersectionObserver.observers = [];
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: query.includes("dark"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  writable: true,
  configurable: true,
  value: vi.fn(() => ({
    x: 0,
    y: 0,
    top: 0,
    bottom: 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    toJSON: () => undefined,
  })),
});

export { MockIntersectionObserver };
