import { randomUUID } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const dataRouter = Router();
dataRouter.use(requireAuth, requireRole("ADMIN"));

type Row = Record<string, any>;

function workbookFromBody(body: any) {
  if (!body?.base64) throw new HttpError(400, "FILE_REQUIRED", "A base64 encoded XLSX/CSV file is required");
  try { return XLSX.read(Buffer.from(String(body.base64), "base64"), { type: "buffer" }); }
  catch { throw new HttpError(400, "INVALID_WORKBOOK", "Unable to read the uploaded workbook"); }
}
function firstRows(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
  return sheet ? XLSX.utils.sheet_to_json<Row>(sheet) : [];
}
function namedRows(wb: XLSX.WorkBook, name: string) {
  const sheet = wb.Sheets[name];
  return sheet ? XLSX.utils.sheet_to_json<Row>(sheet) : [];
}
function sendWorkbook(res: any, wb: XLSX.WorkBook, name: string) {
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename=${name}-${new Date().toISOString().slice(0,10)}.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
}
function categoryCode(c: any) { return c.categories?.[0]?.category?.code ?? ""; }
function wardCodes(c: any) { return c.wards?.map((x: any) => x.ward.code).join("|") ?? ""; }

async function buildCitizensSheet(wb: XLSX.WorkBook) {
  const citizens = await prisma.citizen.findMany({ where: { deletedAt: null }, include: { categories: { include: { category: true } }, wards: { include: { ward: true } } }, orderBy: { fullName: "asc" } });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(citizens.map(c => ({
    citizen_id: c.publicId, client_uuid: c.clientUuid, name: c.fullName, date_of_birth: c.dateOfBirth?.toISOString().slice(0,10) ?? "",
    approximate_age: c.approximateAge ?? "", gender: c.gender, phone: c.phone ?? "", address: c.address ?? "",
    latitude: c.latitude?.toString() ?? "", longitude: c.longitude?.toString() ?? "", citizen_category: categoryCode(c), ward_codes: wardCodes(c),
    caste_group: c.casteGroupCode ?? "", caste_other: c.casteOther ?? "", marital_status: c.maritalStatusCode ?? "", occupation: c.occupationCode ?? "",
    occupation_other: c.occupationOther ?? "", living_status: c.livingStatusCode ?? "", household_foreign_employment: c.householdForeignEmployment == null ? "" : (c.householdForeignEmployment ? "YES" : "NO"),
    profile_photo_url: c.profilePhotoUrl ?? ""
  }))), "Citizens");
}

async function buildServicesSheets(wb: XLSX.WorkBook) {
  const services = await prisma.citizenServiceRecord.findMany({ where: { deletedAt: null }, include: { citizen: true, ward: true, createdBy: true, conditions: { include: { condition: true } }, medicines: { include: { medicine: true } } }, orderBy: { serviceDate: "desc" } });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(services.map(s => ({
    service_id: s.clientUuid, citizen_id: s.citizen.publicId, service_date: s.serviceDate.toISOString(), year: s.nepaliYear ?? "", month: s.nepaliMonth ?? "",
    ward: s.ward.code, systolic: s.systolic ?? "", diastolic: s.diastolic ?? "", pulse: s.pulseRate ?? "", temperature_f: s.temperatureF?.toString() ?? "",
    latitude: s.latitude?.toString() ?? "", longitude: s.longitude?.toString() ?? "", altitude: s.altitude?.toString() ?? "", accuracy: s.accuracy?.toString() ?? "",
    other_health_problem: s.otherHealthProblem ?? "", notes: s.notes ?? "", photo_url: s.visitPhotoUrl ?? "", needs_followup: s.needsFollowup ? "YES" : "NO", staff_email: s.createdBy?.email ?? ""
  }))), "Services");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(services.flatMap(s => s.conditions.map(x => ({ service_id: s.clientUuid, health_condition: x.condition.code })))), "Service Health Conditions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(services.flatMap(s => s.medicines.map(m => ({ service_id: s.clientUuid, medicine: m.medicine?.name ?? m.otherMedicineName, quantity: m.quantity.toString(), unit: m.unit })))), "Service Medicines");
}

