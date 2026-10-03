import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
export function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync("phedikhola.db");
  return dbPromise;
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

let initPromise: Promise<void> | null = null;
/** Creates / upgrades the local database. Safe to call many times; every screen can await it. */
export function initDb() {
  if (!initPromise) {
    initPromise = runInit().catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

async function runInit() {
  const db = await getDb();
  await db.execAsync(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS reference_data (
  type TEXT NOT NULL, id TEXT NOT NULL, code TEXT, label_en TEXT, label_ne TEXT, payload TEXT NOT NULL, updated_at TEXT,
  PRIMARY KEY(type,id)
);
CREATE TABLE IF NOT EXISTS citizens (
  client_uuid TEXT PRIMARY KEY, server_id TEXT UNIQUE, public_id TEXT, full_name TEXT NOT NULL, date_of_birth TEXT,
  approximate_age INTEGER, gender TEXT NOT NULL, phone TEXT, caste_group_code TEXT, caste_other TEXT, marital_status_code TEXT,
  occupation_code TEXT, occupation_other TEXT, living_status_code TEXT, household_foreign_employment INTEGER,
  category_ids TEXT NOT NULL DEFAULT '[]', ward_ids TEXT NOT NULL DEFAULT '[]', profile_photo_uri TEXT, profile_photo_uploaded INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1, sync_status TEXT NOT NULL DEFAULT 'pending', sync_error TEXT, deleted_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_citizens_name ON citizens(full_name);
CREATE INDEX IF NOT EXISTS idx_citizens_sync ON citizens(sync_status);
CREATE TABLE IF NOT EXISTS service_records (
  client_uuid TEXT PRIMARY KEY, server_id TEXT UNIQUE, citizen_client_uuid TEXT NOT NULL, ward_id TEXT NOT NULL,
  service_date TEXT NOT NULL, nepali_year INTEGER, nepali_month TEXT, systolic INTEGER, diastolic INTEGER,
  pulse_rate INTEGER, temperature_f REAL, latitude REAL, longitude REAL, altitude REAL, accuracy REAL,
  notes TEXT, other_health_problem TEXT, condition_ids TEXT NOT NULL DEFAULT '[]', medicines TEXT NOT NULL DEFAULT '[]',
  visit_photo_uri TEXT, visit_photo_uploaded INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending', sync_error TEXT, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(citizen_client_uuid) REFERENCES citizens(client_uuid)
);
CREATE INDEX IF NOT EXISTS idx_services_citizen ON service_records(citizen_client_uuid,service_date);
CREATE INDEX IF NOT EXISTS idx_services_sync ON service_records(sync_status);
`);
  // Additive upgrades for databases created by earlier app versions. Existing rows keep their data.
  await ensureColumn(db, "citizens", "ward_ids", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "citizens", "guardian_phone", "TEXT");
  await ensureColumn(db, "citizens", "tole_id", "TEXT");
  await ensureColumn(db, "citizens", "latitude", "REAL");
  await ensureColumn(db, "citizens", "longitude", "REAL");
  await ensureColumn(db, "service_records", "guardian_phone", "TEXT");
  await ensureColumn(db, "service_records", "needs_followup", "INTEGER NOT NULL DEFAULT 0");
}

export async function setMeta(key: string, value: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    key,
    value,
  );
}
export async function getMeta(key: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key=?",
    key,
  );
  return row?.value ?? null;
}

export type LocalCitizen = {
  client_uuid: string;
  server_id: string | null;
  public_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  approximate_age: number | null;
  gender: string;
  phone: string | null;
  guardian_phone: string | null;
  caste_group_code: string | null;
  caste_other: string | null;
  marital_status_code: string | null;
  occupation_code: string | null;
  occupation_other: string | null;
  living_status_code: string | null;
  household_foreign_employment: number | null;
  category_ids: string;
  ward_ids: string;
  tole_id: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_photo_uri: string | null;
  profile_photo_uploaded: number;
  version: number;
  sync_status: string;
  sync_error: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
export type LocalService = {
  client_uuid: string;
  server_id: string | null;
  citizen_client_uuid: string;
  ward_id: string;
  service_date: string;
  nepali_year: number | null;
  nepali_month: string | null;
  systolic: number | null;
  diastolic: number | null;
  pulse_rate: number | null;
  temperature_f: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  notes: string | null;
  other_health_problem: string | null;
  guardian_phone: string | null;
  needs_followup: number;
  condition_ids: string;
  medicines: string;
  visit_photo_uri: string | null;
  visit_photo_uploaded: number;
  version: number;
  sync_status: string;
  sync_error: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCitizens(q = "") {
  const db = await getDb();
  const like = `%${q}%`;
  return db.getAllAsync<LocalCitizen>(
    "SELECT * FROM citizens WHERE deleted_at IS NULL AND (full_name LIKE ? OR public_id LIKE ? OR phone LIKE ? OR guardian_phone LIKE ?) ORDER BY updated_at DESC LIMIT 500",
    like,
    like,
    like,
    like,
  );
}
export async function countCitizens() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) n FROM citizens WHERE deleted_at IS NULL",
  );
  return row?.n ?? 0;
}
export async function countServices() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) n FROM service_records WHERE deleted_at IS NULL",
  );
  return row?.n ?? 0;
}
export async function getCitizen(id: string) {
  const db = await getDb();
  return db.getFirstAsync<LocalCitizen>(
    "SELECT * FROM citizens WHERE client_uuid=? OR server_id=? OR public_id=?",
    id,
    id,
    id,
  );
}

export type CitizenInput = {
  fullName: string;
  dateOfBirth?: string | null;
  approximateAge?: number | null;
  gender: string;
  phone?: string | null;
  guardianPhone?: string | null;
  casteGroupCode?: string | null;
  casteOther?: string | null;
  maritalStatusCode?: string | null;
  occupationCode?: string | null;
  occupationOther?: string | null;
  livingStatusCode?: string | null;
  householdForeignEmployment?: boolean | null;
  categoryIds?: string[];
  wardIds?: string[];
  toleId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Local file URI of a newly taken photo, or the unchanged existing value. */
  profilePhotoUri?: string | null;
};

function citizenValues(c: CitizenInput) {
  return [
    c.fullName,
    c.dateOfBirth ?? null,
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
    JSON.stringify(c.categoryIds ?? []),
    JSON.stringify(c.wardIds ?? []),
    c.toleId ?? null,
    c.latitude ?? null,
    c.longitude ?? null,
  ];
}

/**
 * Timestamp for an edit. It is always later than the record's previous `updated_at`, even if two edits land in the
 * same millisecond or the clock moved backwards, because sync uses `updated_at` to notice edits made mid-sync.
 */
function nextUpdatedAt(previous?: string | null) {
  const now = Date.now();
  const before = previous ? Date.parse(previous) : NaN;
  return new Date(Number.isNaN(before) || now > before ? now : before + 1).toISOString();
}

export async function saveCitizen(c: CitizenInput & { clientUuid: string }) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO citizens(client_uuid,full_name,date_of_birth,approximate_age,gender,phone,guardian_phone,caste_group_code,caste_other,marital_status_code,occupation_code,occupation_other,living_status_code,household_foreign_employment,category_ids,ward_ids,tole_id,latitude,longitude,profile_photo_uri,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    c.clientUuid,
    ...citizenValues(c),
    c.profilePhotoUri ?? null,
    now,
    now,
  );
}

/**
 * Edits a citizen on the device and queues it for sync.
 * `version` is deliberately NOT changed: it is the server version this edit is based on, and the server
 * uses it to detect that someone else changed the record in the meantime.
 */
export async function updateCitizen(clientUuid: string, c: CitizenInput) {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ profile_photo_uri: string | null; updated_at: string }>(
    "SELECT profile_photo_uri,updated_at FROM citizens WHERE client_uuid=?",
    clientUuid,
  );
  if (!existing) throw new Error("Citizen not found on this device");
  const photoChanged = (c.profilePhotoUri ?? null) !== (existing.profile_photo_uri ?? null);
  await db.runAsync(
    `UPDATE citizens SET full_name=?,date_of_birth=?,approximate_age=?,gender=?,phone=?,guardian_phone=?,caste_group_code=?,caste_other=?,marital_status_code=?,occupation_code=?,occupation_other=?,living_status_code=?,household_foreign_employment=?,category_ids=?,ward_ids=?,tole_id=?,latitude=?,longitude=?,
       profile_photo_uri=?,profile_photo_uploaded=CASE WHEN ? THEN 0 ELSE profile_photo_uploaded END,
       sync_status='pending',sync_error=NULL,updated_at=? WHERE client_uuid=?`,
    ...citizenValues(c),
    c.profilePhotoUri ?? null,
    photoChanged ? 1 : 0,
    nextUpdatedAt(existing.updated_at),
    clientUuid,
  );
}

export async function listServices(citizenClientUuid?: string) {
  const db = await getDb();
  return citizenClientUuid
    ? db.getAllAsync<LocalService>(
        "SELECT * FROM service_records WHERE citizen_client_uuid=? AND deleted_at IS NULL ORDER BY service_date DESC",
        citizenClientUuid,
      )
    : db.getAllAsync<LocalService>(
        "SELECT * FROM service_records WHERE deleted_at IS NULL ORDER BY service_date DESC LIMIT 500",
      );
}
export async function getService(id: string) {
  const db = await getDb();
  return db.getFirstAsync<LocalService>(
    "SELECT * FROM service_records WHERE client_uuid=? OR server_id=?",
    id,
    id,
  );
}

export type ServiceInput = {
  citizenClientUuid: string;
  wardId: string;
  serviceDate: string;
  nepaliYear?: number | null;
  nepaliMonth?: string | null;
  systolic?: number | null;
  diastolic?: number | null;
  pulseRate?: number | null;
  temperatureF?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  accuracy?: number | null;
  notes?: string | null;
  otherHealthProblem?: string | null;
  guardianPhone?: string | null;
  needsFollowup?: boolean;
  conditionIds?: string[];
  medicines?: unknown[];
  visitPhotoUri?: string | null;
};

function serviceValues(s: ServiceInput) {
  return [
    s.wardId,
    s.serviceDate,
    s.nepaliYear ?? null,
    s.nepaliMonth ?? null,
    s.systolic ?? null,
    s.diastolic ?? null,
    s.pulseRate ?? null,
    s.temperatureF ?? null,
    s.latitude ?? null,
    s.longitude ?? null,
    s.altitude ?? null,
    s.accuracy ?? null,
    s.notes ?? null,
    s.otherHealthProblem ?? null,
    s.guardianPhone ?? null,
    s.needsFollowup ? 1 : 0,
    JSON.stringify(s.conditionIds ?? []),
    JSON.stringify(s.medicines ?? []),
  ];
}

export async function saveService(s: ServiceInput & { clientUuid: string }) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO service_records(client_uuid,citizen_client_uuid,ward_id,service_date,nepali_year,nepali_month,systolic,diastolic,pulse_rate,temperature_f,latitude,longitude,altitude,accuracy,notes,other_health_problem,guardian_phone,needs_followup,condition_ids,medicines,visit_photo_uri,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    s.clientUuid,
    s.citizenClientUuid,
    ...serviceValues(s),
    s.visitPhotoUri ?? null,
    now,
    now,
  );
}

/** Edits a service record on the device and queues it for sync. `version` is left alone (see updateCitizen). */
export async function updateService(clientUuid: string, s: ServiceInput) {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ visit_photo_uri: string | null; updated_at: string }>(
    "SELECT visit_photo_uri,updated_at FROM service_records WHERE client_uuid=?",
    clientUuid,
  );
  if (!existing) throw new Error("Service record not found on this device");
  const photoChanged = (s.visitPhotoUri ?? null) !== (existing.visit_photo_uri ?? null);
  await db.runAsync(
    `UPDATE service_records SET ward_id=?,service_date=?,nepali_year=?,nepali_month=?,systolic=?,diastolic=?,pulse_rate=?,temperature_f=?,latitude=?,longitude=?,altitude=?,accuracy=?,notes=?,other_health_problem=?,guardian_phone=?,needs_followup=?,condition_ids=?,medicines=?,
       visit_photo_uri=?,visit_photo_uploaded=CASE WHEN ? THEN 0 ELSE visit_photo_uploaded END,
       sync_status='pending',sync_error=NULL,updated_at=? WHERE client_uuid=?`,
    ...serviceValues(s),
    s.visitPhotoUri ?? null,
    photoChanged ? 1 : 0,
    nextUpdatedAt(existing.updated_at),
    clientUuid,
  );
}

export async function listReference(type: string) {
  const db = await getDb();
  return db.getAllAsync<{
    id: string;
    code: string | null;
    label_en: string | null;
    label_ne: string | null;
    payload: string;
  }>("SELECT * FROM reference_data WHERE type=? ORDER BY label_en", type);
}
export async function replaceReference(
  type: string,
  items: any[],
  map: (x: any) => {
    id: string;
    code?: string;
    labelEn?: string;
    labelNe?: string;
  },
) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM reference_data WHERE type=?", type);
    for (const item of items) {
      const m = map(item);
      await db.runAsync(
        "INSERT INTO reference_data(type,id,code,label_en,label_ne,payload,updated_at) VALUES(?,?,?,?,?,?,?)",
        type,
        m.id,
        m.code ?? null,
        m.labelEn ?? null,
        m.labelNe ?? null,
        JSON.stringify(item),
        item.updatedAt ?? new Date().toISOString(),
      );
    }
  });
}

export async function syncCounts() {
  const db = await getDb();
  const c = await db.getAllAsync<{ sync_status: string; n: number }>(
    "SELECT sync_status,COUNT(*) n FROM (SELECT sync_status FROM citizens UNION ALL SELECT sync_status FROM service_records) GROUP BY sync_status",
  );
  return Object.fromEntries(c.map((x) => [x.sync_status, x.n]));
}
