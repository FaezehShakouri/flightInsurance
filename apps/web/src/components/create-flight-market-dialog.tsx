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
    flightNumber: "1019",
    departureCode: "FRA",
    destinationCode: "CDG",
    airlineCode: "AF",
    scheduledTime: "2025-11-03T07:05",
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md border-blue-200 bg-white">
          <CardHeader>
            <CardTitle className="text-green-600">✓ Market Created!</CardTitle>
            <CardDescription className="text-gray-600">
              Your flight market has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs text-gray-600">Transaction Hash</p>
                <p className="break-all text-sm font-mono text-gray-900">{hash}</p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-blue-200 bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Create New Flight Market</CardTitle>
          <CardDescription className="text-gray-600">
            Add a new flight to start trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-gray-500">
                e.g., 03-11-2025 7:05 AM (Nov 3, 2025)
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-600">
                  Error: {error.message.split("\n")[0]}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isPending || isConfirming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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

