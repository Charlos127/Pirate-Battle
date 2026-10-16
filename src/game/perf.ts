export class PerfProbe {
  private deltas: number[] = [];
  private last = performance.now();
  maxEntities = 0;
  sample(entities: number) {
    const now = performance.now();
    this.deltas.push(now - this.last);
    this.last = now;
    this.maxEntities = Math.max(this.maxEntities, entities);
  }
  report() {
    const d = [...this.deltas].sort((a, b) => a - b);
    const avg = d.reduce((a, b) => a + b, 0) / d.length;
    return {
      frames: d.length,
      avgFps: +(1000 / avg).toFixed(1),
      p95FrameMs: +d[Math.floor(d.length * 0.95)]!.toFixed(2),
      maxEntities: this.maxEntities,
    };
  }
}
