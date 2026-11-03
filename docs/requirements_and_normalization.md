# Hospital Appointment & Doctor Recommendation System
## Aaron — Part 1: Requirements and relational design

### Problem statement
Patients often need to identify an appropriate department or doctor, find an available consultation time, and manage appointments. The project provides a centralized database-backed application for patient registration, doctor and department browsing, availability checking, appointment booking, and appointment history.

### Objectives
- Maintain structured patient, doctor, department, specialization, and medicine records.
- Represent doctor-specialization relationships and doctor availability accurately.
- Allow patients to book and cancel appointments.
- Prevent duplicate bookings for the same availability slot.
- Store prescriptions and their associated medicines.
- Demonstrate relational database concepts and advanced SQL features from the course.

### Scope of Aaron's implementation
- Requirements and relational design documentation.
- ER model, relational schema, functional dependencies, and normalization.
- MySQL database schema, constraints, indexes, and fictional sample data.
- SQL queries demonstrating joins, grouping, aggregates, HAVING, subqueries, NULL handling, and set operations.
- Patient-side appointment booking foundation and SQL booking/cancellation operations.
- Next.js/API foundation in the later application stage.

MongoDB-based recommendations, doctor/admin functionality, and remaining integration are reserved for Akshay's later contribution.

### Functional requirements
| ID | Requirement |
|---|---|
| FR01 | A patient can register and maintain a patient profile. |
| FR02 | A patient can browse departments. |
| FR03 | A patient can browse doctors and their specializations. |
| FR04 | A patient can view available doctor time slots. |
| FR05 | A patient can book an available slot. |
| FR06 | A patient can view their appointment history. |
| FR07 | A patient can cancel an eligible booked appointment. |
| FR08 | The system prevents two appointments from reserving the same slot. |
| FR09 | A prescription can be associated with an appointment. |
| FR10 | A prescription can contain one or more medicines. |

### Non-functional requirements
- Data integrity is enforced through primary keys, foreign keys, unique constraints, and checks.
- Passwords are stored as hashes, never plaintext.
- Booking and cancellation operations use transactions.
- Frequently used join and filter columns are indexed.
- Only fictional sample data is used in the public repository.
- Database credentials and secrets are kept outside source control.

### Data model assumptions
1. A row in DOCTOR_AVAILABILITY represents one bookable time slot.
2. An appointment references exactly one availability slot.
3. A slot can have at most one appointment row. A cancelled appointment row can be reused by the booking procedure.
4. Doctor, date, and time are obtained by joining APPOINTMENT to DOCTOR_AVAILABILITY; they are not duplicated in APPOINTMENT.
5. Each appointment can have zero or one prescription.
6. A medicine appears at most once in a prescription. If repeated medicine lines are required, add a Prescription_Medicine_ID or Line_Number.
7. Patient phone/email and doctor phone/email are unique in this implementation.
8. Department and specialization names are unique.

### Normalization summary
- 1NF: fields are atomic; repeating specialization and medicine groups are represented through junction relations.
- 2NF: non-key attributes depend on the complete candidate key. The composite-key relations DOCTOR_SPECIALIZATION and PRESCRIPTION_MEDICINE have no partial dependency.
- 3NF: appointment date/time and doctor identity are not duplicated in APPOINTMENT; they are obtained through the referenced availability row.
- BCNF: under the candidate-key and uniqueness assumptions documented above, every non-trivial determinant is a candidate key.

### Important implementation note
The SQL targets MySQL 8.0.16 or later. The sample password values are deliberately fictional placeholders and must not be used for authentication. The application must generate real password hashes using a suitable password-hashing library.
