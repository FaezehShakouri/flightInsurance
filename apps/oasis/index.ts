const server = Bun.serve({
  port: 4500,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle OPTIONS preflight request
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // Resolve endpoint
    if (url.pathname === "/resolve" && req.method === "GET") {
      try {
        // Get query parameters
        const flightId = url.searchParams.get("flightId");
        const departureCode = url.searchParams.get("departureCode");
        const dateTime = url.searchParams.get("date"); // Format: YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM
        const airlineCode = url.searchParams.get("airlineCode");
        const flightNumber = url.searchParams.get("flightNumber");

        // Validate required parameters
        if (
          !flightId ||
          !departureCode ||
          !dateTime ||
          !airlineCode ||
          !flightNumber
        ) {
          return new Response(
            JSON.stringify({
              error: "Missing required parameters",
              required: [
                "flightId",
                "departureCode",
                "date",
                "airlineCode",
                "flightNumber",
              ],
            }),
            { status: 400, headers }
          );
        }

        // Extract just the date part (YYYY-MM-DD) for the API call
        const date = dateTime.split("T")[0].split(" ")[0];

        // Parse the scheduled time for comparison
        const scheduledDateTime = new Date(dateTime.replace(" ", "T"));

        // Make API call to Aviation Edge
        const apiKey = "2be650-5dfb75";
        const aviationEdgeUrl = `https://aviation-edge.com/v2/public/flightsHistory?key=${apiKey}&code=${departureCode}&type=departure&date_from=${date}&airline_iata=${airlineCode}&flight_num=${flightNumber}`;

        console.log(`Fetching flight data: ${aviationEdgeUrl}`);

        const response = await fetch(aviationEdgeUrl, {
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({
              error: "Aviation Edge API error",
              status: response.status,
              statusText: response.statusText,
            }),
            { status: response.status, headers }
          );
        }

        const flightData = await response.json();

        // Filter to find the specific flight by matching scheduled time
        let matchedFlight = null;
        let outcome = 0; // 0 = PENDING/NOT_FOUND, 1 = ON_TIME, 2 = DELAY_30, 3 = DELAY_120_PLUS, 4 = CANCELLED

        if (Array.isArray(flightData) && flightData.length > 0) {
          // Find flight that matches the scheduled time
          matchedFlight = flightData.find((flight: any) => {
            const flightScheduledTime = new Date(
              flight.departure?.scheduledTime?.replace("t", "T") || ""
            );

            // Match if within 5 minutes of scheduled time
            const timeDiff = Math.abs(
              flightScheduledTime.getTime() - scheduledDateTime.getTime()
            );
            return timeDiff < 5 * 60 * 1000; // 5 minutes tolerance
          });

          if (matchedFlight) {
            // Determine outcome based on delay only
            const departure = matchedFlight.departure;
            const delayMinutes = departure?.delay || 0;

            // Check if cancelled
            if (matchedFlight.status === "cancelled") {
              outcome = 4; // CANCELLED
            }
            // Check delay
            else if (delayMinutes >= 120) {
              outcome = 3; // DELAY_120_PLUS
            } else if (delayMinutes >= 30) {
              outcome = 2; // DELAY_30
            } else {
              outcome = 1; // ON_TIME (delay < 30 minutes)
            }
          }
        }

        // Return error if no matching flight found
        if (!matchedFlight) {
          return new Response(
            JSON.stringify({
              error: "No matching flight found",
              flightId,
              departureCode,
              date,
              scheduledDateTime: dateTime,
              airlineCode,
              flightNumber,
              outcome: 0,
            }),
            { status: 404, headers }
          );
        }

        // Return only the matched flight and outcome
        return new Response(
          JSON.stringify({
            flightId,
            flight: matchedFlight,
            outcome, // 0=NOT_FOUND, 1=ON_TIME, 2=DELAY_30, 3=DELAY_120_PLUS, 4=CANCELLED
          }),
          { status: 200, headers }
        );
      } catch (error) {
        console.error("Error:", error);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
          }),
          { status: 500, headers }
        );
      }
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
        { headers }
      );
    }

    // 404 for other routes
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers,
    });
  },
});

console.log(`🚀 Bun server running at http://localhost:${server.port}`);
console.log(`📡 Resolve endpoint: http://localhost:${server.port}/resolve`);
console.log(
  `   Example: http://localhost:${server.port}/resolve?flightId=0x123&departureCode=FRA&date=2025-11-03T07:05&airlineCode=AF&flightNumber=1019`
);
console.log(`   Or with space: ...&date=2025-11-03%2007:05 (URL encoded)`);
