# Product Requirements Document

# Phedikhola Citizen Survey Software

**Version:** 1.1  
**Platforms:** Web Admin + Public Citizen Portal + Android Staff Application + Backend API  
**Primary Organization:** Phedikhola Rural Municipality

---

# 1. Product Overview

The **Phedikhola Citizen Survey Software** is a centralized system for collecting, storing, managing, synchronizing, and analyzing citizen service and survey information for Phedikhola Rural Municipality.

The system consists of:

1. A **Next.js web application** containing:
   - Public Citizen Portal
   - Admin Panel
2. An **Android field-data collection application** for staff.
3. A centralized backend API and database.

The system will support offline data collection so field staff can register citizens and record services even where internet connectivity is unavailable.

---

# 2. Primary Users

The system has three user groups:

### Administrator

Administrators manage the entire system through the protected `/admin` portion of the Next.js application.

### Staff / Data Collector

Staff use the Android application to register citizens and collect periodic service and health information.

### Citizen

Citizens use the public website home page to view their information using their unique Citizen ID.

Citizens do not need an account or normal login.

---

# 3. Web Application Architecture

There will be **one Next.js application** containing both the public Citizen Portal and the authenticated Admin Panel.

Example routes:

```text
/
 /citizen/[id]

/admin/login
/admin
/admin/citizens
/admin/citizens/[id]
/admin/citizen-data
/admin/medicines
/admin/staff
/admin/imports
/admin/exports
/admin/settings
```

The home page `/` is publicly accessible.

All `/admin/*` routes except `/admin/login` require administrator authentication.

The project will use **Next.js App Router**.

`react-router-dom` will not be used.

---

# 4. Public Home Page / Citizen Portal

The home page is the public-facing page of the system.

It should contain:

- Municipality branding
- Basic introduction
- Citizen ID lookup
- Language selector
- Municipality contact information where appropriate

A citizen enters their unique identifier.

Example:

```text
PHE-2083-000123
```

The system then displays information approved for citizen access.

For privacy, the system should support an additional verification mechanism such as:

- Date of birth
- Phone verification
- OTP

This can be enabled depending on municipality policy.

---

# 5. Citizen Portal Features

Citizens can:

- Search using their Citizen ID
- View personal information
- View available service history
- View medicine/service information permitted by the municipality
- Print their information
- Export information as PDF

Citizens cannot:

- Modify official information
- View another citizen's information
- Access staff or administrative functions

---

# 6. Citizen Model

Citizen information should contain relatively permanent or slowly changing information about the individual.

## Citizen Fields

### System Fields

- Internal UUID
- Citizen Unique ID
- Status
- Created At
- Updated At
- Created By
- Updated By

---

## Personal Information

### Full Name

Nepali label:

**नाम / जेष्ठ नागरिकको नाम**

Required.

---

### Date of Birth

Used where available.

Age should preferably be calculated from date of birth.

If exact birth date is unavailable, an estimated age field may be supported.

---

### Age

Nepali:

**उमेर**

If date of birth is unavailable, age may be entered manually.

The system should therefore support:

- Date of Birth
- Approximate Age

---

### Gender

Nepali:

**लिङ्ग**

Initial options:

- महिला
- पुरुष
- अन्य

English:

- Female
- Male
- Other

---

### Phone Number

Nepali:

**फोन नं.**

Validation should support Nepali phone-number formats.

---

# 7. Citizen Category

Add a configurable **Citizen Category** field.

This should be a dropdown or multi-select depending on municipality requirements.

Initial categories may include:

- Senior Citizen / जेष्ठ नागरिक
- Widow / विधवा
- Widower / विधुर
- Person with Disability
- Single Woman
- Other

The exact list should be configurable rather than permanently hardcoded.

A citizen may potentially qualify for more than one category.

Therefore, a **multi-select implementation is preferable** unless the municipality confirms that only one category may be selected.

---

# 8. Caste / Community Group

Nepali label:

**जात/समुह**

Options:

- दलित
- ब्राह्मण/क्षेत्री
- जनजाती
- मधेशी
- मुस्लिम
- अन्य

English translations:

- Dalit
- Brahmin/Chhetri
- Janajati
- Madhesi
- Muslim
- Other

If `Other` is selected, an optional description field should appear.

