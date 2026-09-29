import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const wards = [
  ["WARD_1", "Ward No. 1", "वडा नं. १"], ["WARD_2", "Ward No. 2", "वडा नं. २"],
  ["WARD_3", "Ward No. 3", "वडा नं. ३"], ["WARD_4", "Ward No. 4", "वडा नं. ४"],
  ["WARD_4_RAPUDANDA", "Ward No. 4 - Rapudanda", "वडा नं. ४ रापुडाँडा"], ["WARD_5", "Ward No. 5", "वडा नं. ५"]
] as const;

const categories = [
  ["SENIOR_CITIZEN", "Senior Citizen", "जेष्ठ नागरिक"], ["WIDOW", "Widow", "विधवा"],
  ["WIDOWER", "Widower", "विधुर"], ["PERSON_WITH_DISABILITY", "Person with Disability", "अपाङ्गता भएका व्यक्ति"],
  ["SINGLE_WOMAN", "Single Woman", "एकल महिला"], ["OTHER", "Other", "अन्य"]
] as const;

const conditions = [
  "Joint/Knee Pain|हाड जोर्नी / घुँडा दुख्ने समस्या", "Acute Tonsillitis|टन्सील", "ARI - Acute Respiratory Tract Infection|तीव्र श्वासप्रश्वास संक्रमण",
  "Asthma / Bronchitis|दम / ब्रोन्काइटिस", "Backache / Musculoskeletal Problem|ढाँड दुख्ने समस्या", "Cancer|क्यान्सर", "COPD|COPD",
  "Dental Caries|दाँते किरा", "Diabetes Mellitus|मधुमेह", "Diarrhoea / Dysentery|झाडापखाला / आउँ", "Dry Mouth|मुख सुख्खा हुने", "Fever|ज्वरो",
  "Low Abdominal Pain Syndrome|तल्लो पेट दुख्ने", "RTI|RTI", "Typhoid / Enteric Fever|टाइफाइड", "Viral Influenza|भाइरल इन्फ्लुएन्जा",
  "Hypertension|उच्च रक्तचाप", "Hypotension|न्यून रक्तचाप", "Intestinal Worm Infection|आन्द्राको जुका", "Nutritional Deficiency|पोषणको कमी",
  "Dermatitis / Eczema|डर्माटाइटिस / एक्जिमा", "Eye Problem|आँखा सम्बन्धी समस्या", "Ear Problem / Otitis|कान सम्बन्धी समस्या", "Fungal Infection|फंगल संक्रमण",
  "Gastritis / APD|ग्यास्ट्राइटिस", "Gum Disease|गिजा सम्बन्धी समस्या", "General Examination|सामान्य परीक्षण", "Headache|टाउको दुख्ने",
  "Heart Problem|मुटु सम्बन्धी समस्या", "Kidney Disease / Acute Renal Failure|मिर्गौला सम्बन्धी समस्या", "Mental Illness|मानसिक स्वास्थ्य समस्या",
  "PID - Pelvic Inflammatory Disease|PID", "Red Eye|आँखा रातो हुने", "Rhinitis|सामान्य रुघा खोकी", "Scabies|लुतो", "Sinusitis|पिनास",
  "Sore Throat|घाँटी / स्वर समस्या", "Thyroid Problem|थाइराइड समस्या", "Tooth Ache|दाँत दुख्ने", "Uterine Prolapse|पाठेघर खस्ने", "Other|अन्य"
];

