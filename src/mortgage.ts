// Mortgage calculation utilities

export interface MortgageInputs {
  principal: number;        // Loan amount
  annualRate: number;       // Annual interest rate as percentage (e.g., 6.5)
  termMonths: number;       // Loan term in months (e.g., 360 for 30 years)
  startDate: Date;          // When the mortgage starts
  extraMonthlyPayment: number; // Additional fixed costs (taxes, insurance, etc.)
}

export interface PaymentRow {
  month: number;
  date: Date;
  basePayment: number;      // Standard P&I payment
  extraPayment: number;     // One-time extra payment toward principal
  totalPayment: number;     // Total including extra costs
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface ScenarioOverride {
  extraMonthlyPrincipal: number;  // Extra principal paid every month
  lumpSumPayments: Map<number, number>; // Month -> lump sum amount
}

export interface ScenarioSummary {
  totalInterestPaid: number;
  totalPaid: number;
  monthsToPayoff: number;
  interestSaved: number;    // Compared to base scenario
  monthsSaved: number;      // Compared to base scenario
}

/**
 * Calculate the standard monthly payment (principal + interest only)
 */
export function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;

  return principal * (numerator / denominator);
}

/**
 * Generate full amortization schedule with optional scenario overrides
 */
export function generateAmortizationSchedule(
  inputs: MortgageInputs,
  overrides?: ScenarioOverride
): PaymentRow[] {
  const { principal, annualRate, termMonths, startDate, extraMonthlyPayment } = inputs;
  const monthlyRate = annualRate / 100 / 12;
  const basePayment = calculateMonthlyPayment(principal, annualRate, termMonths);

  const schedule: PaymentRow[] = [];
  let remainingBalance = principal;

  for (let month = 1; month <= termMonths && remainingBalance > 0.01; month++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month - 1);

    // Calculate interest for this month
    const interestPaid = remainingBalance * monthlyRate;

    // Base principal payment
    let principalPaid = basePayment - interestPaid;

    // Add extra monthly principal if scenario has it
    const extraMonthlyPrincipal = overrides?.extraMonthlyPrincipal ?? 0;

    // Check for lump sum payment this month
    const lumpSum = overrides?.lumpSumPayments?.get(month) ?? 0;

    // Total extra payment toward principal
    const extraPayment = extraMonthlyPrincipal + lumpSum;

    // Ensure we don't overpay
    const maxPrincipal = remainingBalance;
    principalPaid = Math.min(principalPaid + extraPayment, maxPrincipal);

    // Actual extra payment used (might be less if we're paying off)
    const actualExtra = principalPaid - (basePayment - interestPaid);

    remainingBalance -= principalPaid;

    // Total payment including fixed extra costs (taxes, insurance)
    const totalPayment = basePayment + actualExtra + extraMonthlyPayment;

    schedule.push({
      month,
      date,
      basePayment,
      extraPayment: actualExtra,
      totalPayment,
      principalPaid,
      interestPaid,
      remainingBalance: Math.max(0, remainingBalance),
    });

    // Stop if paid off early
    if (remainingBalance <= 0.01) break;
  }

  return schedule;
}

/**
 * Calculate summary statistics for a payment schedule
 */
export function calculateSummary(
  schedule: PaymentRow[],
  baseSchedule?: PaymentRow[]
): ScenarioSummary {
  const totalInterestPaid = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const totalPaid = schedule.reduce((sum, row) => sum + row.totalPayment, 0);
  const monthsToPayoff = schedule.length;

  let interestSaved = 0;
  let monthsSaved = 0;

  if (baseSchedule) {
    const baseInterest = baseSchedule.reduce((sum, row) => sum + row.interestPaid, 0);
    interestSaved = baseInterest - totalInterestPaid;
    monthsSaved = baseSchedule.length - monthsToPayoff;
  }

  return {
    totalInterestPaid,
    totalPaid,
    monthsToPayoff,
    interestSaved,
    monthsSaved,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency with cents
 */
export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Format months as years and months
 */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${years}y ${remainingMonths}m`;
}
