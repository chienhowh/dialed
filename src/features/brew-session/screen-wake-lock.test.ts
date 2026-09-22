import { describe, expect, it, vi } from "vitest";

import { createScreenWakeLockController, type WakeLockSentinelLike } from "./screen-wake-lock";

function deferredTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function fixture() {
  let visibilityState: DocumentVisibilityState = "visible";
  let visibilityListener: (() => void) | null = null;
  const sentinels: Array<WakeLockSentinelLike & { releaseListener?: () => void }> = [];
  const request = vi.fn(async () => {
    const sentinel: WakeLockSentinelLike & { releaseListener?: () => void } = {
      addEventListener: (_type, listener) => { sentinel.releaseListener = listener; },
      release: vi.fn(async () => {
        sentinel.released = true;
        sentinel.releaseListener?.();
      }),
      released: false,
    };
    sentinels.push(sentinel);
    return sentinel;
  });
  const visibility = {
    addEventListener: (_type: "visibilitychange", listener: () => void) => { visibilityListener = listener; },
    get visibilityState() { return visibilityState; },
    removeEventListener: () => { visibilityListener = null; },
  };
  return {
    request,
    sentinels,
    setVisibility(next: DocumentVisibilityState) {
      visibilityState = next;
      visibilityListener?.();
    },
    visibility,
  };
}

describe("screen Wake Lock controller", () => {
  it("requests while active and releases on terminal cleanup", async () => {
    const value = fixture();
    const controller = createScreenWakeLockController(value);
    controller.start();
    await deferredTick();
    expect(value.request).toHaveBeenCalledOnce();

    await controller.stop();
    expect(value.sentinels[0]?.release).toHaveBeenCalledOnce();
  });

  it("releases while hidden and reacquires when visible", async () => {
    const value = fixture();
    const controller = createScreenWakeLockController(value);
    controller.start();
    await deferredTick();

    value.setVisibility("hidden");
    await deferredTick();
    expect(value.sentinels[0]?.release).toHaveBeenCalledOnce();

    value.setVisibility("visible");
    await deferredTick();
    expect(value.request).toHaveBeenCalledTimes(2);
    await controller.stop();
  });

  it("reacquires when the browser releases a visible active lock", async () => {
    const value = fixture();
    const controller = createScreenWakeLockController(value);
    controller.start();
    await deferredTick();

    const first = value.sentinels[0];
    if (!first) throw new Error("Expected a Wake Lock sentinel.");
    first.released = true;
    first.releaseListener?.();
    await deferredTick();

    expect(value.request).toHaveBeenCalledTimes(2);
    await controller.stop();
  });

  it("continues normally when unsupported or denied", async () => {
    const unsupported = fixture();
    const unsupportedController = createScreenWakeLockController({ visibility: unsupported.visibility });
    unsupportedController.start();
    await unsupportedController.stop();

    const denied = fixture();
    denied.request.mockRejectedValueOnce(new Error("denied"));
    const deniedController = createScreenWakeLockController(denied);
    deniedController.start();
    await deferredTick();
    await expect(deniedController.stop()).resolves.toBeUndefined();
  });
});