const medicines = [
  ["Aspirin", "75 mg", "Tablet"], ["Amitriptyline", "10 mg", "Tablet"], ["Amitriptyline", "25 mg", "Tablet"], ["Albendazole", "400 mg", "Tablet"],
  ["Amlodipine", "5 mg", "Tablet"], ["Amoxicillin", "500 mg", "Capsule"], ["Antacid", "250 mg + 250 mg", "Tablet"],
  ["Azithromycin", "250 mg", "Tablet"], ["Azithromycin", "500 mg", "Tablet"], ["Cetirizine", "10 mg", "Tablet"],
  ["Chlorpheniramine", "4 mg", "Tablet"], ["Ciprofloxacin", "500 mg", "Tablet"], ["Ciprofloxacin eye / ear drop", null, "Piece"],
  ["Ciprofloxacin eye ointment", "10 gm", "Tube"], ["Clotrimazole anti-fungal ointment", null, "Tube"], ["Clove oil liquid", "5 ml", "Piece"],
  ["Diclofenac sodium", "50 mg", "Tablet"], ["Doxycycline", "100 mg", "Capsule"], ["Ferrous sulphate and folic acid", null, "Tablet"],
  ["Fluconazole", null, "Capsule"], ["Furosemide", "40 mg", "Tablet"], ["Gentian Violet solution", null, "Bottle"],
  ["Glimepiride", "1 mg", "Tablet"], ["Glimepiride", "2 mg", "Tablet"], ["Hyoscine butyl bromide", "10 mg", "Tablet"],
  ["Ibuprofen", "400 mg", "Tablet"], ["Losartan", "25 mg", "Tablet"], ["Losartan", "50 mg", "Tablet"],
  ["Metformin", "1000 mg", "Tablet"], ["Metformin", "500 mg", "Tablet"], ["Metoclopramide", "10 mg", "Tablet"],
  ["Metronidazole", "400 mg", "Tablet"], ["Neomycin skin ointment", "2% w/w, 10 gm", "Tube"], ["Oral Rehydration Salts (ORS)", null, "Sachet"],
  ["Oxymetazoline nasal drop", "0.05%, 10 ml", "Piece"], ["Paracetamol", "500 mg", "Tablet"], ["Ranitidine", "150 mg", "Tablet"],
  ["Salbutamol", "4 mg", "Tablet"], ["Silver Sulfadiazine Cream", "0.2% w/w, 15 gm", "Tube"], ["Tetracycline eye ointment", null, "Tube"],
  ["Vitamin B Complex", null, "Tablet"], ["Zinc Sulfate", "20 mg", "Tablet"]
] as const;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@phedikhola.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  await prisma.user.upsert({ where: { email: adminEmail }, update: {}, create: { name: "System Administrator", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN" } });

  for (let i = 0; i < wards.length; i++) {
    const [code, nameEn, nameNe] = wards[i]!;
    await prisma.ward.upsert({ where: { code }, update: { nameEn, nameNe, sortOrder: i + 1 }, create: { code, nameEn, nameNe, sortOrder: i + 1 } });
  }
  for (let i = 0; i < categories.length; i++) {
    const [code, nameEn, nameNe] = categories[i]!;
    await prisma.citizenCategory.upsert({ where: { code }, update: { nameEn, nameNe, sortOrder: i + 1 }, create: { code, nameEn, nameNe, sortOrder: i + 1 } });
  }
  const units = [["TABLET","Tablet","ट्याब्लेट"],["CAPSULE","Capsule","क्याप्सुल"],["TUBE","Tube","ट्युब"],["BOTTLE","Bottle","बोतल"],["PIECE","Piece","गोटा"],["SACHET","Sachet","स्याचेट"]] as const;
  for (const [code,nameEn,nameNe] of units) await prisma.medicineUnit.upsert({ where: { code }, update: { nameEn,nameNe }, create: { code,nameEn,nameNe } });

  for (let i = 0; i < conditions.length; i++) {
    const [nameEn, nameNe] = conditions[i]!.split("|");
    const code = nameEn!.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80);
    await prisma.healthCondition.upsert({ where: { code }, update: { nameEn: nameEn!, nameNe: nameNe!, sortOrder: i + 1 }, create: { code, nameEn: nameEn!, nameNe: nameNe!, sortOrder: i + 1 } });
  }
  for (const [name, strength, unitName] of medicines) {
    const code = `${name}_${strength ?? ""}`.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80);
    const unit = await prisma.medicineUnit.findFirst({ where: { nameEn: unitName } });
    await prisma.medicine.upsert({ where: { code }, update: { name, strength, dosageForm: unitName, defaultUnitId: unit?.id }, create: { code, name, strength, dosageForm: unitName, defaultUnitId: unit?.id } });
  }
  await prisma.appVersion.deleteMany({ where: { platform: "ANDROID" } });
  await prisma.appVersion.create({ data: { platform: "ANDROID", latestVersion: "1.0.0", minimumVersion: "1.0.0", updateMessageEn: "A newer version may be available.", updateMessageNe: "नयाँ संस्करण उपलब्ध हुन सक्छ।" } });
  console.log(`Seed complete. Admin: ${adminEmail}`);
}

main().finally(() => prisma.$disconnect());
