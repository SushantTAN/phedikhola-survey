"use client";import {Skeleton} from "@/components/ui/skeleton";

import dynamic from "next/dynamic";
import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LatLng } from "@/components/shared/location-map";

// Leaflet touches `window`, so it must only load in the browser.
export const LocationMap = dynamic(() => import("@/components/shared/location-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
});

const toNum = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Latitude/longitude inputs kept in sync with a clickable OpenStreetMap. Values are strings (form-friendly). */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const lat = toNum(latitude);
  const lng = toNum(longitude);
  const point: LatLng | null = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((p) => onChange(String(round(p.coords.latitude)), String(round(p.coords.longitude))));
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input type="number" step="any" placeholder="e.g. 28.0123" value={latitude} onChange={(e) => onChange(e.target.value, longitude)} />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input type="number" step="any" placeholder="e.g. 83.8123" value={longitude} onChange={(e) => onChange(latitude, e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}><Crosshair />Use my location</Button>
        {(latitude || longitude) && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("", "")}><X />Clear</Button>}
        <span className="text-xs text-slate-500">Click the map or drag the pin to set the location.</span>
      </div>
      <LocationMap value={point} onChange={(p) => onChange(String(round(p.lat)), String(round(p.lng)))} />
    </div>
  );
}
