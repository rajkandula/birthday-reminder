export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.HARAKUMO_API_KEY) return;
  // In development, opt in explicitly so a local server doesn't send real emails by surprise.
  const enabled = process.env.NODE_ENV === "production" ? process.env.WISHLY_SCHEDULER !== "off" : process.env.WISHLY_SCHEDULER === "on";
  if (!enabled) return;

  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
