export function exitNotImplemented(phase: string, script: string): void {
  console.error(`[${script}] Not implemented yet (phase ${phase}).`);
  process.exit(1);
}