async function buildMedicinesSheet(wb: XLSX.WorkBook) {
  const rows = await prisma.medicine.findMany({ include: { defaultUnit: true }, orderBy: { name: "asc" } });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(m => ({ code: m.code, name: m.name, generic_name: m.genericName ?? "", strength: m.strength ?? "", dosage_form: m.dosageForm ?? "", default_unit: m.defaultUnit?.code ?? "", description: m.description ?? "", active: m.active ? "YES" : "NO" }))), "Medicines");
}
async function buildStaffSheet(wb: XLSX.WorkBook) {
  const rows = await prisma.user.findMany({ where: { role: "STAFF" }, include: { staffProfile: { include: { assignedWard: true } } }, orderBy: { name: "asc" } });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(u => ({ name: u.name, email: u.email, phone: u.phone ?? "", employee_code: u.staffProfile?.employeeCode ?? "", assigned_ward: u.staffProfile?.assignedWard?.code ?? "", active: u.isActive ? "YES" : "NO", temporary_password: "" }))), "Staff");
}
async function buildWardsSheet(wb: XLSX.WorkBook) {
  const rows = await prisma.ward.findMany({ orderBy: { sortOrder: "asc" } });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(w => ({ code: w.code, name_en: w.nameEn, name_ne: w.nameNe, location_name_en: w.locationNameEn ?? "", location_name_ne: w.locationNameNe ?? "", sort_order: w.sortOrder, active: w.active ? "YES" : "NO" }))), "Wards");
}

dataRouter.get("/export/:resource", asyncHandler(async (req, res) => {
  const resource = req.params.resource;
  const wb = XLSX.utils.book_new();
  if (resource === "citizens") await buildCitizensSheet(wb);
  else if (resource === "services") await buildServicesSheets(wb);
  else if (resource === "medicines") await buildMedicinesSheet(wb);
  else if (resource === "staff") await buildStaffSheet(wb);
  else if (resource === "wards") await buildWardsSheet(wb);
  else if (resource === "all") { await buildCitizensSheet(wb); await buildServicesSheets(wb); await buildMedicinesSheet(wb); await buildStaffSheet(wb); await buildWardsSheet(wb); }
  else throw new HttpError(404, "EXPORT_RESOURCE_NOT_FOUND", "Unknown export resource");
  sendWorkbook(res, wb, `phedikhola-${resource}`);
}));