---

# 9. Marital Status

Options:

- Single
- Married
- Divorced
- Widow
- Widower
- Other

Translation keys should be used instead of embedding English text directly into the database where practical.

---

# 10. Occupation

Initial values:

- Unemployed
- Employed
- Student
- Retired
- Self-employed
- Agriculture
- Other

If `Other` is selected, free-text input may be provided.

---

# 11. Citizen Residence / Care Status

Nepali:

**जेष्ठ नागरिकको बसोबास**

Question:

**एकल बसेको छ/छैन**

Options:

- एकल
- हेरचाहा गर्ने व्यक्ति भएको

English:

- Lives alone
- Has caregiver / lives with someone providing care

This can be stored on the citizen profile if it represents current living status.

However, it should retain change history if required because this information can change over time.

---

# 12. Foreign Employment in Household

Question:

**घरको कुनै सदस्य वैदेशिक रोजगारमा गएको**

Options:

- छ
- छैन

English:

- Yes
- No

This may be stored as part of citizen demographic information.

---

# 13. Citizen Photo

A citizen profile may contain a primary identification photo.

Requirements:

- Capture from phone camera
- Upload existing image
- Maximum original upload size such as 10 MB
- Resize before upload
- Compress
- Convert to WebP
- Store file in object/file storage
- Store only file reference in PostgreSQL

The Staff application must also support taking the photo offline.

The image should remain locally available until successfully synchronized.

---

# 14. Citizen Unique Identifier

Each citizen receives two IDs.

### Internal UUID

Used by the software.

Example:

```text
c9dadbed-e2be-46c9-8a66-...
```

### Public Citizen ID

Human-readable identifier.

Example:

```text
PHE-2083-000123
```

The public ID:

- Must be unique
- Must never be reused
- Must not expose sensitive citizen information
- Can later be represented using a QR code

Offline-created citizens should initially receive a client-generated UUID.

The permanent human-readable ID may be assigned when the record synchronizes with the server.

---

# 15. Ward Management

Rather than hardcoding wards into survey forms, the system should maintain a **Ward master table**.

Initial values:

- वडा नं. १
- वडा नं. २
- वडा नं. ३
- वडा नं. ४
- वडा नं. ४ रापुडाँडा
- वडा नं. ५

The municipality should confirm whether **वडा नं. ४ रापुडाँडा** represents a separate service location or should instead be modeled as:

```text
Ward: वडा नं. ४
Location/Tole: रापुडाँडा
```

The second structure is preferable if Rapudanda is geographically part of Ward 4.

---

# 16. Citizen Service / Survey Data

Health measurements, medicines, service location, and health conditions should **not** be stored directly on the Citizen table.

Instead they belong to a separate entity:

**Citizen Service Record**

or database entity:

```text
CitizenData
```

This allows multiple records for the same citizen over time.

Example:

```text
Citizen
   ├── Baisakh 2083 Service Record
   ├── Jestha 2083 Service Record
   ├── Ashar 2083 Service Record
   └── ...
```

---

# 17. Citizen Service Record Fields

Each record contains:

### Identification

- UUID
- Citizen ID
- Survey/service type
- Nepali Year
- Month
- Service Date
- Staff Member
- Created At
- Updated At

---

# 18. Service Ward

Nepali:

**सेवा दिएको वडा**

Selected from Ward master data.

Example options:

- वडा नं. १
- वडा नं. २
- वडा नं. ३
- वडा नं. ४
- वडा नं. ४ रापुडाँडा
- वडा नं. ५

---

# 19. Blood Pressure

Nepali:

**जेष्ठ नागरिकको रक्तचाप**

Description:

**Blood Pressure (mm/Hg)**

Rather than storing `"120/80"` as a single text string, preferably store:

```text
systolic = 120
diastolic = 80
```

This makes analytics significantly easier.

The UI can still display:

```text
120/80 mmHg
```

---

# 20. Pulse Rate

Nepali:

**पल्स रेट**

Unit:

```text
beats/minute
```

Example:

```text
72
```

Store as numeric value.

---

# 21. Temperature

Nepali:

**तापक्रम**

Unit:

```text
°F
```

Store as decimal numeric value.

Example:

```text
98.6
```

