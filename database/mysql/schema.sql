-- Hospital Appointment & Doctor Recommendation System
-- Aaron's Part 1: MySQL relational foundation
-- Target: MySQL 8.0.16+

CREATE DATABASE IF NOT EXISTS hospital_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE hospital_system;

-- Drop existing tables in dependency order
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS PRESCRIPTION_MEDICINE;
DROP TABLE IF EXISTS PRESCRIPTION;
DROP TABLE IF EXISTS APPOINTMENT;
DROP TABLE IF EXISTS DOCTOR_AVAILABILITY;
DROP TABLE IF EXISTS DOCTOR_SPECIALIZATION;
DROP TABLE IF EXISTS MEDICINE;
DROP TABLE IF EXISTS SPECIALIZATION;
DROP TABLE IF EXISTS DOCTOR;
DROP TABLE IF EXISTS DEPARTMENT;
DROP TABLE IF EXISTS PATIENT;

SET FOREIGN_KEY_CHECKS = 1;


-- 1. PATIENT TABLE

CREATE TABLE PATIENT (
    Patient_ID INT AUTO_INCREMENT PRIMARY KEY,
    First_Name VARCHAR(60) NOT NULL,
    Last_Name VARCHAR(60) NOT NULL,
    Date_of_Birth DATE NOT NULL,
    Gender ENUM('Female', 'Male', 'Other', 'Prefer not to say') NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Email VARCHAR(120) NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL,
    Address VARCHAR(255),
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_patient_phone UNIQUE (Phone),
    CONSTRAINT uq_patient_email UNIQUE (Email)
) ENGINE=InnoDB;


-- 2. DEPARTMENT TABLE

CREATE TABLE DEPARTMENT (
    Department_ID INT AUTO_INCREMENT PRIMARY KEY,
    Department_Name VARCHAR(100) NOT NULL,
    Description VARCHAR(500),

    CONSTRAINT uq_department_name UNIQUE (Department_Name)
) ENGINE=InnoDB;


-- 3. DOCTOR TABLE

