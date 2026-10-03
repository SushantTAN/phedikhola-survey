import { api } from "../api/client";
import {
  getDb,
  getMeta,
  replaceReference,
  setMeta,
  type LocalCitizen,
  type LocalService,
} from "../db";
import { uploadLocalImage } from "./storage";

function citizenPayload(c: LocalCitizen) {
  const cats = JSON.parse(c.category_ids || "[]");
  return {
    clientUuid: c.client_uuid,
    publicId: c.public_id,
    fullName: c.full_name,
    dateOfBirth: c.date_of_birth,
    approximateAge: c.approximate_age,
    gender: c.gender,
    phone: c.phone,
    guardianPhone: c.guardian_phone,
    casteGroupCode: c.caste_group_code,
    casteOther: c.caste_other,
    maritalStatusCode: c.marital_status_code,
    occupationCode: c.occupation_code,
    occupationOther: c.occupation_other,
    livingStatusCode: c.living_status_code,
    householdForeignEmployment:
      c.household_foreign_employment == null
        ? null
        : Boolean(c.household_foreign_employment),
    categoryId: cats[0] ?? null,
    wardId: c.ward_id,
    toleId: c.tole_id,
    latitude: c.latitude,
    longitude: c.longitude,
    // Photos are uploaded separately once the record exists on the server; the server keeps its stored URL.
    version: c.version,
    deletedAt: c.deleted_at,
  };
}
function servicePayload(s: LocalService) {
  return {
    clientUuid: s.client_uuid,
    citizenClientUuid: s.citizen_client_uuid,
    wardId: s.ward_id,
    serviceDate: s.service_date,
    nepaliYear: s.nepali_year,
    nepaliMonth: s.nepali_month,
    systolic: s.systolic,
    diastolic: s.diastolic,
    pulseRate: s.pulse_rate,
    temperatureF: s.temperature_f,
    latitude: s.latitude,
    longitude: s.longitude,
    altitude: s.altitude,
    accuracy: s.accuracy,
    notes: s.notes,
    otherHealthProblem: s.other_health_problem,
    guardianPhone: s.guardian_phone,
    needsFollowup: Boolean(s.needs_followup),
    conditionIds: JSON.parse(s.condition_ids || "[]"),
    medicines: JSON.parse(s.medicines || "[]"),
    version: s.version,
    deletedAt: s.deleted_at,
  };
}

const asNumber = (v: unknown) => (v == null || v === "" ? null : Number(v));
const dateOnly = (v: unknown) => (v ? String(v).slice(0, 10) : null);

let running: Promise<unknown> | null = null;

/** Pushes local changes, then downloads server changes. Calling it again while a sync runs joins that run. */
export function syncNow(deviceId = "android-device") {
  if (!running) {
    running = runSync(deviceId).finally(() => {
      running = null;
    });
  }
  return running as ReturnType<typeof runSync>;
}

