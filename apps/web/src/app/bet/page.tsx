"use client";

import { useMiniApp } from "@/contexts/miniapp-context";
import { useAccount } from "wagmi";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
};

const seedMarkets: FlightMarket[] = [
  {
    id: "DL104-2024-12-01",
    flightNumber: "DL104",
    departureDate: "2024-12-01",
    route: "JFK → LAX",
    yesPrice: 0.22,
    impliedProbability: 22,
    totalLiquidity: 32500,
    coverageDemand: 12800,
    outcomeType: "DELAY",
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
    outcomeType: "DELAY",
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

type FormState = {
  flightNumber: string;
  departureDate: string;
  route: string;
  coverage: number;
};

export default function BetPage() {
  const { context, isMiniAppReady } = useMiniApp();
  const { address } = useAccount();

  const [markets, setMarkets] = useState<FlightMarket[]>(seedMarkets);
  const [outcomeType, setOutcomeType] = useState<OutcomeType>("DELAY_30");
  const [formState, setFormState] = useState<FormState>({
    flightNumber: "",
    departureDate: "",
    route: "",
    coverage: 250,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "info">("info");

  const travelerName =
    context?.user?.displayName || context?.user?.username || "Traveler";
  const walletAddress =
    address ||
    context?.user?.custody ||
    context?.user?.verifications?.[0] ||
    "0x1e4B...605B";

  const normalizedFlightNumber = formState.flightNumber.trim().toUpperCase();

  const premiumQuote = useMemo(() => {
    const outcomeBase: Record<OutcomeType, number> = {
      DELAY_30: 0.14,
      DELAY_60: 0.18,
      DELAY_90: 0.23,
      CANCEL: 0.28,
    };
    const base = outcomeBase[outcomeType];
    const coverageFactor = Math.min(0.08, (formState.coverage || 0) / 5000);
    const quotedPrice = Number((base + coverageFactor).toFixed(2));
    const premium = Number(
      ((formState.coverage || 0) * quotedPrice).toFixed(2)
    );

    return {
      yesPrice: quotedPrice,
      impliedProbability: Math.round(quotedPrice * 100),
      premium,
    };
  }, [formState.coverage, outcomeType]);

  const previewFlightNumber = normalizedFlightNumber || "AF008";
  const previewRoute = formState.route || "CDG → JFK";
  const previewDate = formState.departureDate || "Dec 03, 2024";
  const outcomeLabels: Record<OutcomeType, string> = {
    DELAY_30: "30 min delay",
    DELAY_60: "60 min delay",
    DELAY_90: "90+ min delay",
    CANCEL: "Cancellation",
  };

  const previewOutcomeLabel = outcomeLabels[outcomeType];

  const insightTiles = (
    quote: number,
    premium: number,
    marketCount: number
  ) => [
    {
      label: "Risk quote",
      value: percent.format(quote / 100),
      icon: "☁️",
    },
    {
      label: "Premium today",
      value: currency.format(premium || 0),
      icon: "🛡️",
    },
    {
      label: "Flights monitored",
      value: `${marketCount}`,
      icon: "🛫",
    },
  ];

  const sortedMarkets = useMemo(
    () =>
      [...markets].sort((a, b) => b.impliedProbability - a.impliedProbability),
    [markets]
  );

  if (!isMiniAppReady) {
    return (
      <section className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md mx-auto p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </section>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedFlightNumber) {
      setStatusTone("info");
      setStatusMessage("Please enter a flight number to continue.");
      return;
    }

    if (!formState.departureDate) {
      setStatusTone("info");
      setStatusMessage(
        "Add a departure date so we can match the right flight."
      );
      return;
    }

    const normalizedDate = formState.departureDate;
    const marketId = `${normalizedFlightNumber}-${normalizedDate}`;

    let userMessage = "";
    let tone: "success" | "info" = "info";

    setMarkets((prev) => {
      const existing = prev.find((m) => m.id === marketId);

      if (existing) {
        userMessage = `Great news! There is already an open ${existing.outcomeType.toLowerCase()} market for ${
          existing.flightNumber
        } on ${existing.departureDate}. Your bet is routed there.`;
        tone = "success";
        return prev;
      }

      const newMarket: FlightMarket = {
        id: marketId,
        flightNumber: normalizedFlightNumber,
        departureDate: normalizedDate,
        route: formState.route || "Route pending",
        yesPrice: premiumQuote.yesPrice,
        impliedProbability: premiumQuote.impliedProbability,
        totalLiquidity: 12000 + Math.round(Math.random() * 6000),
        coverageDemand: (formState.coverage || 0) + 5000,
        outcomeType,
      };

      userMessage = `New market created for ${normalizedFlightNumber} (${outcomeType.toLowerCase()}). You are the first to request coverage on this flight!`;
      tone = "success";
      return [newMarket, ...prev];
    });

    setStatusTone(tone);
    setStatusMessage(userMessage);
  };

  return (
    <section className="bg-gradient-to-b from-sky-50 via-white to-indigo-50 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4">
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-500">
            SkyShield underwriting desk
          </p>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            Get a flight insurance quote in seconds
          </h1>
          <p className="text-base text-slate-600">
            Enter your flight, choose the delay or cancellation trigger, and we
            will price the policy. If a pool does not exist yet, we launch one
            on the fly.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {insightTiles(
            premiumQuote.impliedProbability,
            premiumQuote.premium || 0,
            markets.length
          ).map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col items-center rounded-2xl border border-sky-100 bg-white/90 px-4 py-4 text-center shadow-sm shadow-sky-100/60"
            >
              <span className="text-xl">{tile.icon}</span>
              <p className="text-2xl font-semibold text-slate-900">
                {tile.value}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {tile.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="shadow-xl ring-1 ring-sky-100/70 bg-white/95">
            <CardHeader>
              <CardTitle>Flight insurance request</CardTitle>
              <CardDescription>
                Provide flight details and desired payout. We auto-route the
                request to the right prediction market.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Flight number
                  </label>
                  <input
                    type="text"
                    value={formState.flightNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        flightNumber: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. AF008"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Departure date
                    </label>
                    <input
                      type="date"
                      value={formState.departureDate}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          departureDate: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Route (optional)
                    </label>
                    <input
                      type="text"
                      value={formState.route}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          route: event.target.value,
                        }))
                      }
                      placeholder="e.g. CDG → JFK"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Coverage amount (USDC)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={formState.coverage}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          coverage: Math.max(
                            0,
                            Number(event.target.value) || 0
                          ),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Outcome to insure
                    </label>
                    <select
                      value={outcomeType}
                      onChange={(event) =>
                        setOutcomeType(event.target.value as OutcomeType)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="DELAY_30">30 min delay</option>
                      <option value="DELAY_60">60 min delay</option>
                      <option value="DELAY_90">90+ min delay</option>
                      <option value="CANCEL">Cancellation</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-sky-600 text-white shadow-sm transition hover:bg-sky-500"
                >
                  Submit for underwriting
                </Button>
              </form>
            </CardContent>
            {statusMessage && (
              <CardFooter>
                <div
                  className={`w-full rounded-lg border px-4 py-3 text-sm ${
                    statusTone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {statusMessage}
                </div>
              </CardFooter>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="shadow-xl ring-1 ring-sky-100/70 bg-white/95">
              <CardHeader>
                <CardTitle>Flight insurance summary</CardTitle>
                <CardDescription>
                  Live snapshot of the policy request exactly as the AMM sees
                  it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-5 text-slate-100">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Traveler
                  </p>
                  <p className="text-lg font-semibold">
                    {travelerName} · {walletAddress.slice(0, 6)}...
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      { label: "Flight", value: previewFlightNumber },
                      { label: "Date", value: previewDate },
                      { label: "Route", value: previewRoute },
                      { label: "Outcome", value: previewOutcomeLabel },
                    ].map((detail) => (
                      <div
                        key={detail.label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-slate-400">{detail.label}</span>
                        <span>{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-inner">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>YES share price</span>
                    <span className="font-semibold text-slate-900">
                      {currency.format(premiumQuote.yesPrice)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Implied probability</span>
                    <span className="font-semibold text-slate-900">
                      {percent.format(premiumQuote.impliedProbability / 100)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Requested coverage</span>
                    <span className="font-semibold text-slate-900">
                      {currency.format(formState.coverage || 0)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Premium due today</span>
                    <span className="font-semibold text-indigo-600">
                      {currency.format(premiumQuote.premium || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg ring-1 ring-slate-100 bg-white/95">
              <CardHeader>
                <CardTitle>How SkyShield settles policies</CardTitle>
                <CardDescription>
                  Every policy flows through a collateralized prediction market
                  so payouts stay transparent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>
                  1. File the route and payout target. We quote a YES share
                  price from the AMM curve.
                </p>
                <p>
                  2. No pool yet? Your request bootstraps liquidity so insurers
                  can underwrite instantly.
                </p>
                <p>
                  3. After departure, the oracle posts the status. YES shares
                  pay 1 USDC if the trigger hits.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card
          className="shadow-xl ring-1 ring-slate-100 bg-white/95"
          id="flight-markets"
        >
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Active coverage pools</CardTitle>
              <CardDescription>
                Tap a pool to auto-fill the intake form with its flight details.
              </CardDescription>
            </div>
            <span className="text-sm font-medium text-indigo-600">
              {markets.length} markets live
            </span>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Flight
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Outcome
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    YES price
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Implied prob.
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Coverage demand
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Liquidity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedMarkets.map((market) => (
                  <tr
                    key={market.id}
                    className="cursor-pointer transition-colors hover:bg-sky-50/60"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        flightNumber: market.flightNumber,
                        departureDate: market.departureDate,
                        route: market.route,
                      }))
                    }
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {market.flightNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {market.departureDate}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {outcomeLabels[market.outcomeType]}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {currency.format(market.yesPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {percent.format(market.impliedProbability / 100)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {currency.format(market.coverageDemand)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {currency.format(market.totalLiquidity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
