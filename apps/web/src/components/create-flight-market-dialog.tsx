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

export function CreateFlightMarketDialog({
  onSuccess,
}: CreateFlightMarketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    flightNumber: "1019",
    departureCode: "FRA",
    destinationCode: "CDG",
    airlineCode: "AF",
    scheduledTime: "2025-11-03T07:05",
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert datetime-local format to ISO string while preserving local time
      // datetime-local gives us "YYYY-MM-DDTHH:MM" in local time
      // We need to convert it to ISO format without timezone conversion
      let isoTime = "";
      if (formData.scheduledTime) {
        // Append seconds and milliseconds, then 'Z' to indicate UTC without conversion
        // This preserves the time as entered by the user
        isoTime = formData.scheduledTime + ":00.000Z";
      }

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
      flightNumber: "1019",
      departureCode: "FRA",
      destinationCode: "CDG",
      airlineCode: "AF",
      scheduledTime: "2025-11-03T07:05",
    });
    // Reset the transaction state
    reset();
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-green-400">✓ Market Created!</CardTitle>
            <CardDescription className="text-gray-300">
              Your flight market has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
                <p className="text-xs text-gray-400">Transaction Hash</p>
                <p className="break-all text-sm font-mono text-gray-200">
                  {hash}
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
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
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
      >
        + Create New Market
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-white">Create New Flight Market</CardTitle>
          <CardDescription className="text-gray-300">
            Add a new flight to start trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Airline Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="AF"
                  maxLength={3}
                  value={formData.airlineCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      airlineCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Flight Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="1019"
                  value={formData.flightNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, flightNumber: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Departure Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="FRA"
                  maxLength={3}
                  value={formData.departureCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departureCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Destination Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="CDG"
                  maxLength={3}
                  value={formData.destinationCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      destinationCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                required
                placeholder="2025-11-03T07:05"
                value={formData.scheduledTime}
                onChange={(e) => {
                  // Store in datetime-local format (YYYY-MM-DDThh:mm)
                  // Will be converted to ISO when submitting
                  setFormData({ ...formData, scheduledTime: e.target.value });
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
              <p className="mt-1 text-xs text-gray-400">
                e.g., 03-11-2025 7:05 AM (Nov 3, 2025)
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
                className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700"
                disabled={isPending || isConfirming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
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
