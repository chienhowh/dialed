export type WakeLockSentinelLike = {
  addEventListener(type: "release", listener: () => void): void;
  release(): Promise<void>;
  released: boolean;
};

type VisibilitySource = {
  addEventListener(type: "visibilitychange", listener: () => void): void;
  readonly visibilityState: DocumentVisibilityState;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

type WakeLockControllerOptions = {
  request?: () => Promise<WakeLockSentinelLike>;
  visibility: VisibilitySource;
};

export function createScreenWakeLockController({ request, visibility }: WakeLockControllerOptions) {
  let active = false;
  let acquiring = false;
  let sentinel: WakeLockSentinelLike | null = null;

  async function release() {
    const current = sentinel;
    sentinel = null;
    if (current && !current.released) {
      try {
        await current.release();
      } catch {
        // Wake Lock is progressive enhancement; release failures do not block brewing.
      }
    }
  }

  async function acquire() {
    if (!active || !request || acquiring || sentinel || visibility.visibilityState !== "visible") return;
    acquiring = true;
    try {
      const next = await request();
      if (!active || visibility.visibilityState !== "visible") {
        if (!next.released) await next.release();
        return;
      }
      sentinel = next;
      next.addEventListener("release", () => {
        if (sentinel === next) {
          sentinel = null;
          void acquire();
        }
      });
    } catch {
      // Unsupported/denied Wake Lock must never affect timer or brew controls.
    } finally {
      acquiring = false;
    }
  }

  function handleVisibilityChange() {
    if (visibility.visibilityState === "visible") {
      void acquire();
    } else {
      void release();
    }
  }

  return {
    start() {
      if (active) return;
      active = true;
      visibility.addEventListener("visibilitychange", handleVisibilityChange);
      void acquire();
    },
    async stop() {
      if (!active) return;
      active = false;
      visibility.removeEventListener("visibilitychange", handleVisibilityChange);
      await release();
    },
  };
}
