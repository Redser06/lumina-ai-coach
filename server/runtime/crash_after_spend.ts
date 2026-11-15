/** Armed only by the spend-crash child. Production runs leave the variable unset. */
export function crashAfterSpend(): void {
  if (process.env.CRASH_AFTER_SPEND === "1") {
    process.kill(process.pid, "SIGKILL");
  }
}
