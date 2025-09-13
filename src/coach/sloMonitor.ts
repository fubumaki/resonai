// src/coach/sloMonitor.ts
// Quantitative acceptance criteria and monitoring for coach system

import { CoachHint } from './types';

export interface SLOMetrics {
  hintCadence: number;           // hints per second
  duplicateHints: number;        // duplicate hint IDs within 4s
  safetyResponseTime: number;    // ms to safety hint after threshold
  praiseRate: number;            // % of tier≥4 attempts that get praise
  environmentBannerCount: number; // count of isolation banners per step
}

export class SLOMonitor {
  private hintTimes: number[] = [];
  private hintIds: string[] = [];
  private safetyThresholdCrossed = 0;
  private safetyHintGenerated = 0;
  private phraseAttempts: Array<{ tier: number; gotPraise: boolean }> = [];
  private environmentBanners: number = 0;
  private currentStep = '';

  /**
   * Record a hint generation
   */
  recordHint(hint: CoachHint, stepId: string): void {
    const now = performance.now();
    
    // Track hint cadence
    this.hintTimes.push(now);
    this.hintIds.push(hint.id);
    
    // Keep only last 10 seconds of data
    const cutoff = now - 10000;
    this.hintTimes = this.hintTimes.filter(t => t > cutoff);
    this.hintIds = this.hintIds.slice(-this.hintTimes.length);
    
    // Track safety response time
    if (hint.id === 'tooLoud' && this.safetyThresholdCrossed > 0) {
      this.safetyHintGenerated = now;
    }
    
    // Track environment banners
    if (hint.id === 'isolation-dropped' && stepId !== this.currentStep) {
      this.environmentBanners++;
      this.currentStep = stepId;
    }
  }

  /**
   * Record safety threshold crossing
   */
  recordSafetyThreshold(): void {
    this.safetyThresholdCrossed = performance.now();
  }

  /**
   * Record phrase attempt result
   */
  recordPhraseAttempt(tier: number, gotPraise: boolean): void {
    this.phraseAttempts.push({ tier, gotPraise });
    
    // Keep only last 100 attempts
    if (this.phraseAttempts.length > 100) {
      this.phraseAttempts = this.phraseAttempts.slice(-100);
    }
  }

  /**
   * Get current SLO metrics
   */
  getMetrics(): SLOMetrics {
    
    // Calculate hint cadence (P95)
    const hintCadence = this.calculateHintCadence();
    
    // Calculate duplicate hints within 4s
    const duplicateHints = this.calculateDuplicateHints();
    
    // Calculate safety response time
    const safetyResponseTime = this.calculateSafetyResponseTime();
    
    // Calculate praise rate for tier≥4
    const praiseRate = this.calculatePraiseRate();
    
    return {
      hintCadence,
      duplicateHints,
      safetyResponseTime,
      praiseRate,
      environmentBannerCount: this.environmentBanners
    };
  }

  /**
   * Check if SLOs are being met
   */
  checkSLOs(): { passed: boolean; violations: string[] } {
    const metrics = this.getMetrics();
    const violations: string[] = [];
    
    // P95 hint cadence ≤ 1.0/s
    if (metrics.hintCadence > 1.0) {
      violations.push(`Hint cadence ${metrics.hintCadence.toFixed(2)}/s exceeds 1.0/s limit`);
    }
    
    // 0 duplicate IDs within 4s
    if (metrics.duplicateHints > 0) {
      violations.push(`${metrics.duplicateHints} duplicate hint IDs within 4s`);
    }
    
    // Safety hint appears within ≤ 500ms after threshold
    if (metrics.safetyResponseTime > 500) {
      violations.push(`Safety response time ${metrics.safetyResponseTime}ms exceeds 500ms limit`);
    }
    
    // 100% of tier≥4 attempts get praise
    if (metrics.praiseRate < 1.0) {
      violations.push(`Praise rate ${(metrics.praiseRate * 100).toFixed(1)}% below 100% for tier≥4`);
    }
    
    // Exactly one banner per step when isolation drops
    if (metrics.environmentBannerCount > 1) {
      violations.push(`${metrics.environmentBannerCount} environment banners per step exceeds 1`);
    }
    
    return {
      passed: violations.length === 0,
      violations
    };
  }

  private calculateHintCadence(): number {
    if (this.hintTimes.length < 2) return 0;
    
    const now = performance.now();
    const recentHints = this.hintTimes.filter(t => t > now - 10000); // Last 10 seconds
    
    if (recentHints.length < 2) return 0;
    
    const timeSpan = recentHints[recentHints.length - 1] - recentHints[0];
    const hintsPerSecond = (recentHints.length - 1) / (timeSpan / 1000);
    
    return hintsPerSecond;
  }

  private calculateDuplicateHints(): number {
    if (this.hintIds.length < 2) return 0;
    
    let duplicates = 0;
    
    for (let i = 1; i < this.hintIds.length; i++) {
      const timeDiff = this.hintTimes[i] - this.hintTimes[i - 1];
      if (timeDiff < 4000 && this.hintIds[i] === this.hintIds[i - 1]) {
        duplicates++;
      }
    }
    
    return duplicates;
  }

  private calculateSafetyResponseTime(): number {
    if (this.safetyThresholdCrossed === 0 || this.safetyHintGenerated === 0) {
      return 0;
    }
    
    return this.safetyHintGenerated - this.safetyThresholdCrossed;
  }

  private calculatePraiseRate(): number {
    const tier4Plus = this.phraseAttempts.filter(a => a.tier >= 4);
    if (tier4Plus.length === 0) return 1.0;
    
    const praised = tier4Plus.filter(a => a.gotPraise).length;
    return praised / tier4Plus.length;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.hintTimes = [];
    this.hintIds = [];
    this.safetyThresholdCrossed = 0;
    this.safetyHintGenerated = 0;
    this.phraseAttempts = [];
    this.environmentBanners = 0;
    this.currentStep = '';
  }

  /**
   * Get metrics summary for display
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    const sloCheck = this.checkSLOs();
    
    return `
SLO Metrics Summary:
• Hint Cadence: ${metrics.hintCadence.toFixed(2)}/s (limit: 1.0/s)
• Duplicate Hints: ${metrics.duplicateHints} (limit: 0)
• Safety Response: ${metrics.safetyResponseTime}ms (limit: 500ms)
• Praise Rate: ${(metrics.praiseRate * 100).toFixed(1)}% (limit: 100%)
• Environment Banners: ${metrics.environmentBannerCount} (limit: 1/step)

Status: ${sloCheck.passed ? '✅ PASSING' : '❌ FAILING'}
${sloCheck.violations.length > 0 ? 'Violations:\n' + sloCheck.violations.map(v => '• ' + v).join('\n') : ''}
    `.trim();
  }
}

// Export singleton instance
export const sloMonitor = new SLOMonitor();
