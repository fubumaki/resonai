import { Smoother } from '../types';

export default class MedianFilter implements Smoother {
  private readonly win: number;
  private buf: (number | null)[] = [];
  
  constructor(windowSize: number) {
    if (windowSize < 1 || windowSize % 2 === 0) throw new Error('MedianFilter window must be odd >=1');
    this.win = windowSize;
  }
  
  reset() { 
    this.buf = []; 
  }
  
  update(pitchHz: number | null): number | null {
    this.buf.push(pitchHz);
    if (this.buf.length > this.win) this.buf.shift();
    
    // Return current median (ignore nulls); if no voiced values, return null
    const vals = this.buf.filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    
    const sorted = vals.slice().sort((a, b) => a - b);
    const mid = (sorted.length - 1) >> 1;
    return sorted[mid];
  }
}
