import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
export function getDb(){ if(!dbPromise) dbPromise=SQLite.openDatabaseAsync("phedikhola.db"); return dbPromise; }

export async function initDb(){ const db=await getDb(); await db.execAsync(`
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
  const citizenColumns=await db.getAllAsync<{name:string}>("PRAGMA table_info(citizens)");
  if(!citizenColumns.some(column=>column.name==="ward_ids")){
    await db.execAsync("ALTER TABLE citizens ADD COLUMN ward_ids TEXT NOT NULL DEFAULT '[]'");
  }
}

export async function setMeta(key:string,value:string){const db=await getDb();await db.runAsync("INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",key,value);}
export async function getMeta(key:string){const db=await getDb();const row=await db.getFirstAsync<{value:string}>("SELECT value FROM metadata WHERE key=?",key);return row?.value??null;}

export type LocalCitizen={client_uuid:string;server_id:string|null;public_id:string|null;full_name:string;date_of_birth:string|null;approximate_age:number|null;gender:string;phone:string|null;caste_group_code:string|null;caste_other:string|null;marital_status_code:string|null;occupation_code:string|null;occupation_other:string|null;living_status_code:string|null;household_foreign_employment:number|null;category_ids:string;ward_ids:string;profile_photo_uri:string|null;profile_photo_uploaded:number;version:number;sync_status:string;sync_error:string|null;deleted_at:string|null;created_at:string;updated_at:string};
export type LocalService={client_uuid:string;server_id:string|null;citizen_client_uuid:string;ward_id:string;service_date:string;nepali_year:number|null;nepali_month:string|null;systolic:number|null;diastolic:number|null;pulse_rate:number|null;temperature_f:number|null;latitude:number|null;longitude:number|null;altitude:number|null;accuracy:number|null;notes:string|null;other_health_problem:string|null;condition_ids:string;medicines:string;visit_photo_uri:string|null;visit_photo_uploaded:number;version:number;sync_status:string;sync_error:string|null;deleted_at:string|null;created_at:string;updated_at:string};

export async function listCitizens(q=""){const db=await getDb();return db.getAllAsync<LocalCitizen>("SELECT * FROM citizens WHERE deleted_at IS NULL AND (full_name LIKE ? OR public_id LIKE ? OR phone LIKE ?) ORDER BY updated_at DESC LIMIT 500",`%${q}%`,`%${q}%`,`%${q}%`);}
export async function getCitizen(id:string){const db=await getDb();return db.getFirstAsync<LocalCitizen>("SELECT * FROM citizens WHERE client_uuid=? OR server_id=? OR public_id=?",id,id,id);}
export async function saveCitizen(c:{clientUuid:string;fullName:string;dateOfBirth?:string|null;approximateAge?:number|null;gender:string;phone?:string|null;casteGroupCode?:string|null;casteOther?:string|null;maritalStatusCode?:string|null;occupationCode?:string|null;occupationOther?:string|null;livingStatusCode?:string|null;householdForeignEmployment?:boolean|null;categoryIds?:string[];wardIds?:string[];profilePhotoUri?:string|null}){const db=await getDb();const now=new Date().toISOString();await db.runAsync(`INSERT INTO citizens(client_uuid,full_name,date_of_birth,approximate_age,gender,phone,caste_group_code,caste_other,marital_status_code,occupation_code,occupation_other,living_status_code,household_foreign_employment,category_ids,ward_ids,profile_photo_uri,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,c.clientUuid,c.fullName,c.dateOfBirth??null,c.approximateAge??null,c.gender,c.phone??null,c.casteGroupCode??null,c.casteOther??null,c.maritalStatusCode??null,c.occupationCode??null,c.occupationOther??null,c.livingStatusCode??null,c.householdForeignEmployment==null?null:(c.householdForeignEmployment?1:0),JSON.stringify(c.categoryIds??[]),JSON.stringify(c.wardIds??[]),c.profilePhotoUri??null,now,now);}
export async function markCitizenDirty(clientUuid:string){const db=await getDb();await db.runAsync("UPDATE citizens SET sync_status='pending',updated_at=?,version=version+1 WHERE client_uuid=?",new Date().toISOString(),clientUuid);}

export async function listServices(citizenClientUuid?:string){const db=await getDb();return citizenClientUuid?db.getAllAsync<LocalService>("SELECT * FROM service_records WHERE citizen_client_uuid=? AND deleted_at IS NULL ORDER BY service_date DESC",citizenClientUuid):db.getAllAsync<LocalService>("SELECT * FROM service_records WHERE deleted_at IS NULL ORDER BY service_date DESC LIMIT 500");}
export async function saveService(s:{clientUuid:string;citizenClientUuid:string;wardId:string;serviceDate:string;nepaliYear?:number|null;nepaliMonth?:string|null;systolic?:number|null;diastolic?:number|null;pulseRate?:number|null;temperatureF?:number|null;latitude?:number|null;longitude?:number|null;altitude?:number|null;accuracy?:number|null;notes?:string|null;otherHealthProblem?:string|null;conditionIds?:string[];medicines?:unknown[];visitPhotoUri?:string|null}){const db=await getDb();const now=new Date().toISOString();await db.runAsync(`INSERT INTO service_records(client_uuid,citizen_client_uuid,ward_id,service_date,nepali_year,nepali_month,systolic,diastolic,pulse_rate,temperature_f,latitude,longitude,altitude,accuracy,notes,other_health_problem,condition_ids,medicines,visit_photo_uri,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,s.clientUuid,s.citizenClientUuid,s.wardId,s.serviceDate,s.nepaliYear??null,s.nepaliMonth??null,s.systolic??null,s.diastolic??null,s.pulseRate??null,s.temperatureF??null,s.latitude??null,s.longitude??null,s.altitude??null,s.accuracy??null,s.notes??null,s.otherHealthProblem??null,JSON.stringify(s.conditionIds??[]),JSON.stringify(s.medicines??[]),s.visitPhotoUri??null,now,now);}

export async function listReference(type:string){const db=await getDb();return db.getAllAsync<{id:string;code:string|null;label_en:string|null;label_ne:string|null;payload:string}>("SELECT * FROM reference_data WHERE type=? ORDER BY label_en",type);}
export async function replaceReference(type:string,items:any[],map:(x:any)=>{id:string;code?:string;labelEn?:string;labelNe?:string}){const db=await getDb();await db.withTransactionAsync(async()=>{await db.runAsync("DELETE FROM reference_data WHERE type=?",type);for(const item of items){const m=map(item);await db.runAsync("INSERT INTO reference_data(type,id,code,label_en,label_ne,payload,updated_at) VALUES(?,?,?,?,?,?,?)",type,m.id,m.code??null,m.labelEn??null,m.labelNe??null,JSON.stringify(item),item.updatedAt??new Date().toISOString());}});}

export async function syncCounts(){const db=await getDb();const c=await db.getAllAsync<{sync_status:string,n:number}>("SELECT sync_status,COUNT(*) n FROM (SELECT sync_status FROM citizens UNION ALL SELECT sync_status FROM service_records) GROUP BY sync_status");return Object.fromEntries(c.map(x=>[x.sync_status,x.n]));}
