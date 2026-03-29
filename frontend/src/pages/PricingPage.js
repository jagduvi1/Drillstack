import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getUsage, changePlan, startTrial } from "../api/billing";
import { FiCheck, FiStar, FiZap, FiAward } from "react-icons/fi";

const PLAN_ICONS = { starter: FiStar, coach: FiZap, pro: FiAward };

export default function PricingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchUsage = async () => {
    try {
      const res = await getUsage();
      setUsage(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsage(); }, []);

  const handleChangePlan = async (planId) => {
    setSwitching(planId);
    setMessage("");
    try {
      const res = await changePlan(planId);
      setMessage(res.data.message);
      await fetchUsage();
    } catch (err) {
      setMessage(err.response?.data?.error || t("pricing.failedToSwitch"));
    } finally {
      setSwitching(null);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setMessage("");
    try {
      const res = await startTrial();
      setMessage(res.data.message);
      await fetchUsage();
    } catch (err) {
      setMessage(err.response?.data?.error || t("pricing.failedToStartTrial"));
    } finally {
      setTrialLoading(false);
    }
  };

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  const plans = [
    {
      id: "starter",
      name: t("pricing.planStarter"),
      price: t("pricing.planStarterPrice"),
      description: t("pricing.planStarterDesc"),
      features: [
        t("pricing.featureUnlimitedDrills"),
        t("pricing.featureUp5Sessions"),
        t("pricing.featureUp2Plans"),
        t("pricing.featureJoinTeams"),
        t("pricing.feature5AiMonth"),
        t("pricing.featureBasicSearch"),
      ],
    },
    {
      id: "coach",
      name: t("pricing.planCoach"),
      price: t("pricing.planCoachPrice"),
      description: t("pricing.planCoachDesc"),
      features: [
        t("pricing.featureUp50Drills"),
        t("pricing.featureUp25Sessions"),
        t("pricing.featureUp10Plans"),
        t("pricing.featureUp3Teams"),
        t("pricing.feature50AiMonth"),
        t("pricing.featureSemanticSearch"),
        t("pricing.featureDrillDiagrams"),
      ],
      highlight: true,
    },
    {
      id: "pro",
      name: t("pricing.planPro"),
      price: t("pricing.planProPrice"),
      description: t("pricing.planProDesc"),
      features: [
        t("pricing.featureUnlimitedDrills"),
        t("pricing.featureUnlimitedSessions"),
        t("pricing.featureUnlimitedPlans"),
        t("pricing.featureUnlimitedTeams"),
        t("pricing.featureUnlimitedAi"),
        t("pricing.featureSemanticSearch"),
        t("pricing.featureDrillDiagrams"),
        t("pricing.featurePrioritySupport"),
      ],
    },
  ];

  const currentPlan = usage?.plan || "starter";
  const effectivePlan = usage?.effectivePlan || currentPlan;
  const trial = usage?.trial;

  return (
    <div>
      <h1 style={{ marginBottom: "0.5rem" }}>{t("pricing.title")}</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        <span>{t("pricing.youreOnPlan", { plan: usage?.planName || t("pricing.planStarter") })}</span>
        {trial?.active && (
          <span> ({t("pricing.trialActive", { days: trial.daysLeft })})</span>
        )}
      </p>

      {message && (
        <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>{message}</div>
      )}

      {/* Trial CTA */}
      {trial?.canStartTrial && currentPlan !== "pro" && (
        <div className="pricing-trial-banner card" style={{
          background: "linear-gradient(135deg, #eff6ff, #f0f4ff)",
          border: "1px solid #93c5fd",
          marginBottom: "1.5rem",
          textAlign: "center",
          padding: "1.5rem",
        }}>
          <FiAward style={{ fontSize: "2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }} />
          <h2 style={{ marginBottom: "0.25rem" }}>{t("pricing.tryProFree")}</h2>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>
            {t("pricing.tryProDesc")}
          </p>
          <button
            className="btn btn-primary"
            onClick={handleStartTrial}
            disabled={trialLoading}
            style={{ padding: "0.6rem 2rem", fontSize: "1rem" }}
          >
            <FiZap /> {trialLoading ? t("pricing.starting") : t("pricing.startFreeTrial")}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div className="pricing-grid">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id];
          const isCurrent = currentPlan === plan.id;
          const isEffective = effectivePlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`card pricing-card ${plan.highlight ? "pricing-card-highlight" : ""}`}
              style={{
                border: isEffective ? "2px solid var(--color-primary)" : undefined,
                position: "relative",
              }}
            >
              {isEffective && !isCurrent && trial?.active && (
                <span className="pricing-badge">{t("pricing.trialActiveBadge")}</span>
              )}
              {isCurrent && (
                <span className="pricing-badge pricing-badge-current">{t("pricing.currentPlan")}</span>
              )}

              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <Icon style={{ fontSize: "2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }} />
                <h2 style={{ marginBottom: "0.25rem" }}>{plan.name}</h2>
                <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{plan.price}</div>
                <p className="text-sm text-muted">{plan.description}</p>
              </div>

              <ul className="pricing-features">
                {plan.features.map((f) => (
                  <li key={f}><FiCheck style={{ color: "var(--color-success)", flexShrink: 0 }} /> {f}</li>
                ))}
              </ul>

              <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                {isCurrent ? (
                  <button className="btn btn-secondary" disabled style={{ width: "100%" }}>
                    {t("pricing.currentPlan")}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={switching === plan.id}
                  >
                    {switching === plan.id ? t("pricing.switching") : t("pricing.switchTo", { name: plan.name })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage section */}
      {usage?.usage && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>{t("pricing.yourUsage")}</h2>
          <div className="pricing-usage-grid">
            {Object.entries(usage.usage).map(([key, val]) => {
              const labels = {
                drills: t("pricing.usageDrills"),
                sessions: t("pricing.usageSessions"),
                plans: t("pricing.usagePlans"),
                groups: t("pricing.usageGroups"),
                aiRequestsPerMonth: t("pricing.usageAi"),
              };
              const pct = val.unlimited ? 0 : (val.limit > 0 ? Math.min(100, (val.used / val.limit) * 100) : 0);
              const nearLimit = !val.unlimited && val.limit > 0 && pct >= 80;

              return (
                <div key={key} className="card" style={{ padding: "1rem" }}>
                  <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                    <span className="text-sm" style={{ fontWeight: 600 }}>{labels[key] || key}</span>
                    <span className="text-sm text-muted">
                      {val.used} / {val.unlimited ? "\u221e" : val.limit}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: "6px" }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: val.unlimited ? "0%" : `${pct}%`,
                        background: nearLimit ? "var(--color-warning)" : "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
