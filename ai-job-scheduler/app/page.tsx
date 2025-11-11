'use client';

import type { InputHTMLAttributes } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { predictForProcesses } from '../lib/ml';
import { starterProcesses } from '../lib/mockData';
import { runSchedulers } from '../lib/schedulers';
import {
  PredictedAttributes,
  ProcessInput,
  SCHEDULER_LABELS,
  SchedulerKey,
  SchedulingResult
} from '../lib/types';

const schedulerOrder: SchedulerKey[] = ['hybridAi', 'fcfs', 'sjf', 'rr', 'priority'];

const defaultProcess: ProcessInput = {
  id: 'p-new',
  arrivalTime: 0,
  burstTime: 6,
  priority: 3,
  cpuUtilizationHint: 0.6,
  ioBoundProbability: 0.5
};

const badgeColors: Record<SchedulerKey, string> = {
  hybridAi: 'from-brand-400/80 to-emerald-400/80 text-slate-950',
  fcfs: 'from-slate-600/90 to-slate-700/70 text-slate-200',
  sjf: 'from-sky-500/80 to-cyan-400/80 text-slate-950',
  rr: 'from-violet-500/80 to-fuchsia-400/80 text-slate-950',
  priority: 'from-amber-400/80 to-orange-500/80 text-slate-950'
};

const metricLabels: Array<{ key: keyof SchedulingResult['summary']; label: string; unit?: string }> = [
  { key: 'cpuUtilization', label: 'CPU Utilization', unit: '%' },
  { key: 'throughput', label: 'Throughput', unit: ' jobs/unit' },
  { key: 'averageWaitingTime', label: 'Avg. Waiting', unit: ' units' },
  { key: 'averageTurnaroundTime', label: 'Avg. Turnaround', unit: ' units' },
  { key: 'averageResponseTime', label: 'Avg. Response', unit: ' units' }
];

const formatNumber = (value: number, fractionDigits = 2) =>
  Number.isFinite(value) ? value.toFixed(fractionDigits) : '0.00';

