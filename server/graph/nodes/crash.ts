export function maybeCrash(nodeId: string): void {
  if (process.env.CRASH_ARMED === "1" && process.env.CRASH_AT === nodeId) {
    process.kill(process.pid, "SIGKILL");
  }
}
