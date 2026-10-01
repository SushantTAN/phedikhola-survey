import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const wards = [
  ["WARD_1", "Ward No. 1", "वडा नं. १"], ["WARD_2", "Ward No. 2", "वडा नं. २"],
  ["WARD_3", "Ward No. 3", "वडा नं. ३"], ["WARD_4", "Ward No. 4", "वडा नं. ४"],
  ["WARD_5", "Ward No. 5", "वडा नं. ५"]
] as const;

// Transcribed from my-real-data-for-ward-hp-tole.txt. Both Ward 4 health posts
// belong to WARD_4; the source's unusual spellings are preserved.
const localAreas = [
  {
    wardCode: "WARD_1", healthPost: "फेदिखोला स्वास्थ्य चौकी",
    staff: ["Shovakanta Paudel", "Sarita Parajuli", "Manju Gurung", "Amrita Paudel Subedi"],
    toles: [
      "सर्केटारी", "पर्सेभाटी", "ढाडा", "अलैचेबारी", "बछिमडाडा", "दामगाडे",
      "उपल्लो कुडुले", "रामकोट", "सालिमे", "साधि", "कर्मीडाँडा", "कुबिन्डे",
      "डाडागाँउ", "लैश्वारा", "टुनिश्चारा", "कटुजेश्वारा", "ढकाल डाँडा", "खड्कगाँउ",
      "चाउकेश्चारा", "अयरपानि", "भिरस्वारा", "नैखु", "पैरे", "बिर्ता चुइखोर",
      "चारघरे", "सुनडाँडा", "कोठे गाँउ", "धैयाखेर", "स्याउली बजार", "मट्टिखान"
    ]
  },
  {
    wardCode: "WARD_2", healthPost: "आधारभुत स्वास्थ्य चौकी",
    staff: ["Bishnu Bahadur Khadka", "Buddha maya Blon", "Suchitra Gurung", "Namrata Bhhatarai", "Nirmala Sharma", "Chandrama Aryal"],
    // The third tole name appears joined in the source; preserve it for review.
    toles: [
      "वडा चौर", "गैरी", "तल्लो खड्केटारिउपल्लो", "खड्केटारि", "खहरे",
      "लाङ्खुरिया", "विरुवा", "चनौटे", "स्थानचौर", "बाहाटारि", "मिरुडाँडा",
      "काउले", "आलिया छाप", "कुखुरे खोला", "फेदिखोला बजार", "देउरालि",
      "बाख्रे", "रानिस्वारा", "साइ डाँडा", "लामिस्वारा", "कुडुले",
      "जोगिस्थान", "सराङ्दि", "आढे कुना", "खाँट"
    ]
  },
  {
    wardCode: "WARD_3", healthPost: "भाटखोला स्वास्थ्य चौकी",
    staff: ["Kabita Devi Sharma", "Hira Devi Ranabhat", "Durga Sharma"],
    toles: ["हाम्रो टोल", "मिलिजुलि टोल", "देविस्थान टोल", "ढुङ्गे देउराली टोल"]
  },
  {
    wardCode: "WARD_4", healthPost: "आरुखर्क स्वास्थ्य चौकी",
    staff: ["Keshav Parajuli", "Yashoda Sharma Subedi", "Laxmi Paudel Aryal", "Sabina Adhikari"],
    toles: [
      "जैसि डाँडा", "कोट", "छपाली थोक", "जुडेपानि", "टरेल्थोक", "राइथर",
      "गैरापट्टि", "पाखाडाडा", "धनाबारि", "सुबेदि थोक", "टोड्के", "भाटस्वारा",
      "कल्याह", "ढुम्रेखोला", "गैरीखोर", "पााम्दुर खाल्टा", "जिगिथोक",
      "ठुलाखेत", "वज्रेटारी", "बादुङ्गा", "शेर बजार", "तालस्वारा",
      "कुवा पानी", "थुम्की", "शिवालय", "छेलोहाल्ने", "पौवा",
      "लव्सि स्वारा", "वडाचौर"
    ]
  },
  {
    wardCode: "WARD_4", healthPost: "रापु सामुदायिक स्वास्थ्य सेवा केन्द्र",
    staff: ["Sangita Subedi", "Chandra Gurung"],
    toles: ["गलेम", "रापु", "खामोहाले", "टुटे", "देउराली", "गुना"]
  },
  {
    wardCode: "WARD_5", healthPost: "बागे फड्के स्वास्थ्य चौकी",
    staff: ["Poonya Prasad Paudel", "Pabitra Gurung"],
    toles: ["बाराहि टोल", "भगवति टोल", "नौपुजा टोल", "नुनथेक टोल"]
  }
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
  const staffPasswordHash = await bcrypt.hash(process.env.SEED_STAFF_PASSWORD ?? "TempPass123!", 12);
  await prisma.user.upsert({ where: { email: adminEmail }, update: {}, create: { name: "System Administrator", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN" } });

  for (let i = 0; i < wards.length; i++) {
    const [code, nameEn, nameNe] = wards[i]!;
    await prisma.ward.upsert({ where: { code }, update: { nameEn, nameNe, sortOrder: i + 1, active: true }, create: { code, nameEn, nameNe, sortOrder: i + 1 } });
  }
  for (let areaIndex = 0; areaIndex < localAreas.length; areaIndex++) {
    const area = localAreas[areaIndex]!;
    const ward = await prisma.ward.findUniqueOrThrow({ where: { code: area.wardCode } });
    const existingPost = await prisma.healthPost.findFirst({ where: { wardId: ward.id, name: area.healthPost } });
    const post = existingPost
      ? await prisma.healthPost.update({ where: { id: existingPost.id }, data: { active: true } })
      : await prisma.healthPost.create({ data: { name: area.healthPost, wardId: ward.id } });

    for (const name of area.toles) {
      await prisma.tole.upsert({
        where: { wardId_name: { wardId: ward.id, name } },
        update: { healthPostId: post.id, active: true },
        create: { name, wardId: ward.id, healthPostId: post.id }
      });
    }

    // The source gives names only. Staff use predictable placeholder login
    // emails until their real addresses are entered by an administrator.
    for (let staffIndex = 0; staffIndex < area.staff.length; staffIndex++) {
      const name = area.staff[staffIndex]!;
      const employeeCode = `SEED_W${area.wardCode.slice(-1)}_HP${areaIndex + 1}_${String(staffIndex + 1).padStart(2, "0")}`;
      const existingProfile = await prisma.staffProfile.findUnique({ where: { employeeCode }, include: { user: { select: { email: true } } } });
      if (existingProfile) {
        await prisma.user.update({ where: { id: existingProfile.userId }, data: {
          name, isActive: true,
          ...(existingProfile.user.email.endsWith("@phedikhola.invalid") ? { passwordHash: staffPasswordHash } : {})
        } });
        await prisma.staffProfile.update({ where: { id: existingProfile.id }, data: { assignedWardId: ward.id, healthPostId: post.id } });
      } else {
        await prisma.user.create({ data: {
          name, email: `${employeeCode.toLowerCase()}@phedikhola.invalid`,
          passwordHash: staffPasswordHash, role: "STAFF", isActive: true,
          staffProfile: { create: { employeeCode, assignedWardId: ward.id, healthPostId: post.id } }
        } });
      }
    }
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
  console.log("Seeded staff are active. Placeholder login: <employee-code>@phedikhola.invalid; password: SEED_STAFF_PASSWORD (default TempPass123!).");
}

main().finally(() => prisma.$disconnect());