The architecture should allow Celsius support later if required.

---

# 22. Current Health Problems

Nepali:

**जेष्ठ नागरिकको हालको स्वास्थ्य समस्या**

This is a multi-select field.

A citizen can have several health problems during one visit.

Initial options:

- हाड जोर्नी / घुँडा दुख्ने समस्या
- Acute Tonsillitis
- ARI — Acute Respiratory Tract Infection
- Asthma / Bronchitis
- Backache / Musculoskeletal Problem
- Cancer
- COPD
- Dental Caries
- Diabetes Mellitus
- Diarrhoea / Dysentery
- Dry Mouth
- Fever
- Low Abdominal Pain Syndrome
- RTI
- Typhoid / Enteric Fever
- Viral Influenza
- Hypertension
- Hypotension
- Intestinal Worm Infection
- Nutritional Deficiency
- Dermatitis / Eczema
- Eye Problem
- Ear Problem / Otitis
- Fungal Infection
- Gastritis / APD
- Gum Disease
- General Examination
- Headache
- Heart Problem
- Kidney Disease / Acute Renal Failure
- Mental Illness
- PID — Pelvic Inflammatory Disease
- Red Eye
- Rhinitis
- Scabies
- Sinusitis
- Sore Throat
- Thyroid Problem
- Tooth Ache
- Uterine Prolapse
- Other

If `Other` is selected:

```text
Other Health Problem
```

free-text field should become available.

---

# 23. Health Condition Master Data

Health conditions should preferably not be hardcoded into application source code.

Create a master table:

```text
HealthCondition
```

Fields:

- ID
- Code
- English Name
- Nepali Name
- Description
- Active
- Sort Order

Administrators can eventually manage this list.

This allows additional conditions to be introduced without releasing a new mobile application.

---

# 24. Medicines Provided

Nepali:

**स्वास्थ्यकर्मी द्वारा दिइएको औषधीहरु**

Description:

**Select all medicines given**

This is a multi-select field.

For each selected medicine, staff must specify:

- Medicine
- Quantity

Example:

```text
Paracetamol 500mg
Quantity: 10

Amlodipine 5mg
Quantity: 30
```

---

# 25. Initial Medicine Master List

Initial medicine data includes:

- Acetylsalicylic acid / Aspirin 75 mg
- Amitriptyline 10 mg
- Amitriptyline 25 mg
- Albendazole 400 mg
- Amlodipine 5 mg
- Amoxicillin 500 mg
- Antacid 250 mg + 250 mg
- Azithromycin 250 mg
- Azithromycin 500 mg
- Cetirizine 10 mg
- Chlorpheniramine 4 mg
- Ciprofloxacin 500 mg
- Ciprofloxacin Eye/Ear Drop
- Ciprofloxacin Eye Ointment 10 gm
- Clotrimazole Anti-fungal Ointment
- Clove Oil Liquid 5 ml
- Diclofenac Sodium 50 mg
- Doxycycline 100 mg
- Ferrous Sulphate and Folic Acid
- Fluconazole
- Furosemide 40 mg
- Gentian Violet Solution
- Glimepiride 1 mg
- Glimepiride 2 mg
- Hyoscine Butyl Bromide 10 mg
- Ibuprofen 400 mg
- Losartan 25 mg
- Losartan 50 mg
- Metformin 1000 mg
- Metformin 500 mg
- Metoclopramide 10 mg
- Metronidazole 400 mg
- Neomycin Skin Ointment 2%
- Oral Rehydration Salts
- Oxymetazoline Nasal Drop 0.05%
- Paracetamol 500 mg
- Ranitidine 150 mg
- Salbutamol 4 mg
- Silver Sulfadiazine Cream
- Tetracycline Eye Ointment
- Vitamin B Complex
- Zinc Sulfate 20 mg

Each medicine should have a separate **unit**.

Examples:

```text
Tablet
Capsule
Tube
Bottle
Piece
Sachet
ml
```

---

# 26. Other Medicine

If the required medicine is not listed, staff can select:

**Other Medicine**

Then enter:

- Medicine Name
- Quantity
- Unit

Example:

```text
Medicine: XYZ Syrup
Quantity: 2
Unit: Bottle
```

Other medicines should not automatically become master medicines until reviewed by an administrator.

