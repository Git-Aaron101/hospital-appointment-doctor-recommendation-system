USE hospital_system;

INSERT INTO DEPARTMENT (Department_Name, Description) VALUES
('Cardiology', 'Heart and cardiovascular care'),
('Dermatology', 'Skin, hair and nail care'),
('Orthopedics', 'Bones, joints and musculoskeletal care'),
('General Medicine', 'Primary and general medical care');

INSERT INTO SPECIALIZATION (Specialization_Name, Description) VALUES
('Interventional Cardiology', 'Diagnosis and treatment of cardiovascular conditions'),
('Clinical Dermatology', 'Medical care for skin conditions'),
('Sports Orthopedics', 'Musculoskeletal and sports-related injuries'),
('Internal Medicine', 'Adult general medical care');

INSERT INTO PATIENT
(First_Name, Last_Name, Date_of_Birth, Gender, Phone, Email, Password_Hash, Address)
VALUES
('Riya', 'Sharma', '2003-04-12', 'Female', '9000000001', 'riya@example.test', '$2b$12$fictional_hash_riya', 'Bengaluru'),
('Arjun', 'Nair', '2002-11-03', 'Male', '9000000002', 'arjun@example.test', '$2b$12$fictional_hash_arjun', 'Mysuru'),
('Meera', 'Iyer', '2004-01-25', 'Female', '9000000003', 'meera@example.test', '$2b$12$fictional_hash_meera', 'Bengaluru');

INSERT INTO DOCTOR
(Department_ID, First_Name, Last_Name, Phone, Email, Password_Hash, Qualification, Years_Experience, Consultation_Fee)
VALUES
(1, 'Ananya', 'Rao', '9100000001', 'ananya.rao@example.test', '$2b$12$fictional_hash_doctor1', 'MBBS, MD Cardiology', 12, 800.00),
(2, 'Vikram', 'Menon', '9100000002', 'vikram.menon@example.test', '$2b$12$fictional_hash_doctor2', 'MBBS, MD Dermatology', 8, 600.00),
(3, 'Neha', 'Kulkarni', '9100000003', 'neha.kulkarni@example.test', '$2b$12$fictional_hash_doctor3', 'MBBS, MS Orthopedics', 10, 700.00),
(4, 'Rahul', 'Das', '9100000004', 'rahul.das@example.test', '$2b$12$fictional_hash_doctor4', 'MBBS, MD General Medicine', 6, 500.00);

INSERT INTO DOCTOR_SPECIALIZATION (Doctor_ID, Specialization_ID) VALUES
(1, 1), (2, 2), (3, 3), (4, 4);

INSERT INTO MEDICINE (Medicine_Name, Manufacturer, Description) VALUES
('Paracetamol 500 mg', 'Demo Pharma', 'Fictional sample catalogue entry'),
('Cetirizine 10 mg', 'Demo Pharma', 'Fictional sample catalogue entry'),
('Calcium Supplement', 'Demo Pharma', 'Fictional sample catalogue entry');

-- Future sample slots. Use dates relative to the project demo; adjust as needed.
INSERT INTO DOCTOR_AVAILABILITY
(Doctor_ID, Available_Date, Start_Time, End_Time) VALUES
(1, '2027-01-10', '09:00:00', '09:30:00'),
(1, '2027-01-10', '09:30:00', '10:00:00'),
(2, '2027-01-10', '10:00:00', '10:30:00'),
(3, '2027-01-11', '11:00:00', '11:30:00'),
(4, '2027-01-11', '12:00:00', '12:30:00');

INSERT INTO APPOINTMENT (Patient_ID, Availability_ID, Status, Reason) VALUES
(1, 1, 'Booked', 'Routine consultation'),
(2, 3, 'Completed', 'Skin irritation follow-up');

INSERT INTO PRESCRIPTION (Appointment_ID, Diagnosis, Notes) VALUES
(2, 'Sample diagnosis for demonstration', 'Fictional data only');

INSERT INTO PRESCRIPTION_MEDICINE
(Prescription_ID, Medicine_ID, Dosage, Frequency, Duration_Days, Instructions) VALUES
(1, 1, '500 mg', 'Twice daily', 3, 'Take after food');
