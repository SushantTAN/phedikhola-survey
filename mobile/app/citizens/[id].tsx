import { useCallback, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "@/src/components/text";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, Card, Chip, H1, Screen, SectionTitle, StatusBadge } from "@/src/components/ui";
import {
  getCitizen,
  listReference,
  listServices,
  type LocalCitizen,
  type LocalService,
} from "@/src/db";
import { bloodPressureStatus, temperatureStatus } from "@/src/lib/health";
import { formatBs, formatBsWithAd } from "@/src/lib/nepali-date";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ width: 130, color: "#64748b" }}>{label}</Text>
      <Text style={{ flex: 1, fontWeight: "600" }}>{value === null || value === undefined || value === "" ? "—" : String(value)}</Text>
    </View>
  );
}

const pretty = (v: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replaceAll("_", " ") : null);

export default function CitizenDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<LocalCitizen | null>(null);
  const [services, setServices] = useState<LocalService[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      (async () => {
        const citizen = await getCitizen(id);
        setC(citizen ?? null);
        if (citizen) setServices(await listServices(citizen.client_uuid));
        const refs = await Promise.all([listReference("ward"), listReference("category"), listReference("tole")]);
        const map: Record<string, string> = {};
        for (const list of refs) for (const r of list) map[r.id] = r.label_en || r.label_ne || r.code || r.id;
        setNames(map);
        setLoaded(true);
      })();
    }, [id]),
  );

  if (!c)
    return (
      <Screen>
        <Text>{loaded ? "Citizen not found." : "Loading…"}</Text>
      </Screen>
    );

  const categoryId = JSON.parse(c.category_ids || "[]")[0] as string | undefined;
  const wardIds = JSON.parse(c.ward_ids || "[]") as string[];
  const hasLocation = c.latitude != null && c.longitude != null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#047857", fontWeight: "700" }}>{c.public_id || "Pending public ID"}</Text>
          <H1>{c.full_name}</H1>
        </View>
        <StatusBadge status={c.sync_status} />
      </View>
      {c.sync_error ? <Text style={{ color: "#dc2626" }}>{c.sync_error}</Text> : null}

      <Card>
        {c.profile_photo_uri ? (
          <Image source={{ uri: c.profile_photo_uri }} style={{ height: 180, borderRadius: 12 }} />
        ) : null}
        <SectionTitle>Profile</SectionTitle>
        <Row label="Gender" value={pretty(c.gender)} />
        <Row label="Date of birth" value={c.date_of_birth ? formatBsWithAd(c.date_of_birth) : null} />
        <Row label="Age" value={c.approximate_age} />
        <Row label="Phone" value={c.phone} />
        <Row label="Guardian mobile" value={c.guardian_phone} />
        <Row label="Category" value={categoryId ? names[categoryId] ?? "Assigned" : null} />
        <Row label="Ward(s)" value={wardIds.map((w) => names[w] ?? w).join(", ")} />
        <Row label="Tole" value={c.tole_id ? names[c.tole_id] ?? "Assigned" : null} />
        <Row label="Location" value={hasLocation ? `${c.latitude!.toFixed(6)}, ${c.longitude!.toFixed(6)}` : null} />
      </Card>
      <Card>
        <SectionTitle>Household details</SectionTitle>
        <Row label="Caste / group" value={c.caste_group_code === "OTHER" ? c.caste_other || "Other" : pretty(c.caste_group_code)} />
        <Row label="Marital status" value={pretty(c.marital_status_code)} />
        <Row label="Occupation" value={c.occupation_code === "OTHER" ? c.occupation_other || "Other" : pretty(c.occupation_code)} />
        <Row label="Living status" value={pretty(c.living_status_code)} />
        <Row
          label="Foreign employment"
          value={c.household_foreign_employment == null ? null : c.household_foreign_employment ? "Yes" : "No"}
        />
      </Card>

      <Button
        variant="outline"
        title="Edit citizen"
        onPress={() => router.push({ pathname: "/citizens/edit", params: { id: c.client_uuid } })}
      />
      <Button
        title="Add service record"
        onPress={() => router.push({ pathname: "/service/new", params: { citizen: c.client_uuid } })}
      />
      <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 8 }}>Service history</Text>
      {services.length === 0 && <Text style={{ color: "#64748b" }}>No service records on this device.</Text>}
      {services.map((s) => {
        const bp = bloodPressureStatus(s.systolic, s.diastolic);
        const temp = temperatureStatus(s.temperature_f);
        return (
          <Card key={s.client_uuid}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>{formatBs(s.service_date)}</Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>{s.service_date.slice(0, 10)}</Text>
              </View>
              <StatusBadge status={s.sync_status} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <Text>BP: {s.systolic && s.diastolic ? `${s.systolic}/${s.diastolic}` : "—"}</Text>
              {bp && bp !== "invalid" ? <Chip label={bp.chip} tone={bp.tone} /> : null}
            </View>
            <Text>Pulse: {s.pulse_rate ?? "—"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <Text>Temperature: {s.temperature_f ?? "—"} °F</Text>
              {temp && temp !== "invalid" ? <Chip label={temp.chip} tone={temp.tone} /> : null}
            </View>
            <Text style={{ color: "#64748b" }}>
              Conditions: {JSON.parse(s.condition_ids || "[]").length} · Medicines: {JSON.parse(s.medicines || "[]").length}
            </Text>
            {s.guardian_phone ? <Text style={{ color: "#64748b" }}>Guardian mobile: {s.guardian_phone}</Text> : null}
            {s.needs_followup ? <Chip label="Needs follow-up" tone="orange" /> : null}
            {s.sync_error ? <Text style={{ color: "#dc2626" }}>{s.sync_error}</Text> : null}
            <Pressable onPress={() => router.push({ pathname: "/service/edit", params: { id: s.client_uuid } })}>
              <Text style={{ color: "#047857", fontWeight: "700" }}>Edit service record</Text>
            </Pressable>
          </Card>
        );
      })}
    </Screen>
  );
}