---

# 27. Medicine Database Structure

Medicine should contain:

- UUID
- Name
- Generic Name
- Strength
- Dosage Form
- Default Unit
- Description
- Active
- Created At
- Updated At

Example:

```text
Name: Paracetamol
Strength: 500 mg
Dosage Form: Tablet
Default Unit: Tablet
```

This structure is preferable to storing the full medicine description as one text value.

---

# 28. Service Photo

The survey includes:

**जेष्ठ नागरिकको फोटो खिच्नुहोस**

The application should support taking a photo from the device camera.

Two possible photo types should therefore be supported:

### Citizen Profile Photo

Primary identification photo.

### Service Visit Photo

Optional photo associated with a specific service record.

This separation avoids overwriting previous service evidence whenever a new photo is taken.

---

# 29. Service Location

The staff application must capture the service location.

Nepali:

**सेवा दिएको ठाउँको लोकेसन**

Store:

- Latitude
- Longitude
- Altitude
- Accuracy

Example:

```text
latitude: 28.123456
longitude: 83.987654
altitude: 1450
accuracy: 8
```

---

# 30. Location Collection

The mobile application should support:

### Automatic GPS

Preferred method.

Staff presses:

**Capture Location**

The application retrieves GPS coordinates from the device.

### Map Selection

If necessary, staff can adjust/select the location on a map while online.

OpenStreetMap-compatible mapping can be considered.

---

# 31. Offline GPS

GPS coordinates can be collected without mobile internet.

Therefore location collection must continue to function offline.

Map tiles or address searches may not be available offline unless offline maps are specifically implemented.

The core requirement is therefore:

```text
Latitude
Longitude
Altitude
Accuracy
```

rather than requiring an online map.

---

# 32. Citizen Data Frequency

Initially, service data will be grouped by Nepali year and month.

Months:

- Baisakh
- Jestha
- Ashar
- Shrawan
- Bhadra
- Ashwin
- Kartik
- Mangsir
- Poush
- Magh
- Falgun
- Chaitra

The actual service date should also be stored.

---

# 33. Multiple Visits

The previous assumption of exactly one citizen-data record per month should be reconsidered.

Because this is now a healthcare/service-record system, a citizen could potentially receive services more than once in the same month.

Recommended structure:

```text
Citizen
   └── Service Records
         ├── 2083 Baisakh — May 3
         ├── 2083 Baisakh — May 19
         └── 2083 Jestha — June 7
```

Do **not** enforce:

```text
citizen + year + month = unique
```

unless municipality operations explicitly guarantee only one service per citizen per month.

---

# 34. Admin Citizen Detail Page

Citizen detail page should contain:

## Profile

- Photo
- Unique ID
- Name
- Age
- Date of Birth
- Gender
- Phone
- Citizen Category
- Caste/Group
- Occupation
- Marital Status
- Living/Care Status
- Household Foreign Employment Status

---

## Service History

Table:

| Date | Ward | BP  | Pulse | Temperature | Medicines | Staff |
| ---- | ---- | --- | ----- | ----------- | --------- | ----- |

Filters:

- Year
- Month
- Ward
- Health Condition
- Medicine
- Staff
- Date range

---

# 35. Service Record Detail

Opening a service record displays:

- Citizen
- Staff
- Service Date
- Ward
- GPS location
- Blood pressure
- Pulse
- Temperature
- Health conditions
- Medicines and quantities
- Photo
- Created/updated timestamps
- Sync information
- Audit history where authorized

---

# 36. Admin Dashboard

Dashboard should support useful municipality analytics.

### Summary Cards

- Total Citizens
- Senior Citizens
- Widows/Widowers
- Citizens Served This Month
- Total Service Records
- Total Medicines Distributed
- Active Staff

---

# 37. Demographic Charts

Possible charts:

### Age Distribution

- Under 18
- 18–60
- Above 60

### Gender Distribution

- Male
- Female
- Other

### Citizen Category

- Senior Citizen
- Widow
- Widower
- Other configured categories

### Caste / Community

Distribution by selected group.

---

# 38. Geographic Analytics

Reports should support:

### Citizens Served by Ward

Example:

```text
Ward 1    245
Ward 2    318
Ward 3    198
...
```

### Services by Ward

