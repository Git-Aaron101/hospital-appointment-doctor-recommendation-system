USE hospital_system;

-- Q1. List all patients.
SELECT Patient_ID, First_Name, Last_Name, Phone, Email
FROM PATIENT
ORDER BY Last_Name, First_Name;

-- Q2. List doctors with their department.
SELECT d.Doctor_ID, CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
       dep.Department_Name, d.Consultation_Fee
FROM DOCTOR d
JOIN DEPARTMENT dep ON dep.Department_ID = d.Department_ID
ORDER BY dep.Department_Name, Doctor_Name;

-- Q3. List doctors and their specializations (many-to-many join).
SELECT CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
       s.Specialization_Name
FROM DOCTOR d
JOIN DOCTOR_SPECIALIZATION ds ON ds.Doctor_ID = d.Doctor_ID
JOIN SPECIALIZATION s ON s.Specialization_ID = ds.Specialization_ID
ORDER BY Doctor_Name;

-- Q4. Show future availability with doctor and department.
SELECT a.Availability_ID, CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
       dep.Department_Name, a.Available_Date, a.Start_Time, a.End_Time
FROM DOCTOR_AVAILABILITY a
JOIN DOCTOR d ON d.Doctor_ID = a.Doctor_ID
JOIN DEPARTMENT dep ON dep.Department_ID = d.Department_ID
LEFT JOIN APPOINTMENT ap
  ON ap.Availability_ID = a.Availability_ID
 AND ap.Status <> 'Cancelled'
WHERE a.Available_Date >= CURRENT_DATE
  AND ap.Appointment_ID IS NULL
ORDER BY a.Available_Date, a.Start_Time;

-- Q5. Appointment history for each patient.
SELECT ap.Appointment_ID, CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
       CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
       a.Available_Date, a.Start_Time, ap.Status
FROM APPOINTMENT ap
JOIN PATIENT p ON p.Patient_ID = ap.Patient_ID
JOIN DOCTOR_AVAILABILITY a ON a.Availability_ID = ap.Availability_ID
JOIN DOCTOR d ON d.Doctor_ID = a.Doctor_ID
ORDER BY a.Available_Date DESC, a.Start_Time DESC;

-- Q6. Count appointments by status.
SELECT Status, COUNT(*) AS Appointment_Count
FROM APPOINTMENT
GROUP BY Status
ORDER BY Appointment_Count DESC;

-- Q7. Departments with at least one doctor.
SELECT dep.Department_Name, COUNT(d.Doctor_ID) AS Doctor_Count
FROM DEPARTMENT dep
LEFT JOIN DOCTOR d ON d.Department_ID = dep.Department_ID
GROUP BY dep.Department_ID, dep.Department_Name
HAVING COUNT(d.Doctor_ID) >= 1
ORDER BY Doctor_Count DESC;

-- Q8. Doctors whose consultation fee is above the overall average.
SELECT Doctor_ID, First_Name, Last_Name, Consultation_Fee
FROM DOCTOR
WHERE Consultation_Fee > (SELECT AVG(Consultation_Fee) FROM DOCTOR);

-- Q9. Patients who have at least one appointment (correlated EXISTS).
SELECT p.Patient_ID, p.First_Name, p.Last_Name
FROM PATIENT p
WHERE EXISTS (
    SELECT 1
    FROM APPOINTMENT ap
    WHERE ap.Patient_ID = p.Patient_ID
);

-- Q10. Doctors who have no availability slots.
SELECT d.Doctor_ID, d.First_Name, d.Last_Name
FROM DOCTOR d
WHERE NOT EXISTS (
    SELECT 1
    FROM DOCTOR_AVAILABILITY a
    WHERE a.Doctor_ID = d.Doctor_ID
);

-- Q11. Count completed appointments per doctor, including doctors with zero.
SELECT d.Doctor_ID, CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
       COUNT(ap.Appointment_ID) AS Completed_Count
FROM DOCTOR d
LEFT JOIN DOCTOR_AVAILABILITY a ON a.Doctor_ID = d.Doctor_ID
LEFT JOIN APPOINTMENT ap
  ON ap.Availability_ID = a.Availability_ID
 AND ap.Status = 'Completed'
GROUP BY d.Doctor_ID, d.First_Name, d.Last_Name
ORDER BY Completed_Count DESC;

-- Q12. Demonstrate NULL handling: doctors without a phone (should be none
-- because Phone is NOT NULL, but this query demonstrates IS NULL correctly).
SELECT Doctor_ID, First_Name, Last_Name
FROM DOCTOR
WHERE Phone IS NULL;

-- Q13. Set operation using UNION: people contact list.
SELECT First_Name, Last_Name, Phone, 'Patient' AS Person_Type
FROM PATIENT
UNION
SELECT First_Name, Last_Name, Phone, 'Doctor' AS Person_Type
FROM DOCTOR
ORDER BY Person_Type, Last_Name;

-- Q14. Prescription details.
SELECT pr.Prescription_ID, pr.Diagnosis, m.Medicine_Name,
       pm.Dosage, pm.Frequency, pm.Duration_Days
FROM PRESCRIPTION pr
JOIN PRESCRIPTION_MEDICINE pm ON pm.Prescription_ID = pr.Prescription_ID
JOIN MEDICINE m ON m.Medicine_ID = pm.Medicine_ID;
