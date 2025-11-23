"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FLIGHT_MARKET_CONTRACT_ADDRESS } from "@/lib/contract";
import FlightMarketABI from "@/app/abi.json";

interface CreateFlightMarketDialogProps {
  onSuccess?: () => void;
}

export function CreateFlightMarketDialog({ onSuccess }: CreateFlightMarketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    flightNumber: "",
    departureCode: "",
    destinationCode: "",
    airlineCode: "",
    scheduledTime: "",
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert datetime-local format to ISO string for the contract
      const isoTime = formData.scheduledTime 
        ? new Date(formData.scheduledTime).toISOString() 
        : "";

      writeContract({
        address: FLIGHT_MARKET_CONTRACT_ADDRESS,
        abi: FlightMarketABI,
        functionName: "createFlightMarket",
        args: [
          formData.flightNumber,
          formData.departureCode,
          formData.destinationCode,
          formData.airlineCode,
          isoTime,
        ],
      });
    } catch (err) {
      console.error("Error creating flight market:", err);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      flightNumber: "",
      departureCode: "",
      destinationCode: "",
      airlineCode: "",
      scheduledTime: "",
    });
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-green-400">✓ Market Created!</CardTitle>
            <CardDescription className="text-slate-300">
              Your flight market has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Transaction Hash</p>
                <p className="break-all text-sm font-mono">{hash}</p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-sky-500 hover:bg-sky-600"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-sky-500 hover:bg-sky-600 text-white"
      >
        + Create Flight Market
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white">
        <CardHeader>
          <CardTitle>Create New Flight Market</CardTitle>
          <CardDescription className="text-slate-300">
            Add a new flight to the prediction market system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Airline Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="AA"
                  maxLength={3}
                  value={formData.airlineCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      airlineCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Flight Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="123"
                  value={formData.flightNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, flightNumber: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Departure Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="LAX"
                  maxLength={3}
                  value={formData.departureCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departureCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Destination Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="JFK"
                  maxLength={3}
                  value={formData.destinationCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      destinationCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledTime}
                onChange={(e) => {
                  // Store in datetime-local format (YYYY-MM-DDThh:mm)
                  // Will be converted to ISO when submitting
                  setFormData({ ...formData, scheduledTime: e.target.value });
                }}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
              />
              <p className="mt-1 text-xs text-slate-400">
                Select the scheduled departure date and time
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">
                  Error: {error.message.split("\n")[0]}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/5"
                disabled={isPending || isConfirming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-sky-500 hover:bg-sky-600"
                disabled={isPending || isConfirming}
              >
                {isPending
                  ? "Confirming..."
                  : isConfirming
                  ? "Creating..."
                  : "Create Market"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

