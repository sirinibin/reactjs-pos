import eventEmitter from "../eventEmitter";

afterEach(() => {
  // Clear all listeners between tests to avoid cross-test interference.
  // mitt stores handlers on emitter.all (a Map); clearing it resets state.
  eventEmitter.all.clear();
  jest.restoreAllMocks();
});

describe("eventEmitter", () => {
  // 1. Default export is a valid object
  test("default export is a non-null object", () => {
    expect(eventEmitter).not.toBeNull();
    expect(typeof eventEmitter).toBe("object");
  });

  test("default export exposes on, off, emit, and all", () => {
    expect(typeof eventEmitter.on).toBe("function");
    expect(typeof eventEmitter.off).toBe("function");
    expect(typeof eventEmitter.emit).toBe("function");
    expect(eventEmitter.all).toBeDefined();
  });

  // 2. on / emit: listener fires with correct payload
  test("listener receives the emitted payload", () => {
    const handler = jest.fn();
    eventEmitter.on("test-event", handler);
    eventEmitter.emit("test-event", { value: 42 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  // 3. Multiple listeners on the same event all fire
  test("multiple listeners on the same event all fire", () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    const handlerC = jest.fn();
    eventEmitter.on("multi-event", handlerA);
    eventEmitter.on("multi-event", handlerB);
    eventEmitter.on("multi-event", handlerC);
    eventEmitter.emit("multi-event", "payload");
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(handlerC).toHaveBeenCalledTimes(1);
    expect(handlerA).toHaveBeenCalledWith("payload");
    expect(handlerB).toHaveBeenCalledWith("payload");
    expect(handlerC).toHaveBeenCalledWith("payload");
  });

  // 4. off: removing a listener stops future events reaching it
  test("off removes the listener so it no longer receives events", () => {
    const handler = jest.fn();
    eventEmitter.on("removable-event", handler);
    eventEmitter.emit("removable-event", "first");
    expect(handler).toHaveBeenCalledTimes(1);

    eventEmitter.off("removable-event", handler);
    eventEmitter.emit("removable-event", "second");
    expect(handler).toHaveBeenCalledTimes(1); // still 1, not called again
  });

  // 5. Wildcard listener ('*') receives all events with (type, event) args
  test("wildcard listener fires for every event with (type, payload)", () => {
    const wildcard = jest.fn();
    eventEmitter.on("*", wildcard);

    eventEmitter.emit("alpha", { a: 1 });
    eventEmitter.emit("beta", { b: 2 });

    expect(wildcard).toHaveBeenCalledTimes(2);
    expect(wildcard).toHaveBeenNthCalledWith(1, "alpha", { a: 1 });
    expect(wildcard).toHaveBeenNthCalledWith(2, "beta", { b: 2 });
  });

  // 6. Emitting with no listeners does not throw
  test("emitting an event with no listeners does not throw", () => {
    expect(() => {
      eventEmitter.emit("event-with-no-listeners", { data: "x" });
    }).not.toThrow();
  });

  // 7. Emitting with undefined payload does not crash
  test("emitting an event with undefined payload does not throw", () => {
    const handler = jest.fn();
    eventEmitter.on("undefined-payload-event", handler);
    expect(() => {
      eventEmitter.emit("undefined-payload-event");
    }).not.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  // 8. off removes only the specified handler; other handlers still fire
  test("off removes only the targeted handler, leaving others intact", () => {
    const handlerToRemove = jest.fn();
    const handlerToKeep = jest.fn();

    eventEmitter.on("shared-event", handlerToRemove);
    eventEmitter.on("shared-event", handlerToKeep);

    eventEmitter.off("shared-event", handlerToRemove);
    eventEmitter.emit("shared-event", "ping");

    expect(handlerToRemove).not.toHaveBeenCalled();
    expect(handlerToKeep).toHaveBeenCalledTimes(1);
    expect(handlerToKeep).toHaveBeenCalledWith("ping");
  });

  // 9. Re-adding a handler after off works correctly
  test("re-adding a handler after off allows it to receive events again", () => {
    const handler = jest.fn();

    eventEmitter.on("re-add-event", handler);
    eventEmitter.emit("re-add-event", "first");
    expect(handler).toHaveBeenCalledTimes(1);

    eventEmitter.off("re-add-event", handler);
    eventEmitter.emit("re-add-event", "second");
    expect(handler).toHaveBeenCalledTimes(1); // missed while removed

    eventEmitter.on("re-add-event", handler);
    eventEmitter.emit("re-add-event", "third");
    expect(handler).toHaveBeenCalledTimes(2); // received after re-add
    expect(handler).toHaveBeenLastCalledWith("third");
  });

  // 10. Calling off with a handler that was never added does not throw
  test("off with an unregistered handler does not throw", () => {
    const neverAdded = jest.fn();
    expect(() => {
      eventEmitter.off("any-event", neverAdded);
    }).not.toThrow();
  });

  // Bonus: the singleton is shared — listeners registered in one place
  // see events emitted from another (module identity check)
  test("eventEmitter is a singleton — re-importing yields the same instance", async () => {
    const { default: reimported } = await import("../eventEmitter");
    expect(reimported).toBe(eventEmitter);
  });
});
