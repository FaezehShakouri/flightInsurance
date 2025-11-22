"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OutcomeType = "DELAY_30" | "DELAY_60" | "DELAY_90" | "CANCEL";

type FlightMarket = {
  id: string;
  flightNumber: string;
  departureDate: string;
  route: string;
  yesPrice: number;
  impliedProbability: number;
  totalLiquidity: number;
  coverageDemand: number;
  outcomeType: OutcomeType;
  airline: string;
};

const outcomeLabels: Record<OutcomeType, string> = {
  DELAY_30: "30 min delay",
  DELAY_60: "60 min delay",
  DELAY_90: "90+ min delay",
  CANCEL: "Cancellation",
};

const marketsSeed: FlightMarket[] = [
  {
    id: "DL104-2024-12-01",
    flightNumber: "DL104",
    departureDate: "2024-12-01",
    route: "JFK → LAX",
    yesPrice: 0.22,
    impliedProbability: 22,
    totalLiquidity: 32500,
    coverageDemand: 12800,
    outcomeType: "DELAY_60",
    airline: "Delta",
  },
  {
    id: "UA881-2024-12-02",
    flightNumber: "UA881",
    departureDate: "2024-12-02",
    route: "SFO → NRT",
    yesPrice: 0.17,
    impliedProbability: 17,
    totalLiquidity: 41200,
    coverageDemand: 9800,
    outcomeType: "CANCEL",
    airline: "United",
  },
  {
    id: "AF008-2024-12-03",
    flightNumber: "AF008",
    departureDate: "2024-12-03",
    route: "CDG → JFK",
    yesPrice: 0.29,
    impliedProbability: 29,
    totalLiquidity: 28750,
    coverageDemand: 16500,
    outcomeType: "DELAY_90",
    airline: "Air France",
  },
  {
    id: "AA079-2024-12-03",
    flightNumber: "AA079",
    departureDate: "2024-12-03",
    route: "DFW → LHR",
    yesPrice: 0.12,
    impliedProbability: 12,
    totalLiquidity: 19900,
    coverageDemand: 6200,
    outcomeType: "DELAY_30",
    airline: "American",
  },
  {
    id: "SQ025-2024-12-04",
    flightNumber: "SQ025",
    departureDate: "2024-12-04",
    route: "FRA → SIN",
    yesPrice: 0.09,
    impliedProbability: 9,
    totalLiquidity: 35600,
    coverageDemand: 4800,
    outcomeType: "DELAY_30",
    airline: "Singapore Airlines",
  },
  {
    id: "EK202-2024-12-04",
    flightNumber: "EK202",
    departureDate: "2024-12-04",
    route: "JFK → DXB",
    yesPrice: 0.31,
    impliedProbability: 31,
    totalLiquidity: 44100,
    coverageDemand: 21200,
    outcomeType: "CANCEL",
    airline: "Emirates",
  },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const kpiTiles = [
  { label: "Pools active", detail: "within next 48h", icon: "🛫" },
  { label: "Total liquidity", detail: "locked in USDC", icon: "💧" },
  { label: "Coverage demand", detail: "policy requests", icon: "🛡️" },
  { label: "Avg. risk quote", detail: "implied probability", icon: "⚖️" },
];

const outcomeFilters: Array<{ label: string; value: OutcomeType | "ALL" }> = [
  { label: "All triggers", value: "ALL" },
  { label: "30 min delay", value: "DELAY_30" },
  { label: "60 min delay", value: "DELAY_60" },
  { label: "90+ min delay", value: "DELAY_90" },
  { label: "Cancellation", value: "CANCEL" },
];

export default function MarketsPage() {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | "ALL">(
    "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMarkets = useMemo(() => {
    return marketsSeed.filter((market) => {
      const matchesOutcome =
        selectedOutcome === "ALL" || market.outcomeType === selectedOutcome;
      const matchesSearch =
        market.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.airline.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesOutcome && matchesSearch;
    });
  }, [selectedOutcome, searchTerm]);

  const aggregated = useMemo(() => {
    const liquidity = filteredMarkets.reduce(
      (sum, market) => sum + market.totalLiquidity,
      0
    );
    const coverage = filteredMarkets.reduce(
      (sum, market) => sum + market.coverageDemand,
      0
    );
    const avgProbability =
      filteredMarkets.reduce(
        (sum, market) => sum + market.impliedProbability,
        0
      ) / (filteredMarkets.length || 1);

    return {
      poolsActive: filteredMarkets.length,
      totalLiquidity: currency.format(liquidity),
      coverageDemand: currency.format(coverage),
      avgRisk: percent.format(avgProbability / 100),
    };
  }, [filteredMarkets]);

  const kpiValues = [
    aggregated.poolsActive,
    aggregated.totalLiquidity,
    aggregated.coverageDemand,
    aggregated.avgRisk,
  ];

  return (
    <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 py-12 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4">
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-300">
            SkyShield | coverage pools
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Active flight prediction markets
          </h1>
          <p className="text-base text-slate-200">
            Monitor every delay and cancellation pool that the AMM currently
            underwrites. Filter by trigger or search by flight, route, or
            airline to find the market you need.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiTiles.map((tile, index) => (
            <div
              key={tile.label}
              className="rounded-2xl border border-white/5 bg-white/5 px-4 py-5 text-center shadow-lg shadow-black/40"
            >
              <span className="text-lg">{tile.icon}</span>
              <p className="mt-2 text-3xl font-semibold">
                {kpiValues[index] || "--"}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-300">
                {tile.label}
              </p>
              <p className="text-xs text-slate-400">{tile.detail}</p>
            </div>
          ))}
        </div>

        <Card className="border-white/10 bg-white/5 text-white shadow-2xl shadow-black/30">
          <CardHeader>
            <CardTitle>Filter pools</CardTitle>
            <CardDescription className="text-slate-300">
              Narrow the runway by trigger type or search specific flights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex flex-wrap gap-2">
                {outcomeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedOutcome(filter.value)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      selectedOutcome === filter.value
                        ? "border-sky-300 bg-sky-500/20 text-white"
                        : "border-white/20 text-slate-200 hover:border-sky-200/60 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search flight, route, or airline"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMarkets.map((market) => (
            <Card
              key={market.id}
              className="flex h-full flex-col border-white/10 bg-white/5 text-white shadow-xl shadow-black/40"
            >
              <CardHeader className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide">
                    {market.airline}
                  </span>
                  <span className="text-xs text-slate-400">
                    {market.departureDate}
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-semibold">
                    {market.flightNumber}
                  </p>
                  <p className="text-sm text-slate-300">{market.route}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Outcome
                  </p>
                  <p className="text-base text-white">
                    {outcomeLabels[market.outcomeType]}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      YES price
                    </p>
                    <p className="text-lg text-white">
                      {currency.format(market.yesPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Implied probability
                    </p>
                    <p className="text-lg text-white">
                      {percent.format(market.impliedProbability / 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Coverage demand
                    </p>
                    <p className="text-lg text-white">
                      {currency.format(market.coverageDemand)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Liquidity
                    </p>
                    <p className="text-lg text-white">
                      {currency.format(market.totalLiquidity)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    asChild
                    className="flex-1 bg-white text-slate-900 hover:bg-slate-100"
                  >
                    <Link
                      href={`/bet?flight=${market.flightNumber}&date=${market.departureDate}`}
                    >
                      Request coverage
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:border-sky-200 hover:bg-sky-200/10"
                  >
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