Can be filtered by:

- Month
- Year
- Staff
- Medicine
- Health condition

---

# 39. Health Analytics

Possible dashboard components:

- Most common health problems
- Health conditions by ward
- Hypertension cases
- Diabetes cases
- Health problems by age group
- Health problems by gender
- Health problem trends by month/year

These represent recorded survey/service observations and should not automatically be interpreted by the software as clinical diagnoses unless entered as such by authorized health professionals.

---

# 40. Medicine Analytics

Charts should include:

### Medicine vs Quantity

Filter by:

- Month
- Year
- Ward
- Medicine
- Staff
- Citizen category

### Most Distributed Medicines

### Medicine Distribution Over Time

### Medicine Distribution by Ward

---

# 41. Medicine Management

Admin can:

- Create
- Update
- View
- Search
- Archive
- Import
- Export

Avoid permanently deleting medicines already referenced by service records.

---

# 42. Staff Management

Admin can:

- Add staff
- Edit staff
- Disable staff
- View staff
- Search staff
- Reset access where appropriate

Fields:

- Name
- Email
- Phone
- Status
- Number of citizens created
- Number of service records entered
- Last login
- Last synchronization

When significant account information changes, notification emails can be sent.

---

# 43. Staff Android Application

Technology:

- React Native
- Expo
- TypeScript
- Expo Router
- SQLite
- React Hook Form
- Yup
- React Query / TanStack Query
- SecureStore

---

# 44. Staff Application Main Flow

Recommended navigation:

```text
Login

→ Home
   ├── Citizens
   ├── Add Citizen
   ├── Add Service Record
   ├── Pending Sync
   ├── Failed Sync
   └── Settings
```

---

# 45. Offline-First Architecture

All important survey functionality must work without internet.

SQLite stores:

- Citizens
- Wards
- Medicines
- Health conditions
- Citizen categories
- Service records
- Service medicines
- Photos metadata
- Sync queue
- Translation/configuration data

---

# 46. Initial Reference Data Sync

After authentication, the application downloads reference data such as:

- Wards
- Medicines
- Medicine units
- Health conditions
- Citizen categories
- Dropdown options
- Translation data
- Application configuration

The data is stored locally.

The user should not need internet to populate dropdowns afterward.

---

# 47. Reference Data Versioning

Instead of downloading every medicine and dropdown value on every login, the server should support versions.

Example:

```text
medicineVersion: 17
healthConditionVersion: 8
wardVersion: 3
```

The mobile application sends its current version.

If unchanged, the server sends nothing.

This substantially reduces bandwidth and server load.

---

# 48. Offline Citizen Creation

Each offline citizen receives a client-generated UUID.

Example:

```text
client_uuid = d3db2983-...
```

The same UUID is referenced by locally created service records.

This ensures related data remains correctly connected during synchronization.

---

# 49. Offline Service Creation

A staff member can:

1. Find an existing citizen.
2. Create a new citizen if necessary.
3. Enter service information.
4. Capture health measurements.
5. Select conditions.
6. Select medicines.
7. Enter medicine quantities.
8. Take photo.
9. Capture GPS.
10. Save.

Everything should save to SQLite immediately.

Internet connectivity should not be required.

---

# 50. Synchronization Status

Each synchronizable record should include:

```text
pending
syncing
synced
failed
conflict
```

Display statuses clearly.

Example:

- ✅ Synced
- 🕒 Pending
- ⚠ Failed
- 🔄 Syncing
- ⚡ Conflict

---

# 51. Sync Queue

Recommended dependency order:

```text
Citizen
   ↓
Service Record
   ↓
Health Conditions
   ↓
Medicines
   ↓
Images
```

The server should support batch synchronization.

---

# 52. Synchronization API

Example:

```text
POST /api/v1/sync/push
```

Payload may contain:

```text
citizens
serviceRecords
serviceHealthConditions
serviceMedicines
files
```

Then:

```text
GET /api/v1/sync/pull?cursor=...
```

returns server-side changes since the previous successful synchronization.

---

# 53. Sync Conflict Detection

Every server record should contain a version.

Example:

```text
version: 6
```

Staff edits version 6.

Meanwhile Admin edits the same record, resulting in:

```text
version: 7
```

