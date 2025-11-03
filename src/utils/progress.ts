/**
 * Progress indicator utilities
 */

export interface ProgressOptions {
  total: number;
  interval?: number; // Update interval in ms
  onProgress?: (current: number, total: number, percent: number) => void;
}

export class ProgressIndicator {
  private current = 0;
  private total: number;
  private interval: number;
  private onProgress?: (current: number, total: number, percent: number) => void;
  private startTime: number;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.interval = options.interval || 100;
    this.onProgress = options.onProgress;
    this.startTime = Date.now();
  }

  increment(by = 1): void {
    this.current += by;
    this.update();
  }

  set(current: number): void {
    this.current = current;
    this.update();
  }

  complete(): void {
    this.current = this.total;
    this.update();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`\n✓ Completed in ${elapsed}s\n`);
  }

  private update(): void {
    const percent = Math.round((this.current / this.total) * 100);
    const barLength = 30;
    const filled = Math.round((percent / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    process.stdout.write(`\r[${bar}] ${percent}% (${this.current}/${this.total})`);

    if (this.onProgress) {
      this.onProgress(this.current, this.total, percent);
    }
  }
}

/**
 * Create a simple progress indicator
 */
export function createProgress(total: number): ProgressIndicator {
  return new ProgressIndicator({ total });
}

/**
 * Create progress with callback
 */
export function createProgressWithCallback(
  total: number,
  onProgress: (current: number, total: number, percent: number) => void
): ProgressIndicator {
  return new ProgressIndicator({ total, onProgress });
}