async function runSync(deviceId: string) {
  const db = await getDb();
  // 'syncing' rows are included on purpose: if the app was closed mid-sync they would otherwise stay stuck.
  const citizens = await db.getAllAsync<LocalCitizen>(
    "SELECT * FROM citizens WHERE sync_status IN ('pending','failed','syncing') ORDER BY created_at",
  );
  const services = await db.getAllAsync<LocalService>(
    "SELECT * FROM service_records WHERE sync_status IN ('pending','failed','syncing') ORDER BY created_at",
  );
  // Only the rows being sent are marked; records saved while the request is in flight stay 'pending'.
  for (const c of citizens)
    await db.runAsync("UPDATE citizens SET sync_status='syncing' WHERE client_uuid=?", c.client_uuid);
  for (const s of services)
    await db.runAsync("UPDATE service_records SET sync_status='syncing' WHERE client_uuid=?", s.client_uuid);
  const sentUpdatedAt = new Map<string, string>([
    ...citizens.map((c) => [c.client_uuid, c.updated_at] as [string, string]),
    ...services.map((s) => [s.client_uuid, s.updated_at] as [string, string]),
  ]);

  try {
    const pushed = await api<any>("/sync/push", {
      method: "POST",
      timeoutMs: 120_000,
      body: JSON.stringify({
        deviceId,
        citizens: citizens.map(citizenPayload),
        serviceRecords: services.map(servicePayload),
      }),
    });

    // A record edited while the request was running keeps its 'pending' status so the edit is sent next time.
    for (const r of pushed.data.citizens ?? [])
      await db.runAsync(
        `UPDATE citizens SET server_id=COALESCE(?,server_id),public_id=COALESCE(?,public_id),version=COALESCE(?,version),
           sync_status=CASE WHEN updated_at=? THEN ? ELSE 'pending' END,sync_error=? WHERE client_uuid=?`,
        r.serverId ?? null,
        r.publicId ?? null,
        r.version ?? null,
        sentUpdatedAt.get(r.clientUuid) ?? "",
        r.status,
        r.error ?? null,
        r.clientUuid,
      );
    for (const r of pushed.data.serviceRecords ?? [])
      await db.runAsync(
        `UPDATE service_records SET server_id=COALESCE(?,server_id),version=COALESCE(?,version),
           sync_status=CASE WHEN updated_at=? THEN ? ELSE 'pending' END,sync_error=? WHERE client_uuid=?`,
        r.serverId ?? null,
        r.version ?? null,
        sentUpdatedAt.get(r.clientUuid) ?? "",
        r.status,
        r.error ?? null,
        r.clientUuid,
      );

    const photoCitizens = await db.getAllAsync<LocalCitizen>(
      "SELECT * FROM citizens WHERE sync_status='synced' AND profile_photo_uri IS NOT NULL AND profile_photo_uploaded=0 AND server_id IS NOT NULL",
    );
    for (const c of photoCitizens) {
      try {
        const url = await uploadLocalImage(c.profile_photo_uri!, "citizen", c.server_id!);
        const updated = await api<any>(`/citizens/${c.server_id}`, {
          method: "PATCH",
          body: JSON.stringify({ profilePhotoUrl: url, version: c.version }),
        });
        await db.runAsync(
          "UPDATE citizens SET profile_photo_uploaded=1,profile_photo_uri=?,version=?,sync_error=NULL WHERE client_uuid=?",
          url,
          updated.data.version,
          c.client_uuid,
        );
      } catch (e) {
        await db.runAsync(
          "UPDATE citizens SET sync_error=? WHERE client_uuid=?",
          e instanceof Error ? e.message : "Photo upload failed",
          c.client_uuid,
        );
      }
    }
    const photoServices = await db.getAllAsync<LocalService>(
      "SELECT * FROM service_records WHERE sync_status='synced' AND visit_photo_uri IS NOT NULL AND visit_photo_uploaded=0 AND server_id IS NOT NULL",
    );
    for (const s of photoServices) {
      try {
        const url = await uploadLocalImage(s.visit_photo_uri!, "service", s.server_id!);
        const updated = await api<any>(`/services/${s.server_id}`, {
          method: "PATCH",
          body: JSON.stringify({ visitPhotoUrl: url, version: s.version }),
        });
        await db.runAsync(
          "UPDATE service_records SET visit_photo_uploaded=1,visit_photo_uri=?,version=?,sync_error=NULL WHERE client_uuid=?",
          url,
          updated.data.version,
          s.client_uuid,
        );
      } catch (e) {
        await db.runAsync(
          "UPDATE service_records SET sync_error=? WHERE client_uuid=?",
          e instanceof Error ? e.message : "Photo upload failed",
          s.client_uuid,
        );
      }
    }

    // ---- pull, one page at a time (the server caps each page)
    const startedSince = (await getMeta("last_sync_at")) ?? "1970-01-01T00:00:00.000Z";
    let since = startedSince;
    let inclusive = false;
    let firstPage = true;
    let nextLastSync: string | null = null;
    let pulledCitizens = 0;
    let pulledServices = 0;
    const pulledServiceRows: any[] = [];

    for (let page = 0; page < 200; page++) {
      const pulled = await api<any>(
        `/sync/pull?paged=true&since=${encodeURIComponent(since)}${inclusive ? "&inclusive=true" : ""}${firstPage ? "" : "&reference=false"}`,
        { timeoutMs: 120_000 },
      );
      const data = pulled.data;
      if (firstPage) {
        // The next sync starts from the moment the first request was served, so nothing changed since is missed.
        nextLastSync = data.serverTime ?? new Date().toISOString();
        if (data.referenceData) await saveReferenceData(data.referenceData);
        firstPage = false;
      }
      for (const c of data.citizens ?? []) {
        await upsertPulledCitizen(c);
        pulledCitizens++;
      }
      // Services are written after every citizen page is in, because a service can arrive before its citizen.
      pulledServiceRows.push(...(data.serviceRecords ?? []));
      if (!data.hasMore) break;
      if (data.nextSince === since && inclusive)
        throw new Error("Sync could not move past a large batch of identical changes");
      since = data.nextSince;
      inclusive = true;
    }
    for (const s of pulledServiceRows) {
      if (await upsertPulledService(s)) pulledServices++;
    }
    await setMeta("last_sync_at", nextLastSync ?? new Date().toISOString());
    return { pushed: pushed.data, pulled: { citizens: pulledCitizens, serviceRecords: pulledServices } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await db.runAsync("UPDATE citizens SET sync_status='failed',sync_error=? WHERE sync_status='syncing'", message);
    await db.runAsync("UPDATE service_records SET sync_status='failed',sync_error=? WHERE sync_status='syncing'", message);
    throw e;
  }
}

async function saveReferenceData(ref: any) {
  await replaceReference("ward", ref.wards ?? [], (x) => ({ id: x.id, code: x.code, labelEn: x.nameEn, labelNe: x.nameNe }));
  await replaceReference("category", ref.categories ?? [], (x) => ({ id: x.id, code: x.code, labelEn: x.nameEn, labelNe: x.nameNe }));
  await replaceReference("condition", ref.conditions ?? [], (x) => ({ id: x.id, code: x.code, labelEn: x.nameEn, labelNe: x.nameNe }));
  await replaceReference("medicine", ref.medicines ?? [], (x) => ({
    id: x.id,
    code: x.code,
    labelEn: [x.name, x.strength].filter(Boolean).join(" "),
    labelNe: x.name,
  }));
  await replaceReference("unit", ref.units ?? [], (x) => ({ id: x.id, code: x.code, labelEn: x.nameEn, labelNe: x.nameNe }));
  await replaceReference("tole", ref.toles ?? [], (x) => ({ id: x.id, labelEn: x.name, labelNe: x.name }));
  if (ref.appVersion) await setMeta("app_version", JSON.stringify(ref.appVersion));
}

// Rows with unsent local changes ('pending'/'syncing'/'failed') are never overwritten by the server copy.
async function upsertPulledCitizen(c: any) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO citizens(client_uuid,server_id,public_id,full_name,date_of_birth,approximate_age,gender,phone,guardian_phone,caste_group_code,caste_other,marital_status_code,occupation_code,occupation_other,living_status_code,household_foreign_employment,category_ids,ward_id,tole_id,latitude,longitude,profile_photo_uri,profile_photo_uploaded,version,sync_status,sync_error,deleted_at,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced',NULL,?,?,?)
     ON CONFLICT(client_uuid) DO UPDATE SET server_id=excluded.server_id,public_id=excluded.public_id,full_name=excluded.full_name,date_of_birth=excluded.date_of_birth,approximate_age=excluded.approximate_age,gender=excluded.gender,phone=excluded.phone,guardian_phone=excluded.guardian_phone,caste_group_code=excluded.caste_group_code,caste_other=excluded.caste_other,marital_status_code=excluded.marital_status_code,occupation_code=excluded.occupation_code,occupation_other=excluded.occupation_other,living_status_code=excluded.living_status_code,household_foreign_employment=excluded.household_foreign_employment,category_ids=excluded.category_ids,ward_id=excluded.ward_id,tole_id=excluded.tole_id,latitude=excluded.latitude,longitude=excluded.longitude,
       profile_photo_uri=CASE WHEN citizens.profile_photo_uploaded=0 AND citizens.profile_photo_uri IS NOT NULL THEN citizens.profile_photo_uri ELSE excluded.profile_photo_uri END,
       profile_photo_uploaded=CASE WHEN citizens.profile_photo_uploaded=0 AND citizens.profile_photo_uri IS NOT NULL THEN 0 ELSE excluded.profile_photo_uploaded END,
       version=excluded.version,sync_status='synced',sync_error=NULL,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at
     WHERE citizens.sync_status NOT IN ('pending','syncing','failed')`,
    c.clientUuid,
    c.id,
    c.publicId,
    c.fullName,
    dateOnly(c.dateOfBirth),
    c.approximateAge ?? null,
    c.gender,
    c.phone ?? null,
    c.guardianPhone ?? null,
    c.casteGroupCode ?? null,
    c.casteOther ?? null,
    c.maritalStatusCode ?? null,
    c.occupationCode ?? null,
    c.occupationOther ?? null,
    c.livingStatusCode ?? null,
    c.householdForeignEmployment == null ? null : c.householdForeignEmployment ? 1 : 0,
    JSON.stringify((c.categories ?? []).map((x: any) => x.categoryId).slice(0, 1)),
    c.wardId ?? null,
    c.toleId ?? null,
    asNumber(c.latitude),
    asNumber(c.longitude),
    c.profilePhotoUrl ?? null,
    c.profilePhotoUrl ? 1 : 0,
    c.version,
    c.deletedAt ?? null,
    c.createdAt,
    c.updatedAt,
  );
}

async function upsertPulledService(s: any) {
  const db = await getDb();
  const parent = await db.getFirstAsync<{ client_uuid: string }>(
    "SELECT client_uuid FROM citizens WHERE server_id=?",
    s.citizenId,
  );
  if (!parent) return false;
  await db.runAsync(
    `INSERT INTO service_records(client_uuid,server_id,citizen_client_uuid,ward_id,service_date,nepali_year,nepali_month,systolic,diastolic,pulse_rate,temperature_f,latitude,longitude,altitude,accuracy,notes,other_health_problem,guardian_phone,needs_followup,condition_ids,medicines,visit_photo_uri,visit_photo_uploaded,version,sync_status,sync_error,deleted_at,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced',NULL,?,?,?)
     ON CONFLICT(client_uuid) DO UPDATE SET server_id=excluded.server_id,citizen_client_uuid=excluded.citizen_client_uuid,ward_id=excluded.ward_id,service_date=excluded.service_date,nepali_year=excluded.nepali_year,nepali_month=excluded.nepali_month,systolic=excluded.systolic,diastolic=excluded.diastolic,pulse_rate=excluded.pulse_rate,temperature_f=excluded.temperature_f,latitude=excluded.latitude,longitude=excluded.longitude,altitude=excluded.altitude,accuracy=excluded.accuracy,notes=excluded.notes,other_health_problem=excluded.other_health_problem,guardian_phone=excluded.guardian_phone,needs_followup=excluded.needs_followup,condition_ids=excluded.condition_ids,medicines=excluded.medicines,
       visit_photo_uri=CASE WHEN service_records.visit_photo_uploaded=0 AND service_records.visit_photo_uri IS NOT NULL THEN service_records.visit_photo_uri ELSE excluded.visit_photo_uri END,
       visit_photo_uploaded=CASE WHEN service_records.visit_photo_uploaded=0 AND service_records.visit_photo_uri IS NOT NULL THEN 0 ELSE excluded.visit_photo_uploaded END,
       version=excluded.version,sync_status='synced',sync_error=NULL,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at
     WHERE service_records.sync_status NOT IN ('pending','syncing','failed')`,
    s.clientUuid,
    s.id,
    parent.client_uuid,
    s.wardId,
    s.serviceDate,
    s.nepaliYear ?? null,
    s.nepaliMonth ?? null,
    s.systolic ?? null,
    s.diastolic ?? null,
    s.pulseRate ?? null,
    asNumber(s.temperatureF),
    asNumber(s.latitude),
    asNumber(s.longitude),
    asNumber(s.altitude),
    asNumber(s.accuracy),
    s.notes ?? null,
    s.otherHealthProblem ?? null,
    s.guardianPhone ?? null,
    s.needsFollowup ? 1 : 0,
    JSON.stringify((s.conditions ?? []).map((x: any) => x.conditionId)),
    JSON.stringify(
      (s.medicines ?? []).map((m: any) => ({
        medicineId: m.medicineId,
        quantity: Number(m.quantity),
        unit: m.unit,
        otherMedicineName: m.otherMedicineName,
      })),
    ),
    s.visitPhotoUrl ?? null,
    s.visitPhotoUrl ? 1 : 0,
    s.version,
    s.deletedAt ?? null,
    s.createdAt,
    s.updatedAt,
  );
  return true;
}
