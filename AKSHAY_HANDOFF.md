# Akshay's Development Handoff
## Hospital Appointment & Doctor Recommendation System

### 1. Project Overview

The project is a Hospital Appointment and Doctor Recommendation System developed using:

- MySQL — primary relational database
- MongoDB — secondary NoSQL database
- Next.js — frontend and backend API
- Node.js — server-side runtime

The team has divided the implementation into two approximately equal parts.

- Aaron: MySQL foundation and patient-side appointment system.
- Akshay: MongoDB recommendation system and doctor/admin-side functionality.

Aaron's implementation is completed and pushed to the `main` branch. Akshay should build on the existing implementation rather than recreate it.

---

### 2. Existing MySQL Database

Database name: `hospital_system`

The existing database contains these ten tables:

1. PATIENT
2. DEPARTMENT
3. DOCTOR
4. SPECIALIZATION
5. MEDICINE
6. APPOINTMENT
7. DOCTOR_SPECIALIZATION
8. PRESCRIPTION
9. DOCTOR_AVAILABILITY
10. PRESCRIPTION_MEDICINE

The relational schema, constraints, foreign keys, indexes and sample data have already been implemented.

Important relationships:

- Patient to Appointment: One-to-Many
- Department to Doctor: One-to-Many
- Doctor to Specialization: Many-to-Many
- Doctor to Availability: One-to-Many
- Availability to Appointment: One-to-Zero-or-One
- Appointment to Prescription: One-to-Zero-or-One
- Prescription to Medicine: Many-to-Many

Do not unnecessarily redesign or duplicate these existing tables.

---

### 3. Existing Backend APIs

The following API routes are already implemented:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api` | GET | API health and database status |
| `/api/auth` | GET | Verify patient authentication using `?action=me` |
| `/api/auth` | POST | Registration, login and logout |
| `/api/departments` | GET | Retrieve departments |
| `/api/doctors` | GET | Retrieve doctors and filter by department |
| `/api/doctors?doctorId=ID&includeSlots=true` | GET | Retrieve a doctor's available slots |
| `/api/appointments` | GET | Retrieve logged-in patient's appointment history |
| `/api/appointments` | POST | Book or cancel an appointment |

Appointment API actions:

- `book`: Calls `sp_book_appointment`.
- `cancel`: Calls `sp_cancel_appointment`.

Patient authentication uses JWT stored in an HTTP-only cookie.

The backend obtains the authenticated patient's ID from the JWT rather than trusting a patient ID supplied by the frontend.

---

### 4. Existing Frontend

The following frontend components are already implemented:

- Homepage and navigation
- Patient registration page
- Patient login page
- Dynamic logged-in patient's first name
- Logout functionality
- Departments listing
- Doctors listing with department filtering
- Doctor availability selector
- Appointment booking interface
- Patient appointment history
- Appointment cancellation

The patient-side booking lifecycle has been manually tested.

Do not replace these components unnecessarily. Extend them where integration requires it.

---

### 5. Akshay's Responsibilities

Akshay is responsible for the second half of the project.

#### A. MongoDB Integration

- Set up the MongoDB database.
- Design appropriate collections and document structures.
- Connect MongoDB to the existing Next.js backend.
- Implement the doctor recommendation functionality.
- Use the existing MySQL doctor and specialization data appropriately.

#### B. Doctor Recommendation System

Implement a meaningful recommendation mechanism.

Possible recommendation criteria:

- Doctor specialization
- Department
- Doctor experience
- Availability
- Consultation fee

Recommendations should be explainable and based on actual stored data.

Do not implement AI diagnosis or make unsupported medical recommendations.

#### C. Doctor/Admin Functionality

Implement the agreed doctor/admin-side functionality, including appropriate access control.

Coordinate with Aaron before changing shared authentication or existing patient APIs.

#### D. Additional Database Features

Implement the additional advanced database features required for the NoSQL portion of the assignment.

Document the purpose and implementation of each feature.

---

### 6. Integration Rules

1. Pull the latest `main` branch before beginning.
2. Do not overwrite Aaron's existing patient-side functionality.
3. Keep MySQL as the existing primary relational database.
4. Use MongoDB for the secondary database requirements.
5. Do not duplicate existing MySQL tables without a clear reason.
6. Keep environment variables in `.env.local`.
7. Never commit database passwords, JWT secrets or other credentials.
8. Coordinate changes to shared frontend and API files.
9. Test each feature before merging.
10. Document which team member implemented each feature.

Suggested branch:

`feature/akshay-mongodb-recommendations`

---

### 7. Current Completion and Remaining Work

| Workstream | Responsibility | Status |
|---|---|---|
| MySQL schema and sample data | Aaron | Complete |
| SQL queries and advanced features | Aaron | Complete |
| Next.js and MySQL integration | Aaron | Complete |
| Patient authentication | Aaron | Complete |
| Patient appointment workflow | Aaron | Complete |
| MongoDB setup | Akshay | Pending |
| Doctor recommendation system | Akshay | Pending |
| Doctor/admin functionality | Akshay | Pending |
| Final integration | Both | Pending |
| Final documentation and demo | Both | Pending |

---

### 8. Important Instructions

The existing implementation is the foundation for the remaining project.

Akshay should first inspect the repository, understand the existing database schema and API contracts, and then implement his assigned features.

The objective is to integrate both contributions into one working application without duplicating or breaking completed functionality.
