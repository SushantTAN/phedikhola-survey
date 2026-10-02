"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { NepaliCalendarProvider } from "nepali-bs-calendar-react";
import { nepaliCalendarData } from "@/lib/nepali-calendar-data";
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <NepaliCalendarProvider data={nepaliCalendarData}>
        {children}
      </NepaliCalendarProvider>
    </QueryClientProvider>
  );
}