If the mobile app attempts to submit based on version 6, the API returns a conflict.

The system should not silently overwrite important citizen information.

---

# 54. Authentication

Backend authentication supports:

- Admin login
- Staff login
- Forgot password
- OTP
- Refresh tokens
- Logout/session revocation

Public Citizen Portal lookup does not use normal account authentication.

---

# 55. Authorization

Initial roles:

```text
ADMIN
STAFF
```

Potential future roles:

```text
SUPER_ADMIN
ADMIN
HEALTH_WORKER
DATA_COLLECTOR
VIEWER
```

Backend authorization must control actual data access.

Frontend visibility alone is not security.

---

# 56. Backend

Technology:

- Node.js
- Express.js
- TypeScript
- Prisma
- PostgreSQL
- Redis

---

# 57. Proposed Core Database Entities

```text
User
StaffProfile

Citizen
CitizenCategory
CitizenCategoryAssignment

Ward

HealthCondition

Medicine
MedicineUnit

CitizenServiceRecord
ServiceHealthCondition
ServiceMedicine

File

RefreshToken
PasswordResetOTP

SyncLog
AuditLog
AppVersion
SystemSetting
```

---

# 58. Core Relationships

```text
Citizen
   │
   ├── Citizen Categories
   │
   └── Service Records
          │
          ├── Ward
          │
          ├── Staff
          │
          ├── Health Conditions
          │
          ├── Medicines + Quantities
          │
          ├── GPS Location
          │
          └── Photo
```

---

# 59. Search

Admin should be able to search citizens using:

- Name
- Citizen ID
- Phone number

Filters:

- Ward
- Gender
- Category
- Caste/group
- Age range
- Occupation
- Marital status

---

# 60. Import / Export

Admin can import/export:

- Citizens
- Medicines
- Health conditions
- Service records

Supported:

- XLSX
- CSV

Reports may additionally support PDF.

---

# 61. Recommended Service Export Format

Rather than one giant column containing medicines, use separate structured sheets.

Example Excel workbook:

### Sheet 1 — Citizens

```text
citizen_id
name
age
gender
phone
category
caste_group
```

### Sheet 2 — Services

```text
service_id
citizen_id
service_date
year
month
ward
systolic
diastolic
pulse
temperature
latitude
longitude
```

### Sheet 3 — Service Health Conditions

```text
service_id
health_condition
```

### Sheet 4 — Service Medicines

```text
service_id
medicine
quantity
unit
```

This structure preserves relationships and is significantly safer for re-importing data.

---

# 62. Translation

The entire system should support localization from the beginning.

Initial languages:

- नेपाली
- English

Frontend text should use translation keys.

Example:

```text
citizen.name
citizen.gender
citizen.category
service.ward
service.bloodPressure
service.healthProblems
medicine.quantity
sync.pending
```

---

# 63. Master Data Translation

For values such as health problems and medicines, support translated labels.

Example:

```text
code: HYPERTENSION

name_en: Hypertension
name_ne: उच्च रक्तचाप
```

The database retains a stable code while the user interface displays the translated label.

---

# 64. Backend Error Translation

Backend should return stable codes.

Example:

```json
{
  "code": "CITIZEN_NOT_FOUND"
}
```

Frontend determines whether to display:

```text
Citizen not found.
```

or:

```text
नागरिक फेला परेन।
```

---

# 65. Admin Frontend Technology

Use:

- Next.js
- TypeScript
- Next.js App Router
- shadcn/ui
- Tailwind CSS
- React Hook Form
- Yup
- TanStack Query
- Lucide React
- i18n library
- Chart library

Do not use `react-router-dom`.

---

# 66. Photo Storage

Do not store image binary data directly in ordinary PostgreSQL columns.

Recommended architecture:

```text
Mobile/Web
    ↓
Image compression
    ↓
WebP
    ↓
Object Storage
    ↓
URL / File ID stored in PostgreSQL
```

---

# 67. Location Storage

Store GPS fields as numeric database columns:

```text
latitude
longitude
altitude
accuracy
```

If advanced geographic analysis is eventually required, PostgreSQL can later be extended with PostGIS.

---

# 68. Audit Logs

Important actions should be logged.

Examples:

