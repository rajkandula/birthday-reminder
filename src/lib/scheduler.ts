import { runDispatch } from "./dispatch";
import { hk } from "./server";

const INTERVAL_MS = 10 * 60 * 1000;

declare global {
  var __wishlyScheduler: ReturnType<typeof setInterval> | undefined;
}

/**
 * Checks for due birthdays every 10 minutes while the server is awake.
 * Hosts may put idle apps to sleep, so the /api/cron/dispatch endpoint (or the
 * Harakumo edge function) should also be pinged by an external scheduler.
 */
export function startScheduler(): void {
  if (globalThis.__wishlyScheduler) return;

  const tick = async () => {
    try {
      const summary = await runDispatch(hk());
      if (summary.sent || summary.failed) {
        console.log(`[wishly] dispatch: ${summary.sent} sent, ${summary.failed} failed`);
      }
    } catch (err) {
      console.error("[wishly] dispatch error", err);
    }
  };

  setTimeout(tick, 20_000).unref?.();
  globalThis.__wishlyScheduler = setInterval(tick, INTERVAL_MS);
  globalThis.__wishlyScheduler.unref?.();
}
