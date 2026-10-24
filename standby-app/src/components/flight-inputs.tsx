"use client";

import { useState } from "react";
import ConciergePanel from "@/components/concierge-panel";
import type { FlightResult } from "@/lib/concierge";
import { Airport } from "@/lib/airports";

interface FlightInputsProps {
  onResolved: (result: FlightResult) => void;
  onResult: (result: FlightResult | null) => void;
  originAirport: Airport;
  onSelectOrigin?: (airport: Airport) => void;
  destinationAirport: Airport;
  onSelectDestination?: (airport: Airport) => void;
  layoverCount?: 0 | 1 | 2;
  onChangeLayoverCount?: (count: 0 | 1 | 2) => void;
  layoverAirport1?: Airport;
  onSelectLayover1?: (airport: Airport) => void;
  layoverAirport2?: Airport | null;
  onSelectLayover2?: (airport: Airport | null) => void;
}

export default function FlightInputs({
  onResolved,
  onResult,
  originAirport,
  destinationAirport,
}: FlightInputsProps) {
  const [arrivalDate, setArrivalDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const [arrivalHour, setArrivalHour] = useState("19:00");

  return (
    <div className="w-full max-w-xl">
      <ConciergePanel
        onResult={onResult}
        routeRequest={`From ${originAirport.iata} to ${destinationAirport.iata} on ${arrivalDate} at ${arrivalHour}`}
        onResolved={(result) => {
          const scheduled = result.selected_flight?.scheduled_departure;
          if (scheduled) {
            setArrivalDate(scheduled.slice(0, 10));
            setArrivalHour(scheduled.slice(11, 16));
          }
          onResolved(result);
        }}
      />
    </div>
  );
}