const getBarColor = (algorithm: SchedulerKey) => {
  switch (algorithm) {
    case 'hybridAi':
      return 'bg-gradient-to-r from-emerald-400 via-brand-500 to-sky-400';
    case 'fcfs':
      return 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600';
    case 'sjf':
      return 'bg-gradient-to-r from-cyan-300 via-sky-400 to-cyan-500';
    case 'rr':
      return 'bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-500';
    case 'priority':
      return 'bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500';
    default:
      return 'bg-slate-500';
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const generateProcessId = (existing: ProcessInput[]) => {
  let idx = existing.length + 1;
  while (existing.some((proc) => proc.id === `p${idx}`)) {
    idx += 1;
  }
  return `p${idx}`;
};

const numericInput = (
  value: number,
  onChange: (value: number) => void,
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> = {}
) => (
  <input
    type="number"
    value={value}
    onChange={(event) => onChange(Number(event.target.value))}
    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
    {...props}
  />
);

const ProcessTable = ({
  processes,
  onProcessChange,
  onRemove
}: {
  processes: ProcessInput[];
  onProcessChange: (index: number, field: keyof ProcessInput, value: number) => void;
  onRemove: (id: string) => void;
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/50">
    <table className="min-w-full divide-y divide-slate-800/80 text-sm">
      <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
        <tr>
          <th className="px-4 py-3 text-left">ID</th>
          <th className="px-4 py-3 text-left">Arrival</th>
          <th className="px-4 py-3 text-left">Burst (Estimate)</th>
          <th className="px-4 py-3 text-left">Priority</th>
          <th className="px-4 py-3 text-left">CPU</th>
          <th className="px-4 py-3 text-left">I/O</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/60">
        {processes.map((process, index) => (
          <tr key={process.id} className="transition hover:bg-slate-800/40">
            <td className="px-4 py-3 font-semibold text-slate-200">{process.id}</td>
            <td className="px-4 py-3 text-slate-100">
              {numericInput(process.arrivalTime, (value) => onProcessChange(index, 'arrivalTime', value), {
                min: 0,
                step: 1
              })}
            </td>
            <td className="px-4 py-3 text-slate-100">
              {numericInput(process.burstTime, (value) => onProcessChange(index, 'burstTime', clamp(value, 1, 60)), {
                min: 1,
                step: 1
              })}
            </td>
            <td className="px-4 py-3 text-slate-100">
              {numericInput(process.priority, (value) => onProcessChange(index, 'priority', clamp(value, 1, 10)), {
                min: 1,
                max: 10,
                step: 1
              })}
            </td>
            <td className="px-4 py-3 text-slate-100">
              {numericInput(
                process.cpuUtilizationHint ?? 0.6,
                (value) => onProcessChange(index, 'cpuUtilizationHint', clamp(value, 0, 1)),
                {
                  min: 0,
                  max: 1,
                  step: 0.01
                }
              )}
            </td>
            <td className="px-4 py-3 text-slate-100">
              {numericInput(
                process.ioBoundProbability ?? 0.5,
                (value) => onProcessChange(index, 'ioBoundProbability', clamp(value, 0, 1)),
                {
                  min: 0,
                  max: 1,
                  step: 0.01
                }
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => onRemove(process.id)}
                className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300 transition hover:border-red-400 hover:bg-red-500/20"
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PredictionsGrid = ({
  predictions
}: {
  predictions: Record<string, PredictedAttributes>;
}) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Object.entries(predictions).map(([id, prediction]) => (
      <div
        key={id}
        className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-inner shadow-slate-900/60"
      >
        <div className="flex items-center justify-between pb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{id}</span>
          <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            {(prediction.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-slate-400">Predicted Burst</dt>
            <dd className="text-base font-semibold text-slate-100">{prediction.predictedBurstTime.toFixed(2)} units</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-slate-400">Predicted Priority</dt>
            <dd className="text-base font-semibold text-amber-300">{prediction.predictedPriority}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-slate-400">Suggested Quantum</dt>
            <dd className="text-base font-semibold text-cyan-300">{prediction.predictedQuantum.toFixed(2)}</dd>
          </div>
        </dl>
      </div>
    ))}
  </div>
);

const TimelineRow = ({ result }: { result: SchedulingResult }) => {
  const totalTime = Math.max(...result.processes.map((process) => process.finishTime), 1);
  return (
    <div className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Timeline</span>
        <span className="text-xs text-slate-400">Total span: {formatNumber(totalTime)} units</span>
      </div>
      <div className="space-y-2">
        {result.processes.map((process) => {
          const slices = process.sliceHistory?.length
            ? process.sliceHistory
            : [
                {
                  start: process.startTime,
                  end: process.finishTime
                }
              ];

          return (
            <div key={process.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{process.id}</span>
                <span>
                  start {formatNumber(process.startTime, 2)} · finish {formatNumber(process.finishTime, 2)}
                </span>
              </div>
              <div className="relative h-6 overflow-hidden rounded-lg bg-slate-800/60">
                {slices.map((slice, index) => {
                  const width = ((slice.end - slice.start) / totalTime) * 100;
                  const left = (slice.start / totalTime) * 100;
                  return (
                    <span
                      key={`${process.id}-${index}`}
                      className={`${getBarColor(result.algorithm)} absolute h-full rounded-md border border-white/10`}
                      style={{
                        width: `${width}%`,
                        left: `${left}%`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MetricsGrid = ({ result }: { result: SchedulingResult }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    {metricLabels.map((metric) => (
      <div
        key={metric.key}
        className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 shadow-inner shadow-slate-900/50"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {metric.label}
        </span>
        <h3 className="mt-3 text-2xl font-semibold text-slate-100">
          {formatNumber(result.summary[metric.key])}
          {metric.unit ? <span className="ml-1 text-sm text-slate-400">{metric.unit}</span> : null}
        </h3>
      </div>
    ))}
  </div>
);

const SchedulerResultCard = ({ result }: { result: SchedulingResult }) => (
  <div className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <span
          className={`inline-flex items-center rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeColors[result.algorithm]}`}
        >
          {SCHEDULER_LABELS[result.algorithm]}
        </span>
        <p className="mt-3 max-w-lg text-sm text-slate-300">
          {result.algorithm === 'hybridAi'
            ? 'Adaptive quantum scheduling guided by ML predictions to minimize waiting time and boost CPU utilization.'
            : result.algorithm === 'rr'
              ? 'Preemptive time slicing with fair sharing and ML-informed quantum suggestions.'
              : result.algorithm === 'sjf'
                ? 'Greedy selection of the shortest jobs to minimize average waiting time.'
                : result.algorithm === 'priority'
                  ? 'Priority-ordered execution emphasizing critical workloads and deterministic ordering.'
                  : 'Deterministic arrival ordering for workloads requiring strict fairness and ordering guarantees.'}
        </p>
      </div>
      <div className="text-right">
        <span className="text-xs uppercase tracking-wide text-slate-400">Total Execution</span>
        <p className="text-3xl font-semibold text-slate-100">
          {formatNumber(result.summary.totalExecutionTime)}
          <span className="ml-1 text-sm text-slate-400">units</span>
        </p>
      </div>
    </div>
    <MetricsGrid result={result} />
    <TimelineRow result={result} />
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4">
      <table className="w-full text-xs">
        <thead className="text-slate-400">
          <tr>
            <th className="pb-2 text-left font-medium">Process</th>
            <th className="pb-2 text-right font-medium">Waiting</th>
            <th className="pb-2 text-right font-medium">Response</th>
            <th className="pb-2 text-right font-medium">Turnaround</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-200">
          {result.processes.map((process) => (
            <tr key={process.id} className="odd:bg-slate-900/40">
              <td className="py-2 text-left font-semibold">{process.id}</td>
              <td className="py-2 text-right">{formatNumber(process.waitingTime)}</td>
              <td className="py-2 text-right">{formatNumber(process.responseTime)}</td>
              <td className="py-2 text-right">{formatNumber(process.turnaroundTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function HomePage() {
  const [processes, setProcesses] = useState<ProcessInput[]>(starterProcesses);
  const [quantum, setQuantum] = useState<number>(3);

  const handleProcessChange = useCallback(
    (index: number, field: keyof ProcessInput, value: number) => {
      setProcesses((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          [field]: value
        } as ProcessInput;
        return next;
      });
    },
    []
  );

  const handleRemoveProcess = useCallback((id: string) => {
    setProcesses((prev) => prev.filter((process) => process.id !== id));
  }, []);

  const addProcess = useCallback(() => {
    setProcesses((prev) => {
      const id = generateProcessId(prev);
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          ...defaultProcess,
          id,
          arrivalTime: (last?.arrivalTime ?? defaultProcess.arrivalTime) + 1,
          burstTime: last?.burstTime ?? defaultProcess.burstTime,
          priority: clamp(last?.priority ?? defaultProcess.priority, 1, 10),
          cpuUtilizationHint: clamp(
            last?.cpuUtilizationHint ?? defaultProcess.cpuUtilizationHint ?? 0.6,
            0,
            1
          ),
          ioBoundProbability: clamp(
            last?.ioBoundProbability ?? defaultProcess.ioBoundProbability ?? 0.5,
            0,
            1
          )
        }
      ];
    });
  }, []);

  const resetToStarter = useCallback(() => {
    setProcesses(starterProcesses.map((proc) => ({ ...proc })));
  }, []);

  const predictions = useMemo(() => predictForProcesses(processes), [processes]);

  const results = useMemo(
    () =>
      runSchedulers({
        processes,
        quantum,
        predictions
      }),
    [processes, quantum, predictions]
  );

  const hybridResult = results.find((result) => result.algorithm === 'hybridAi');
  const bestCpu =
    results.length > 0
      ? results.reduce((best, current) =>
          current.summary.cpuUtilization > best.summary.cpuUtilization ? current : best
        )
      : null;

  const waitingChampion =
    results.length > 0
      ? results.reduce((best, current) =>
          current.summary.averageWaitingTime < best.summary.averageWaitingTime ? current : best
        )
      : null;

  return (
    <main className="pb-16">
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <header className="mb-12 max-w-4xl space-y-6">
          <span className="inline-flex items-center rounded-full bg-slate-800/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-200">
            Intelligent Scheduler
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Adaptive job scheduling with ML-guided insights
          </h1>
          <p className="text-lg text-slate-300">
            Combine deterministic operating system schedulers with a Random Forest inference engine
            that learns workload patterns and predicts optimal execution parameters in real time.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={addProcess}
              className="rounded-xl bg-gradient-to-r from-brand-500 via-sky-500 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/20 transition hover:shadow-brand-500/30"
            >
              Add Process
            </button>
            <button
              type="button"
              onClick={resetToStarter}
              className="rounded-xl border border-slate-700/80 bg-slate-900/50 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
            >
              Reset Sample Dataset
            </button>
          </div>
        </header>

        <section className="mb-14 space-y-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Workload Designer</h2>
              <p className="text-sm text-slate-400">
                Adjust arrival, burst, and priority features. AI models continuously learn from historical workloads and update predictions instantly.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <label htmlFor="quantum" className="text-xs uppercase tracking-wide text-slate-400">
                Base Quantum
              </label>
              <input
                id="quantum"
                type="number"
                min={1}
                step={0.5}
                value={quantum}
                onChange={(event) => setQuantum(clamp(Number(event.target.value), 0.5, 20))}
                className="w-24 rounded-lg border border-brand-400/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>

          <ProcessTable
            processes={processes}
            onProcessChange={handleProcessChange}
            onRemove={handleRemoveProcess}
          />
        </section>

        <section className="mb-14 space-y-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">AI Insights</h2>
              <p className="text-sm text-slate-400">
                Random Forest regression forecasts execution time while a classifier estimates optimal priority tiers and preemptive quanta.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Real-time inference
            </div>
          </div>
          <PredictionsGrid predictions={predictions} />
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-xl shadow-black/30">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Scheduling Outcomes</h2>
              <p className="text-sm text-slate-400">
                Compare deterministic schedulers against the AI-assisted hybrid strategy. Metrics update as workload attributes evolve.
              </p>
            </div>
            {hybridResult ? (
              <div className="flex flex-col items-end text-xs text-slate-300">
                <span className="font-semibold uppercase tracking-wide text-emerald-300">Recommended</span>
                <span>
                  Highest CPU utilization · {formatNumber(hybridResult.summary.cpuUtilization)}%
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {schedulerOrder
              .map((algorithm) => results.find((result) => result.algorithm === algorithm))
              .filter((result): result is SchedulingResult => Boolean(result))
              .map((result) => (
                <SchedulerResultCard key={result.algorithm} result={result} />
              ))}
          </div>

          {bestCpu && waitingChampion ? (
            <div className="grid gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-6 text-sm text-slate-200 sm:grid-cols-3">
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  CPU Efficiency Leader
                </span>
                <p className="mt-1 text-lg font-semibold text-emerald-300">
                  {SCHEDULER_LABELS[bestCpu.algorithm]} ·{' '}
                  {formatNumber(bestCpu.summary.cpuUtilization)}%
                </p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Waiting Time Leader
                </span>
                <p className="mt-1 text-lg font-semibold text-sky-300">
                  {SCHEDULER_LABELS[waitingChampion.algorithm]} ·{' '}
                  {formatNumber(waitingChampion.summary.averageWaitingTime)} units
                </p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Processes Scheduled
                </span>
                <p className="mt-1 text-lg font-semibold text-slate-100">{processes.length}</p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