CREATE TABLE DOCTOR (
    Doctor_ID INT AUTO_INCREMENT PRIMARY KEY,
    Department_ID INT NOT NULL,
    First_Name VARCHAR(60) NOT NULL,
    Last_Name VARCHAR(60) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Email VARCHAR(120) NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL,
    Qualification VARCHAR(150) NOT NULL,
    Years_Experience TINYINT UNSIGNED NOT NULL DEFAULT 0,
    Consultation_Fee DECIMAL(10,2) NOT NULL,
    Is_Active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_doctor_phone UNIQUE (Phone),
    CONSTRAINT uq_doctor_email UNIQUE (Email),
    CONSTRAINT chk_doctor_fee CHECK (Consultation_Fee >= 0),

    CONSTRAINT fk_doctor_department
        FOREIGN KEY (Department_ID)
        REFERENCES DEPARTMENT(Department_ID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_doctor_department (Department_ID),
    INDEX idx_doctor_name (Last_Name, First_Name)
) ENGINE=InnoDB;


-- 4. SPECIALIZATION TABLE

CREATE TABLE SPECIALIZATION (
    Specialization_ID INT AUTO_INCREMENT PRIMARY KEY,
    Specialization_Name VARCHAR(100) NOT NULL,
    Description VARCHAR(500),

    CONSTRAINT uq_specialization_name UNIQUE (Specialization_Name)
) ENGINE=InnoDB;


-- 5. MEDICINE TABLE

CREATE TABLE MEDICINE (
    Medicine_ID INT AUTO_INCREMENT PRIMARY KEY,
    Medicine_Name VARCHAR(150) NOT NULL,
    Manufacturer VARCHAR(150),
    Description VARCHAR(500),

    CONSTRAINT uq_medicine_name UNIQUE (Medicine_Name)
) ENGINE=InnoDB;


-- 6. DOCTOR_SPECIALIZATION TABLE
-- Resolves the many-to-many relationship between DOCTOR and SPECIALIZATION.

CREATE TABLE DOCTOR_SPECIALIZATION (
    Doctor_ID INT NOT NULL,
    Specialization_ID INT NOT NULL,

    PRIMARY KEY (Doctor_ID, Specialization_ID),

    CONSTRAINT fk_ds_doctor
        FOREIGN KEY (Doctor_ID)
        REFERENCES DOCTOR(Doctor_ID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_ds_specialization
        FOREIGN KEY (Specialization_ID)
        REFERENCES SPECIALIZATION(Specialization_ID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 7. DOCTOR_AVAILABILITY TABLE

CREATE TABLE DOCTOR_AVAILABILITY (
    Availability_ID INT AUTO_INCREMENT PRIMARY KEY,
    Doctor_ID INT NOT NULL,
    Available_Date DATE NOT NULL,
    Start_Time TIME NOT NULL,
    End_Time TIME NOT NULL,

    CONSTRAINT uq_doctor_slot
        UNIQUE (Doctor_ID, Available_Date, Start_Time),

    CONSTRAINT chk_slot_time
        CHECK (End_Time > Start_Time),

    CONSTRAINT fk_availability_doctor
        FOREIGN KEY (Doctor_ID)
        REFERENCES DOCTOR(Doctor_ID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_availability_date (Available_Date, Start_Time),
    INDEX idx_availability_doctor_date (Doctor_ID, Available_Date)
) ENGINE=InnoDB;


-- 8. APPOINTMENT TABLE

CREATE TABLE APPOINTMENT (
    Appointment_ID INT AUTO_INCREMENT PRIMARY KEY,
    Patient_ID INT NOT NULL,
    Availability_ID INT NOT NULL,
    Booked_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    Status ENUM('Booked', 'Completed', 'Cancelled', 'No-show')
        NOT NULL DEFAULT 'Booked',

    Reason VARCHAR(500),

    CONSTRAINT uq_appointment_availability
        UNIQUE (Availability_ID),

    CONSTRAINT fk_appointment_patient
        FOREIGN KEY (Patient_ID)
        REFERENCES PATIENT(Patient_ID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_appointment_availability
        FOREIGN KEY (Availability_ID)
        REFERENCES DOCTOR_AVAILABILITY(Availability_ID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_appointment_patient (Patient_ID, Booked_At),
    INDEX idx_appointment_status (Status)
) ENGINE=InnoDB;


-- 9. PRESCRIPTION TABLE

CREATE TABLE PRESCRIPTION (
    Prescription_ID INT AUTO_INCREMENT PRIMARY KEY,
    Appointment_ID INT NOT NULL,
    Prescribed_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Diagnosis VARCHAR(500) NOT NULL,
    Notes VARCHAR(1000),

    CONSTRAINT uq_prescription_appointment
        UNIQUE (Appointment_ID),

    CONSTRAINT fk_prescription_appointment
        FOREIGN KEY (Appointment_ID)
        REFERENCES APPOINTMENT(Appointment_ID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 10. PRESCRIPTION_MEDICINE TABLE
-- Resolves the many-to-many relationship between PRESCRIPTION and MEDICINE.

CREATE TABLE PRESCRIPTION_MEDICINE (
    Prescription_ID INT NOT NULL,
    Medicine_ID INT NOT NULL,
    Dosage VARCHAR(100) NOT NULL,
    Frequency VARCHAR(100) NOT NULL,
    Duration_Days SMALLINT UNSIGNED NOT NULL,
    Instructions VARCHAR(500),

    PRIMARY KEY (Prescription_ID, Medicine_ID),

    CONSTRAINT chk_duration
        CHECK (Duration_Days > 0),

    CONSTRAINT fk_pm_prescription
        FOREIGN KEY (Prescription_ID)
        REFERENCES PRESCRIPTION(Prescription_ID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_pm_medicine
        FOREIGN KEY (Medicine_ID)
        REFERENCES MEDICINE(Medicine_ID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- SCHEMA CREATION COMPLETE