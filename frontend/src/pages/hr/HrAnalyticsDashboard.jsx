import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { getFunnelData, getTimeToHire, getDepartmentSummary, queryAnalytics } from '../../api/aiAnalytics';

/**
 * HrAnalyticsDashboard — AI-powered recruitment analytics with interactive charts.
 *
 * Features:
 *  - Recruitment Funnel (bar chart)
 *  - Time-to-Hire trends (area chart)
 *  - Department breakdown (bar chart)
 *  - Natural language AI query with dynamic chart rendering
 */

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-ink dark:text-ink-dark mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Chart Card Wrapper ──────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, loading }) => (
  <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-card shadow-card p-6 transition-all duration-300 hover:shadow-lg">
    <div className="mb-4">
      <h3 className="text-lg font-display font-bold text-ink dark:text-ink-dark">{title}</h3>
      {subtitle && <p className="text-xs text-muted dark:text-muted-dark mt-1">{subtitle}</p>}
    </div>
    {loading ? (
      <div className="h-64 flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-brand rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2.5 h-2.5 bg-brand rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2.5 h-2.5 bg-brand rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    ) : (
      children
    )}
  </div>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-card shadow-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted dark:text-muted-dark uppercase tracking-wider font-medium">{label}</p>
        <p className="text-3xl font-display font-bold text-ink dark:text-ink-dark mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-xl`}>
        {icon}
      </div>
    </div>
  </div>
);

// ─── Funnel Stage Colors ─────────────────────────────────────────────────────
const FUNNEL_COLORS = {
  'Applied': '#3454D1',
  'Shortlisted': '#F2A93B',
  'Interview Scheduled': '#8B5CF6',
  'Selected': '#2E8B57',
  'Rejected': '#C1502E',
  'Offer Released': '#06B6D4',
};

const HrAnalyticsDashboard = () => {
  const [funnelData, setFunnelData] = useState([]);
  const [timeToHireData, setTimeToHireData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [loadingFunnel, setLoadingFunnel] = useState(true);
  const [loadingTTH, setLoadingTTH] = useState(true);
  const [loadingDept, setLoadingDept] = useState(true);

  // AI Query state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ─── Load dashboard data ──────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const funnel = await getFunnelData();
        setFunnelData(funnel.data || []);
      } catch (err) {
        console.warn('[analytics] funnel fetch failed:', err.message);
      } finally {
        setLoadingFunnel(false);
      }

      try {
        const tth = await getTimeToHire();
        setTimeToHireData(tth.data || []);
      } catch (err) {
        console.warn('[analytics] time-to-hire fetch failed:', err.message);
      } finally {
        setLoadingTTH(false);
      }

      try {
        const dept = await getDepartmentSummary();
        setDeptData(dept.data || []);
      } catch (err) {
        console.warn('[analytics] department summary failed:', err.message);
      } finally {
        setLoadingDept(false);
      }
    };

    loadData();
  }, []);

  // ─── AI Query Handler ─────────────────────────────────────────────────────
  const handleAiQuery = useCallback(async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const result = await queryAnalytics(aiQuestion.trim());
      setAiResult(result);
    } catch (err) {
      setAiResult({
        answer: `Query failed: ${err.response?.data?.message || err.message}`,
        chartData: [],
        chartType: 'bar',
        fallback: true,
      });
    } finally {
      setAiLoading(false);
    }
  }, [aiQuestion, aiLoading]);

  // ─── Compute summary stats from funnel data ──────────────────────────────
  const totalApplications = funnelData.reduce((sum, s) => sum + (s.count || 0), 0);
  const totalSelected = funnelData.find((s) => s.stage === 'Selected')?.count || 0;
  const totalInterviewed = funnelData.find((s) => s.stage === 'Interview Scheduled')?.count || 0;
  const avgTimeToHire = timeToHireData.length
    ? Math.round(timeToHireData.reduce((sum, d) => sum + d.avgDays, 0) / timeToHireData.length)
    : 0;

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-ink dark:text-ink-dark">AI Analytics Dashboard</h1>
              <p className="text-sm text-muted dark:text-muted-dark">Recruitment insights powered by AI</p>
            </div>
          </div>
        </div>

        {/* ─── Summary Stats Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Applications" value={totalApplications} icon="📋" color="bg-brand/10" />
          <StatCard label="Interviews Scheduled" value={totalInterviewed} icon="🎯" color="bg-purple-500/10" />
          <StatCard label="Selected" value={totalSelected} icon="✅" color="bg-emerald-500/10" />
          <StatCard label="Avg. Time-to-Hire" value={`${avgTimeToHire}d`} icon="⏱️" color="bg-amber-500/10" />
        </div>

        {/* ─── Charts Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recruitment Funnel */}
          <ChartCard title="Recruitment Funnel" subtitle="Application stage progression" loading={loadingFunnel}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E5EA)" opacity={0.4} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Applications"
                  radius={[6, 6, 0, 0]}
                  fill="#3454D1"
                  // Color each bar by stage
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const fill = FUNNEL_COLORS[payload.stage] || '#3454D1';
                    return <rect x={x} y={y} width={width} height={height} rx={6} ry={6} fill={fill} />;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Time-to-Hire Trend */}
          <ChartCard title="Time-to-Hire Trend" subtitle="Average days from application to offer (by month)" loading={loadingTTH}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeToHireData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E5EA)" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6B7280' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="avgDays"
                  name="Avg Days"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fill="url(#tthGrad)"
                  dot={{ fill: '#8B5CF6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Department Breakdown */}
          <ChartCard title="Department Breakdown" subtitle="Applications, selections, and rejections by department" loading={loadingDept}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E5EA)" opacity={0.4} />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="totalApplications" name="Applications" fill="#3454D1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="selected" name="Selected" fill="#2E8B57" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#C1502E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* AI Query Results (dynamic chart) */}
          <ChartCard
            title="AI-Powered Query"
            subtitle="Ask questions in natural language about your recruitment data"
            loading={aiLoading}
          >
            <form onSubmit={handleAiQuery} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="e.g. 'How many candidates applied this month?'"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark text-ink dark:text-ink-dark placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  id="analytics-ai-input"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-all disabled:opacity-50"
                  id="analytics-ai-btn"
                >
                  Ask AI
                </button>
              </div>
            </form>

            {/* Quick question chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                'How many candidates applied this month?',
                'What is the interview-to-offer ratio?',
                'Show top departments by applications',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAiQuestion(q)}
                  className="text-[10px] px-2 py-1 rounded-md bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            {aiResult && (
              <div>
                <div className="bg-canvas dark:bg-canvas-dark rounded-xl p-3 mb-3 border border-border dark:border-border-dark">
                  <p className="text-sm text-ink dark:text-ink-dark">{aiResult.answer}</p>
                </div>
                {aiResult.chartData?.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={aiResult.chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey={Object.keys(aiResult.chartData[0])[0]} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey={Object.keys(aiResult.chartData[0])[1] || 'count'} fill="#3454D1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {!aiResult && !aiLoading && (
              <div className="h-32 flex items-center justify-center text-muted dark:text-muted-dark text-sm">
                Ask a question to see AI-generated insights
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default HrAnalyticsDashboard;