async function importCitizens(rows: Row[], userId: string) {
  const results: any[] = [];
  for (let i=0;i<rows.length;i++) {
    const row=rows[i]!;
    try {
      const fullName=String(row.name ?? row.full_name ?? "").trim(); if(!fullName) throw new Error("name is required");
      const publicId=String(row.citizen_id ?? "").trim(); const clientUuid=String(row.client_uuid || randomUUID());
      const categoryCode=String(row.citizen_category ?? row.category ?? "").trim();
      const category=categoryCode ? await prisma.citizenCategory.findUnique({ where:{code:categoryCode} }) : null;
      const wardCodes=String(row.ward_codes ?? "").split("|").map((x:string)=>x.trim()).filter(Boolean);
      const wards=wardCodes.length ? await prisma.ward.findMany({where:{code:{in:wardCodes}}}) : [];
      const data:any={ fullName, dateOfBirth:row.date_of_birth?new Date(row.date_of_birth):null, approximateAge:row.approximate_age===""||row.approximate_age==null?null:Number(row.approximate_age), gender:String(row.gender||"OTHER").toUpperCase(), phone:row.phone?String(row.phone):null, address:row.address?String(row.address).trim():null, latitude:row.latitude===""||row.latitude==null?null:Number(row.latitude), longitude:row.longitude===""||row.longitude==null?null:Number(row.longitude), casteGroupCode:row.caste_group||null, casteOther:row.caste_other||null, maritalStatusCode:row.marital_status||null, occupationCode:row.occupation||null, occupationOther:row.occupation_other||null, livingStatusCode:row.living_status||null, householdForeignEmployment:String(row.household_foreign_employment||"").toUpperCase()==="YES"?true:String(row.household_foreign_employment||"").toUpperCase()==="NO"?false:null, profilePhotoUrl:row.profile_photo_url||null, deletedAt:null, status:"ACTIVE" };
      if ((data.latitude == null) !== (data.longitude == null) || (data.latitude != null && (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90)) || (data.longitude != null && (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180))) throw new Error("latitude and longitude must be valid and provided together");
      let citizen = publicId ? await prisma.citizen.findUnique({where:{publicId}}) : await prisma.citizen.findUnique({where:{clientUuid}});
      citizen = citizen ? await prisma.citizen.update({where:{id:citizen.id},data:{...data,version:{increment:1}}}) : await prisma.citizen.create({data:{...data,clientUuid,publicId:publicId||`PHE-${new Date().getFullYear()}-${clientUuid.replace(/-/g,"").slice(0,8).toUpperCase()}`,createdById:userId}});
      await prisma.$transaction(async tx=>{ await tx.citizenCategoryAssignment.deleteMany({where:{citizenId:citizen!.id}}); if(category) await tx.citizenCategoryAssignment.create({data:{citizenId:citizen!.id,categoryId:category.id}}); await tx.citizenWardAssignment.deleteMany({where:{citizenId:citizen!.id}}); if(wards.length) await tx.citizenWardAssignment.createMany({data:wards.map(w=>({citizenId:citizen!.id,wardId:w.id}))}); });
      results.push({row:i+2,status:"imported"});
    } catch(e){results.push({row:i+2,status:"failed",error:e instanceof Error?e.message:"Unknown error"});}
  }
  return results;
}
async function importMedicines(rows: Row[]) {
  const results:any[]=[]; for(let i=0;i<rows.length;i++){const row=rows[i]!;try{const name=String(row.name??"").trim();if(!name)throw new Error("name is required");const code=String(row.code??name.toUpperCase().replace(/[^A-Z0-9]+/g,"_")).replace(/^_|_$/g,"");let unitId:string|null=null;if(row.default_unit){const unit=await prisma.medicineUnit.findUnique({where:{code:String(row.default_unit)}});unitId=unit?.id??null;}await prisma.medicine.upsert({where:{code},create:{code,name,genericName:row.generic_name||null,strength:row.strength?String(row.strength):null,dosageForm:row.dosage_form||null,description:row.description||null,defaultUnitId:unitId,active:String(row.active||"YES").toUpperCase()!=="NO"},update:{name,genericName:row.generic_name||null,strength:row.strength?String(row.strength):null,dosageForm:row.dosage_form||null,description:row.description||null,defaultUnitId:unitId,active:String(row.active||"YES").toUpperCase()!=="NO"}});results.push({row:i+2,status:"imported"});}catch(e){results.push({row:i+2,status:"failed",error:e instanceof Error?e.message:"Unknown error"});}}return results;
}
async function importWards(rows: Row[]) { const results:any[]=[]; for(let i=0;i<rows.length;i++){const row=rows[i]!;try{const code=String(row.code??"").trim();if(!code)throw new Error("code is required");await prisma.ward.upsert({where:{code},create:{code,nameEn:String(row.name_en||code),nameNe:String(row.name_ne||row.name_en||code),locationNameEn:row.location_name_en||null,locationNameNe:row.location_name_ne||null,sortOrder:Number(row.sort_order||0),active:String(row.active||"YES").toUpperCase()!=="NO"},update:{nameEn:String(row.name_en||code),nameNe:String(row.name_ne||row.name_en||code),locationNameEn:row.location_name_en||null,locationNameNe:row.location_name_ne||null,sortOrder:Number(row.sort_order||0),active:String(row.active||"YES").toUpperCase()!=="NO"}});results.push({row:i+2,status:"imported"});}catch(e){results.push({row:i+2,status:"failed",error:e instanceof Error?e.message:"Unknown error"});}}return results; }
async function importStaff(rows: Row[]) { const results:any[]=[]; for(let i=0;i<rows.length;i++){const row=rows[i]!;try{const email=String(row.email??"").trim().toLowerCase();const name=String(row.name??"").trim();if(!email||!name)throw new Error("name and email are required");const ward=row.assigned_ward?await prisma.ward.findUnique({where:{code:String(row.assigned_ward)}}):null;const existing=await prisma.user.findUnique({where:{email}});if(existing){await prisma.user.update({where:{id:existing.id},data:{name,phone:row.phone||null,isActive:String(row.active||"YES").toUpperCase()!=="NO"}});if(existing.role==="STAFF")await prisma.staffProfile.upsert({where:{userId:existing.id},create:{userId:existing.id,employeeCode:row.employee_code||null,assignedWardId:ward?.id??null},update:{employeeCode:row.employee_code||null,assignedWardId:ward?.id??null}});}else{const password=String(row.temporary_password||"TempPass123!");await prisma.user.create({data:{name,email,phone:row.phone||null,passwordHash:await bcrypt.hash(password,12),role:"STAFF",isActive:String(row.active||"YES").toUpperCase()!=="NO",staffProfile:{create:{employeeCode:row.employee_code||null,assignedWardId:ward?.id??null}}}});}results.push({row:i+2,status:"imported"});}catch(e){results.push({row:i+2,status:"failed",error:e instanceof Error?e.message:"Unknown error"});}}return results; }

