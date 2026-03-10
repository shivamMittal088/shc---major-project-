import AnimatedPanel from "@/components/ui/animated-panel";
import {
    ArrowUpRight,
    Check,
    Sparkles,
    Star,
    Zap,
} from "lucide-react";

const PLANS = [
    {
        name: "Free",
        price: "$0",
        cadence: "/month",
        description: "For solo builders sharing experiments, gists, and docs.",
        cta: "Current baseline",
        accent: "from-slate-400/16 to-slate-500/8",
        features: [
            "1 GB storage",
            "1000 daily reads",
            "20 daily writes",
            "100 MB max file size",
        ],
    },
    {
        name: "Pro",
        price: "$12",
        cadence: "/month",
        description: "For fast-moving teams that need bigger uploads and more traffic headroom.",
        cta: "Recommended when billing opens",
        accent: "from-cyan-400/18 via-sky-500/10 to-indigo-500/14",
        featured: true,
        features: [
            "15 GB storage",
            "10,000 daily reads",
            "100 daily writes",
            "1 GB max file size",
            "Priority support when launched",
        ],
    },
];

const COMPARISON_ROWS = [
    ["Storage", "1 GB", "15 GB"],
    ["Daily reads", "1,000", "10,000"],
    ["Daily writes", "20", "100"],
    ["Max file size", "100 MB", "1 GB"],
    ["Custom workspace insights", "-", "Included"],
    ["Priority queue", "-", "Included"],
];

export default function Subscription() {
    return (
        <div className="space-y-5">
            <AnimatedPanel hoverLift={false} className="overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-fuchsia-500/12 via-white/[0.04] to-cyan-500/12 px-6 py-6 shadow-[0_34px_110px_-70px_rgba(168,85,247,0.95)] backdrop-blur-2xl">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/15 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-100">
                            <Sparkles className="h-3.5 w-3.5" />
                            Subscription
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                            Pricing designed for developers who move fast.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                            Billing is still inactive, but the workspace is ready for a polished plan experience with premium throughput, larger file ceilings, and clearer usage controls.
                        </p>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status</p>
                        <p className="mt-2 text-lg font-semibold text-white">Inactive billing preview</p>
                        <p className="mt-1 text-sm text-slate-400">UI is ready for launch hooks and plan activation.</p>
                    </div>
                </div>
            </AnimatedPanel>

            <div className="grid gap-4 xl:grid-cols-2">
                {PLANS.map((plan, index) => (
                    <AnimatedPanel
                        key={plan.name}
                        delay={0.05 * (index + 1)}
                        className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${plan.accent} p-6 shadow-[0_28px_90px_-60px_rgba(56,189,248,0.75)] backdrop-blur-2xl`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                                    {plan.featured ? <Star className="h-3.5 w-3.5 text-cyan-200" /> : <Zap className="h-3.5 w-3.5 text-slate-400" />}
                                    {plan.featured ? "Recommended" : "Starter"}
                                </div>
                                <h2 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-300">{plan.description}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex items-end gap-2">
                            <span className="text-5xl font-semibold tracking-tight text-white">{plan.price}</span>
                            <span className="pb-2 text-sm text-slate-400">{plan.cadence}</span>
                        </div>

                        <ul className="mt-6 space-y-3 text-sm text-slate-200">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                    <span className="grid h-6 w-6 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                                        <Check className="h-3.5 w-3.5" />
                                    </span>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            type="button"
                            className={`mt-8 inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all ${
                                plan.featured
                                    ? "border-cyan-300/20 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-[0_18px_40px_-24px_rgba(56,189,248,1)] hover:opacity-90"
                                    : "border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
                            }`}
                            disabled
                        >
                            {plan.cta}
                            <ArrowUpRight className="h-4 w-4" />
                        </button>
                    </AnimatedPanel>
                ))}
            </div>

            <AnimatedPanel delay={0.12} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_90px_-60px_rgba(56,189,248,0.55)] backdrop-blur-2xl">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Feature comparison
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-white">Choose the lane that matches your delivery speed</h2>
                    </div>
                    <p className="text-sm text-slate-400">Prepared for launch once billing endpoints are activated.</p>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                    <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <span>Feature</span>
                        <span>Free</span>
                        <span>Pro</span>
                    </div>
                    {COMPARISON_ROWS.map((row) => (
                        <div
                            key={row[0]}
                            className="grid grid-cols-[1.2fr_0.8fr_0.8fr] items-center border-t border-white/8 px-4 py-3 text-sm text-slate-200"
                        >
                            <span className="font-medium text-white">{row[0]}</span>
                            <span>{row[1]}</span>
                            <span className="text-cyan-200">{row[2]}</span>
                        </div>
                    ))}
                </div>
            </AnimatedPanel>
        </div>
    );
}
