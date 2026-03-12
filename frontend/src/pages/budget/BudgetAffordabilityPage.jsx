import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PiggyBank, Sparkles, Target, Trash2, Wallet } from "lucide-react";
import api from "../../lib/api";
import { useBudgetOutlet } from "./useBudgetOutlet";

const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDate = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const BudgetAffordabilityPage = () => {
  const { money, notify, refreshData } = useBudgetOutlet();

  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [busy, setBusy] = useState(false);

  const [goalForm, setGoalForm] = useState({
    title: "",
    targetAmount: "",
    targetDate: "",
    note: "",
  });
  const [contributionMap, setContributionMap] = useState({});

  const [affordabilityForm, setAffordabilityForm] = useState({
    itemName: "",
    amount: "",
    plannedDate: getToday(),
    goalId: "",
  });
  const [checkingAffordability, setCheckingAffordability] = useState(false);
  const [affordabilityResult, setAffordabilityResult] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoadingGoals(true);
      const { data } = await api.get("/api/goals");
      setGoals(Array.isArray(data) ? data : []);
    } catch {
      notify("error", "Could not load savings goals.");
    } finally {
      setLoadingGoals(false);
    }
  }, [notify]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const totalGoalRemaining = useMemo(
    () => goals.reduce((sum, goal) => sum + Number(goal.remainingAmount || 0), 0),
    [goals],
  );

  const handleCreateGoal = async (event) => {
    event.preventDefault();
    const targetAmount = Number(goalForm.targetAmount);

    if (!goalForm.title.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      notify("error", "Add a valid goal title and target amount.");
      return;
    }

    try {
      setBusy(true);
      await api.post("/api/goals", {
        title: goalForm.title,
        targetAmount,
        targetDate: goalForm.targetDate || undefined,
        note: goalForm.note,
      });
      setGoalForm({ title: "", targetAmount: "", targetDate: "", note: "" });
      await loadGoals();
      notify("success", "Savings goal created.");
    } catch (error) {
      notify("error", error.response?.data?.message || "Could not create goal.");
    } finally {
      setBusy(false);
    }
  };

  const handleContribute = async (goal) => {
    const amount = Number(contributionMap[goal._id] || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("error", "Enter a valid contribution amount.");
      return;
    }

    try {
      setBusy(true);
      await api.post(`/api/goals/${goal._id}/contribute`, {
        amount,
        transactionDate: getToday(),
      });
      setContributionMap((prev) => ({ ...prev, [goal._id]: "" }));
      await Promise.all([loadGoals(), refreshData()]);
      notify("success", "Contribution added and logged in transactions.");
    } catch (error) {
      notify("error", error.response?.data?.message || "Could not contribute to goal.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      setBusy(true);
      await api.delete(`/api/goals/${goalId}`);
      await loadGoals();
      notify("success", "Goal archived.");
    } catch (error) {
      notify("error", error.response?.data?.message || "Could not remove goal.");
    } finally {
      setBusy(false);
    }
  };

  const handleAffordabilityCheck = async (event) => {
    event.preventDefault();
    const amount = Number(affordabilityForm.amount);
    if (!affordabilityForm.itemName.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify("error", "Add a valid item name and amount.");
      return;
    }

    try {
      setCheckingAffordability(true);
      const { data } = await api.post("/api/transactions/ai-afford", {
        itemName: affordabilityForm.itemName,
        amount,
        plannedDate: affordabilityForm.plannedDate || getToday(),
        goalId: affordabilityForm.goalId || undefined,
      });
      setAffordabilityResult(data);
    } catch (error) {
      notify("error", error.response?.data?.message || "Affordability check failed.");
    } finally {
      setCheckingAffordability(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4">
      <section className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-300" /> Can I Afford This? AI
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Simulate a purchase and get AI-backed guidance with your live cashflow and goal pressure.
          </p>

          <form onSubmit={handleAffordabilityCheck} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={affordabilityForm.itemName}
              onChange={(event) => setAffordabilityForm((prev) => ({ ...prev, itemName: event.target.value }))}
              placeholder="Item (e.g., Noise-cancelling headphones)"
              className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            />
            <input
              type="number"
              min="1"
              step="0.01"
              value={affordabilityForm.amount}
              onChange={(event) => setAffordabilityForm((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder="Price"
              className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            />
            <input
              type="date"
              value={affordabilityForm.plannedDate}
              onChange={(event) => setAffordabilityForm((prev) => ({ ...prev, plannedDate: event.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            />
            <select
              value={affordabilityForm.goalId}
              onChange={(event) => setAffordabilityForm((prev) => ({ ...prev, goalId: event.target.value }))}
              className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            >
              <option value="">No specific goal focus</option>
              {goals.map((goal) => (
                <option key={goal._id} value={goal._id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={checkingAffordability}
              className="md:col-span-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 px-3 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {checkingAffordability ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={15} />}
              Analyze Affordability
            </button>
          </form>
        </article>

        {affordabilityResult && (
          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">{affordabilityResult.itemName}</p>
              <span
                className={`text-xs px-2 py-1 rounded-full border ${
                  affordabilityResult.decision?.canAfford
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300"
                }`}
              >
                {affordabilityResult.decision?.canAfford ? "Affordable now" : "Not ideal now"}
              </span>
            </div>

            <p className="text-sm text-slate-300 mt-2">{affordabilityResult.decision?.summary}</p>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Item Price</p>
                <p className="text-lg font-bold text-white">{money(affordabilityResult.amount)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Spendable Now</p>
                <p className="text-lg font-bold text-white">{money(affordabilityResult.context?.spendableNow)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">After Purchase</p>
                <p
                  className={`text-lg font-bold ${
                    Number(affordabilityResult.context?.projectedAfterPurchase || 0) >= 0
                      ? "text-emerald-300"
                      : "text-red-300"
                  }`}
                >
                  {money(affordabilityResult.context?.projectedAfterPurchase)}
                </p>
              </div>
            </div>

            {Array.isArray(affordabilityResult.decision?.reasoning) && affordabilityResult.decision.reasoning.length > 0 && (
              <div className="mt-3 space-y-1">
                {affordabilityResult.decision.reasoning.map((line) => (
                  <p key={line} className="text-sm text-slate-300">
                    • {line}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-3 text-sm text-cyan-200 border border-cyan-500/30 bg-cyan-500/10 rounded-xl px-3 py-2">
              {affordabilityResult.decision?.recommendedAction}
            </p>
          </article>
        )}
      </section>

      <section className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Target size={16} className="text-emerald-300" /> Savings Goals
          </h2>
          <p className="text-sm text-slate-400 mt-1">Save money for big targets and track progress.</p>

          <form onSubmit={handleCreateGoal} className="mt-4 grid grid-cols-1 gap-3">
            <input
              value={goalForm.title}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Goal name (e.g., New Laptop)"
              className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            />
            <input
              type="number"
              min="1"
              step="0.01"
              value={goalForm.targetAmount}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
              placeholder="Target amount"
              className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            />
            <input
              type="date"
              value={goalForm.targetDate}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, targetDate: event.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            />
            <textarea
              rows={2}
              value={goalForm.note}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Why this matters (optional)"
              className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm resize-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-3 text-sm font-semibold disabled:opacity-60"
            >
              Create Goal
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-white flex items-center gap-2">
              <PiggyBank size={16} className="text-indigo-300" /> Active Goals
            </p>
            <p className="text-xs text-slate-400">Remaining: {money(totalGoalRemaining)}</p>
          </div>

          {loadingGoals ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-300" size={20} />
            </div>
          ) : goals.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              No goals yet. Create one to start saving intentionally.
            </div>
          ) : (
            <div className="mt-3 space-y-2.5 max-h-[540px] overflow-y-auto">
              {goals.map((goal) => {
                const progressPercent = Math.min(Number(goal.progressPercent || 0), 100);
                return (
                  <div key={goal._id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{goal.title}</p>
                        <p className="text-xs text-slate-400">
                          Target: {money(goal.targetAmount)} | Saved: {money(goal.savedAmount)} | Due:{" "}
                          {formatDate(goal.targetDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal._id)}
                        disabled={busy}
                        className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 disabled:opacity-60"
                        title="Archive goal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${progressPercent}%` }} />
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {progressPercent.toFixed(1)}% complete | Remaining: {money(goal.remainingAmount)}
                    </p>

                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={contributionMap[goal._id] || ""}
                        onChange={(event) =>
                          setContributionMap((prev) => ({ ...prev, [goal._id]: event.target.value }))
                        }
                        placeholder="Add amount"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleContribute(goal)}
                        disabled={busy}
                        className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

export default BudgetAffordabilityPage;
