"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// Webpack/Turbopack can't resolve Leaflet's default marker images, so point at the CDN copies.
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export type LatLng = { lat: number; lng: number };

// Phedikhola area (Syangja, Nepal) as the default view.
const DEFAULT_CENTER: LatLng = { lat: 28.0, lng: 83.8 };

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView(value, Math.max(map.getZoom(), 15));
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function LocationMap({
  value,
  onChange,
  height = 320,
}: {
  value: LatLng | null;
  onChange?: (p: LatLng) => void;
  height?: number;
}) {
  return (
    <MapContainer
      center={value ?? DEFAULT_CENTER}
      zoom={value ? 15 : 11}
      scrollWheelZoom
      style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onChange && <ClickHandler onPick={onChange} />}
      {value && (
        <Marker
          position={value}
          icon={icon}
          draggable={!!onChange}
          eventHandlers={onChange ? { dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onChange({ lat: p.lat, lng: p.lng }); } } : undefined}
        />
      )}
      <Recenter value={value} />
    </MapContainer>
  );
}