```text
Citizen created
Citizen edited
Service record created
Service record edited
Medicine changed
Staff disabled
Import completed
Export generated
```

Log:

- User
- Action
- Entity
- Record ID
- Time
- Before/after values where appropriate

---

# 69. Data Security

Because the system contains personal and health-related information, access should be tightly controlled.

Requirements include:

- HTTPS
- Strong password hashing
- Secure token storage
- Role-based authorization
- Rate limiting
- Audit logs
- Restricted exports
- Device-secure token storage
- Input validation
- File-type validation
- File-size validation
- Secure API errors
- Database backups

---

# 70. Mobile Form UX

The service form should be divided into sections rather than showing everything on one very long screen.

Recommended flow:

### 1. Citizen

Select or create citizen.

### 2. Service Location

Ward and GPS.

### 3. Vital Signs

- Blood pressure
- Pulse
- Temperature

### 4. Health Problems

Multi-select conditions.

### 5. Medicines

Select medicine and quantity.

### 6. Photo

Capture citizen/service photo.

### 7. Review

Review entered information.

### 8. Save Offline

Record is stored locally.

---

# 71. Dynamic Survey Architecture

Even though the first version contains predefined fields, the architecture should avoid tightly coupling every possible survey question to the frontend.

Long-term, the platform could support configurable surveys similar in concept to KoBoToolbox.

Example future structure:

```text
Survey
  └── Sections
       └── Questions
            ├── Text
            ├── Number
            ├── Select One
            ├── Select Multiple
            ├── Date
            ├── GPS
            ├── Photo
            └── Calculation
```

This would allow Phedikhola Municipality to create other surveys without rebuilding the application.

This feature should be considered **future scope rather than MVP**, unless additional survey types are already planned.

---

# 72. MVP Scope

## Web Application

- Public homepage
- Citizen lookup
- Citizen details
- Admin login
- Dashboard
- Citizens
- Citizen categories
- Wards
- Health conditions
- Medicines
- Service records
- Staff management
- Import
- Export
- Settings
- Audit logs

---

## Mobile Application

- Login
- Forgot password
- Reference-data sync
- Offline citizen management
- Offline service entry
- Vital signs
- Health conditions
- Medicine + quantity
- Camera/photo
- GPS
- Offline SQLite
- Pending sync
- Failed sync
- Manual sync
- Automatic sync where appropriate
- App update/version checking
- Multilingual UI

---

# 73. Backend

- Authentication
- Authorization
- Citizen API
- Citizen categories
- Ward API
- Health-condition API
- Medicine API
- Service-record API
- Staff API
- Sync engine
- File upload
- Import/export
- Dashboard analytics
- Audit logging
- Email
- Redis
- Rate limiting
- App-version management

---

# 74. Key Technical Principle

The system should distinguish between:

### Citizen

Who the person **is**.

Example:

```text
Name
DOB
Gender
Phone
Category
Caste
Occupation
```

and:

### Citizen Service Record

What happened **during a particular service/visit**.

Example:

```text
Service Date
Ward
Blood Pressure
Pulse
Temperature
Health Problems
Medicines
Photo
Location
Staff Member
```

This distinction is important because a citizen should have **one profile but many historical service records**.

---

# 75. Core Field Data Flow

```text
Staff opens app
      ↓
Find / Create Citizen
      ↓
Create Service Record
      ↓
Choose Ward
      ↓
Capture Vital Signs
      ↓
Select Health Problems
      ↓
Select Medicines + Quantities
      ↓
Take Photo
      ↓
Capture GPS
      ↓
Review
      ↓
Save to SQLite
      ↓
Pending Sync
      ↓
Internet Available
      ↓
Batch Sync
      ↓
Backend Validation
      ↓
PostgreSQL
      ↓
Admin Dashboard / Citizen Portal
```

---

# 76. Recommended Next Design Phase

Before implementation, the following should be converted into explicit technical specifications:

1. Database ER diagram
2. Prisma database schema
3. Admin page sitemap
4. Mobile application screen flow
5. Citizen registration form schema
6. Service form schema
7. Offline SQLite schema
8. Sync algorithm
9. Sync API contract
10. REST API specification
11. Import/export Excel format
12. Role and permission matrix
13. Translation JSON structure
14. Dashboard KPI definitions
15. Deployment architecture