async function importServices(wb: XLSX.WorkBook, userId:string) {
  const rows=namedRows(wb,"Services").length?namedRows(wb,"Services"):firstRows(wb); const conditionRows=namedRows(wb,"Service Health Conditions"); const medicineRows=namedRows(wb,"Service Medicines"); const results:any[]=[]; const map=new Map<string,string>();
  for(let i=0;i<rows.length;i++){const row=rows[i]!;try{const citizen=await prisma.citizen.findUnique({where:{publicId:String(row.citizen_id)}});if(!citizen)throw new Error(`Unknown citizen_id: ${row.citizen_id}`);const ward=await prisma.ward.findUnique({where:{code:String(row.ward)}});if(!ward)throw new Error(`Unknown ward: ${row.ward}`);const clientUuid=String(row.service_id||row.client_uuid||randomUUID());const base:any={citizenId:citizen.id,wardId:ward.id,createdById:userId,serviceDate:row.service_date?new Date(row.service_date):new Date(),nepaliYear:row.year===""||row.year==null?null:Number(row.year),nepaliMonth:row.month||null,systolic:row.systolic===""||row.systolic==null?null:Number(row.systolic),diastolic:row.diastolic===""||row.diastolic==null?null:Number(row.diastolic),pulseRate:row.pulse===""||row.pulse==null?null:Number(row.pulse),temperatureF:row.temperature_f===""||row.temperature_f==null?null:String(row.temperature_f),latitude:row.latitude===""||row.latitude==null?null:String(row.latitude),longitude:row.longitude===""||row.longitude==null?null:String(row.longitude),altitude:row.altitude===""||row.altitude==null?null:String(row.altitude),accuracy:row.accuracy===""||row.accuracy==null?null:String(row.accuracy),otherHealthProblem:row.other_health_problem||null,notes:row.notes||null,visitPhotoUrl:row.photo_url||null,needsFollowup:["YES","TRUE","1"].includes(String(row.needs_followup??"").trim().toUpperCase()),deletedAt:null,status:"ACTIVE"};const existing=await prisma.citizenServiceRecord.findUnique({where:{clientUuid}});const saved=existing?await prisma.citizenServiceRecord.update({where:{id:existing.id},data:{...base,version:{increment:1}}}):await prisma.citizenServiceRecord.create({data:{...base,clientUuid}});map.set(clientUuid,saved.id);results.push({row:i+2,status:"imported"});}catch(e){results.push({row:i+2,status:"failed",error:e instanceof Error?e.message:"Unknown error"});}}
  for(const row of conditionRows){try{const serviceId=map.get(String(row.service_id))??(await prisma.citizenServiceRecord.findUnique({where:{clientUuid:String(row.service_id)}}))?.id;if(!serviceId)continue;const condition=await prisma.healthCondition.findUnique({where:{code:String(row.health_condition)}});if(condition)await prisma.serviceHealthCondition.upsert({where:{serviceId_conditionId:{serviceId,conditionId:condition.id}},update:{},create:{serviceId,conditionId:condition.id}});}catch{}}
  for(const row of medicineRows){try{const serviceId=map.get(String(row.service_id))??(await prisma.citizenServiceRecord.findUnique({where:{clientUuid:String(row.service_id)}}))?.id;if(!serviceId)continue;const name=String(row.medicine||"").trim();const medicine=name?await prisma.medicine.findFirst({where:{name:{equals:name,mode:"insensitive"}}}):null;await prisma.serviceMedicine.create({data:{serviceId,medicineId:medicine?.id??null,otherMedicineName:medicine?null:name,quantity:String(row.quantity??0),unit:String(row.unit||"unit")}});}catch{}}
  return results;
}

dataRouter.post("/import/:resource", asyncHandler(async (req, res) => {
  const resource=req.params.resource; const wb=workbookFromBody(req.body); let results:any[]=[];
  if(resource==="citizens")results=await importCitizens(firstRows(wb),req.user!.sub);
  else if(resource==="services")results=await importServices(wb,req.user!.sub);
  else if(resource==="medicines")results=await importMedicines(firstRows(wb));
  else if(resource==="staff")results=await importStaff(firstRows(wb));
  else if(resource==="wards")results=await importWards(firstRows(wb));
  else throw new HttpError(404,"IMPORT_RESOURCE_NOT_FOUND","Unknown import resource");
  res.json({success:true,data:{total:results.length,imported:results.filter(x=>x.status==="imported").length,failed:results.filter(x=>x.status==="failed").length,results}});
}));
