import { useState, useEffect, useCallback } from 'preact/hooks';
import {
  MortgageInputs,
  ScenarioOverride,
  PaymentRow,
  generateAmortizationSchedule,
  calculateSummary,
  calculateMonthlyPayment,
  formatCurrency,
  formatCurrencyPrecise,
  formatDate,
  formatDuration,
} from './mortgage';

// Types for persisted state
interface Scenario {
  id: string;
  name: string;
  extraMonthlyPrincipal: number;
  lumpSumPayments: [number, number][]; // Serializable version of Map
}

interface AppState {
  principal: number;
  annualRate: number;
  termYears: number;
  startDate: string; // ISO string for serialization
  extraMonthlyPayment: number;
  scenarios: Scenario[];
}

const DEFAULT_STATE: AppState = {
  principal: 300000,
  annualRate: 6.5,
  termYears: 30,
  startDate: new Date().toISOString().slice(0, 7), // YYYY-MM format
  extraMonthlyPayment: 300, // taxes, insurance, etc.
  scenarios: [
    { id: 'base', name: 'Base', extraMonthlyPrincipal: 0, lumpSumPayments: [] },
  ],
};

const STORAGE_KEY = 'mortgage-explorer-state';

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as AppState;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return DEFAULT_STATE;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// Input component for cleaner forms
function LabeledInput({
  label,
  type = 'number',
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div class="input-group">
      <label>{label}</label>
      <div class="input-wrapper">
        {prefix && <span class="input-prefix">{prefix}</span>}
        <input
          type={type}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          min={min}
          max={max}
          step={step}
        />
        {suffix && <span class="input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

// Summary card component
function SummaryCard({
  scenario,
  schedule,
  baseSchedule,
  monthlyPayment,
  extraMonthlyPayment,
}: {
  scenario: Scenario;
  schedule: PaymentRow[];
  baseSchedule: PaymentRow[];
  monthlyPayment: number;
  extraMonthlyPayment: number;
}) {
  const summary = calculateSummary(schedule, scenario.id !== 'base' ? baseSchedule : undefined);
  const totalMonthly = monthlyPayment + scenario.extraMonthlyPrincipal + extraMonthlyPayment;

  return (
    <div class="summary-card">
      <h3>{scenario.name}</h3>
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-label">Monthly P&I</span>
          <span class="stat-value">{formatCurrency(monthlyPayment)}</span>
        </div>
        {scenario.extraMonthlyPrincipal > 0 && (
          <div class="stat">
            <span class="stat-label">Extra Principal</span>
            <span class="stat-value">+{formatCurrency(scenario.extraMonthlyPrincipal)}</span>
          </div>
        )}
        <div class="stat">
          <span class="stat-label">Total Monthly</span>
          <span class="stat-value">{formatCurrency(totalMonthly)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Total Interest</span>
          <span class="stat-value">{formatCurrency(summary.totalInterestPaid)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Time to Payoff</span>
          <span class="stat-value">{formatDuration(summary.monthsToPayoff)}</span>
        </div>
        {scenario.id !== 'base' && summary.interestSaved > 0 && (
          <>
            <div class="stat savings">
              <span class="stat-label">Interest Saved</span>
              <span class="stat-value">{formatCurrency(summary.interestSaved)}</span>
            </div>
            <div class="stat savings">
              <span class="stat-label">Time Saved</span>
              <span class="stat-value">{formatDuration(summary.monthsSaved)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Scenario column component
function ScenarioColumn({
  scenario,
  schedule,
  baseSchedule,
  monthlyPayment,
  extraMonthlyPayment,
  onUpdate,
  onRemove,
  canRemove,
}: {
  scenario: Scenario;
  schedule: PaymentRow[];
  baseSchedule: PaymentRow[];
  monthlyPayment: number;
  extraMonthlyPayment: number;
  onUpdate: (updated: Scenario) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [editingLumpSum, setEditingLumpSum] = useState<{ month: string; amount: string } | null>(null);

  const displayedSchedule = showAll ? schedule : schedule.slice(0, 12);

  const handleAddLumpSum = () => {
    setEditingLumpSum({ month: '1', amount: '10000' });
  };

  const handleSaveLumpSum = () => {
    if (!editingLumpSum) return;
    const month = parseInt(editingLumpSum.month) || 1;
    const amount = parseFloat(editingLumpSum.amount) || 0;
    const newLumpSums = [...scenario.lumpSumPayments.filter(([m]) => m !== month)];
    if (amount > 0) {
      newLumpSums.push([month, amount]);
    }
    newLumpSums.sort((a, b) => a[0] - b[0]);
    onUpdate({ ...scenario, lumpSumPayments: newLumpSums });
    setEditingLumpSum(null);
  };

  const handleRemoveLumpSum = (month: number) => {
    onUpdate({
      ...scenario,
      lumpSumPayments: scenario.lumpSumPayments.filter(([m]) => m !== month),
    });
  };

  return (
    <div class="scenario-column">
      <div class="scenario-header">
        <input
          type="text"
          class="scenario-name"
          value={scenario.name}
          onInput={(e) => onUpdate({ ...scenario, name: e.currentTarget.value })}
        />
        {canRemove && (
          <button class="btn-remove" onClick={onRemove} title="Remove scenario">
            ×
          </button>
        )}
      </div>

      <SummaryCard
        scenario={scenario}
        schedule={schedule}
        baseSchedule={baseSchedule}
        monthlyPayment={monthlyPayment}
        extraMonthlyPayment={extraMonthlyPayment}
      />

      {scenario.id !== 'base' && (
        <div class="scenario-controls">
          <LabeledInput
            label="Extra Monthly Principal"
            value={scenario.extraMonthlyPrincipal}
            onChange={(v) => onUpdate({ ...scenario, extraMonthlyPrincipal: parseFloat(v) || 0 })}
            min={0}
            step={50}
            prefix="$"
          />

          <div class="lump-sum-section">
            <div class="lump-sum-header">
              <span>Lump Sum Payments</span>
              <button class="btn-small" onClick={handleAddLumpSum}>+ Add</button>
            </div>

            {editingLumpSum && (
              <div class="lump-sum-editor">
                <div class="lump-sum-field">
                  <label>Month #</label>
                  <input
                    type="number"
                    value={editingLumpSum.month}
                    onInput={(e) => setEditingLumpSum({ ...editingLumpSum, month: e.currentTarget.value })}
                    min={1}
                    max={360}
                  />
                </div>
                <div class="lump-sum-field">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={editingLumpSum.amount}
                    onInput={(e) => setEditingLumpSum({ ...editingLumpSum, amount: e.currentTarget.value })}
                    min={0}
                    step={1000}
                  />
                </div>
                <div class="lump-sum-actions">
                  <button class="btn-small" onClick={handleSaveLumpSum}>Save</button>
                  <button class="btn-small" onClick={() => setEditingLumpSum(null)}>Cancel</button>
                </div>
              </div>
            )}

            {scenario.lumpSumPayments.length > 0 && (
              <ul class="lump-sum-list">
                {scenario.lumpSumPayments.map(([month, amount]) => (
                  <li key={month}>
                    Month {month}: {formatCurrency(amount)}
                    <button class="btn-tiny" onClick={() => handleRemoveLumpSum(month)}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div class="schedule-table-container">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Extra</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {displayedSchedule.map((row) => (
              <tr key={row.month} class={row.extraPayment > 0 ? 'has-extra' : ''}>
                <td>{row.month}</td>
                <td>{formatDate(row.date)}</td>
                <td>{formatCurrency(row.basePayment)}</td>
                <td>{row.extraPayment > 0 ? formatCurrency(row.extraPayment) : '—'}</td>
                <td>{formatCurrency(row.principalPaid)}</td>
                <td>{formatCurrency(row.interestPaid)}</td>
                <td>{formatCurrency(row.remainingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {schedule.length > 12 && (
          <button class="btn-show-more" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less' : `Show All ${schedule.length} Months`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Build mortgage inputs from state
  let parsedStartDate = new Date(state.startDate + '-01');
  // Check valid date AND format to prevent 'X-01' -> 2001 issue
  if (isNaN(parsedStartDate.getTime()) || !/^\d{4}-\d{2}$/.test(state.startDate)) {
    parsedStartDate = new Date();
    parsedStartDate.setDate(1);
  }

  const mortgageInputs: MortgageInputs = {
    principal: state.principal,
    annualRate: state.annualRate,
    termMonths: state.termYears * 12,
    startDate: parsedStartDate,
    extraMonthlyPayment: state.extraMonthlyPayment,
  };

  const monthlyPayment = calculateMonthlyPayment(
    mortgageInputs.principal,
    mortgageInputs.annualRate,
    mortgageInputs.termMonths
  );

  // Generate schedules for all scenarios
  const schedules = state.scenarios.map((scenario) => {
    const override: ScenarioOverride = {
      extraMonthlyPrincipal: scenario.extraMonthlyPrincipal,
      lumpSumPayments: new Map(scenario.lumpSumPayments),
    };
    return generateAmortizationSchedule(mortgageInputs, override);
  });

  const baseSchedule = schedules[0];

  const handleUpdateScenario = (index: number, updated: Scenario) => {
    const newScenarios = [...state.scenarios];
    newScenarios[index] = updated;
    updateState({ scenarios: newScenarios });
  };

  const handleRemoveScenario = (index: number) => {
    updateState({ scenarios: state.scenarios.filter((_, i) => i !== index) });
  };

  const handleAddScenario = () => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: `Scenario ${state.scenarios.length}`,
      extraMonthlyPrincipal: 200,
      lumpSumPayments: [],
    };
    updateState({ scenarios: [...state.scenarios, newScenario] });
  };

  const handleReset = () => {
    if (confirm('Reset all data to defaults?')) {
      setState(DEFAULT_STATE);
    }
  };

  return (
    <div class="app">
      <header>
        <h1>Mortgage Explorer</h1>
        <p class="subtitle">Compare payment scenarios and see the impact of extra payments</p>
      </header>

      <section class="mortgage-inputs">
        <h2>Mortgage Details</h2>
        <div class="inputs-grid">
          <LabeledInput
            label="Loan Amount"
            value={state.principal}
            onChange={(v) => updateState({ principal: parseFloat(v) || 0 })}
            min={0}
            step={10000}
            prefix="$"
          />
          <LabeledInput
            label="Interest Rate"
            value={state.annualRate}
            onChange={(v) => updateState({ annualRate: parseFloat(v) || 0 })}
            min={0}
            max={20}
            step={0.125}
            suffix="%"
          />
          <LabeledInput
            label="Loan Term"
            value={state.termYears}
            onChange={(v) => updateState({ termYears: parseInt(v) || 30 })}
            min={1}
            max={50}
            suffix="years"
          />
          <div class="input-group">
            <label>Start Date</label>
            <input
              type="month"
              value={state.startDate}
              placeholder="YYYY-MM"
              onInput={(e) => updateState({ startDate: e.currentTarget.value })}
            />
          </div>
          <LabeledInput
            label="Extra Monthly (Tax, Insurance, etc.)"
            value={state.extraMonthlyPayment}
            onChange={(v) => updateState({ extraMonthlyPayment: parseFloat(v) || 0 })}
            min={0}
            step={50}
            prefix="$"
          />
        </div>

        <div class="quick-stats">
          <span>Base Monthly P&I: <strong>{formatCurrencyPrecise(monthlyPayment)}</strong></span>
          <span>Total Monthly: <strong>{formatCurrencyPrecise(monthlyPayment + state.extraMonthlyPayment)}</strong></span>
        </div>
      </section>

      <section class="scenarios">
        <div class="scenarios-header">
          <h2>Payment Scenarios</h2>
          <div class="scenarios-actions">
            <button class="btn-add" onClick={handleAddScenario}>+ Add Scenario</button>
            <button class="btn-reset" onClick={handleReset}>Reset All</button>
          </div>
        </div>

        <div class="scenarios-grid">
          {state.scenarios.map((scenario, index) => (
            <ScenarioColumn
              key={scenario.id}
              scenario={scenario}
              schedule={schedules[index]}
              baseSchedule={baseSchedule}
              monthlyPayment={monthlyPayment}
              extraMonthlyPayment={state.extraMonthlyPayment}
              onUpdate={(updated) => handleUpdateScenario(index, updated)}
              onRemove={() => handleRemoveScenario(index)}
              canRemove={index > 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
