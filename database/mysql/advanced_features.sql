USE hospital_system;

-- Advanced feature 1: transaction-based booking.
-- The unique constraint on APPOINTMENT.Availability_ID is the final protection
-- against two active bookings for the same slot.
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_book_appointment$$
CREATE PROCEDURE sp_book_appointment(
    IN p_patient_id INT,
    IN p_availability_id INT,
    IN p_reason VARCHAR(500)
)
BEGIN
    DECLARE v_slot_count INT DEFAULT 0;
    DECLARE v_existing_appointment_id INT DEFAULT NULL;
    DECLARE v_existing_status VARCHAR(20) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lock the requested slot row while checking and creating the booking.
    SELECT COUNT(*)
      INTO v_slot_count
      FROM DOCTOR_AVAILABILITY
     WHERE Availability_ID = p_availability_id
       AND Available_Date >= CURRENT_DATE
     FOR UPDATE;

    IF v_slot_count = 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Availability slot does not exist or is in the past';
    END IF;

    SELECT Appointment_ID, Status
      INTO v_existing_appointment_id, v_existing_status
      FROM APPOINTMENT
     WHERE Availability_ID = p_availability_id
     LIMIT 1
     FOR UPDATE;

    IF v_existing_appointment_id IS NOT NULL THEN
        IF v_existing_status <> 'Cancelled' THEN
            SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'This availability slot is already booked';
        ELSE
            UPDATE APPOINTMENT
               SET Patient_ID = p_patient_id,
                   Booked_At = CURRENT_TIMESTAMP,
                   Status = 'Booked',
                   Reason = p_reason
             WHERE Appointment_ID = v_existing_appointment_id;
        END IF;
    ELSE
        INSERT INTO APPOINTMENT (Patient_ID, Availability_ID, Status, Reason)
        VALUES (p_patient_id, p_availability_id, 'Booked', p_reason);
    END IF;

    COMMIT;
END$$

-- Advanced feature 2: stored procedure for patient appointment history.
DROP PROCEDURE IF EXISTS sp_patient_appointment_history$$
CREATE PROCEDURE sp_patient_appointment_history(IN p_patient_id INT)
BEGIN
    SELECT ap.Appointment_ID,
           CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
           dep.Department_Name,
           a.Available_Date,
           a.Start_Time,
           a.End_Time,
           ap.Status,
           ap.Reason
    FROM APPOINTMENT ap
    JOIN DOCTOR_AVAILABILITY a ON a.Availability_ID = ap.Availability_ID
    JOIN DOCTOR d ON d.Doctor_ID = a.Doctor_ID
    JOIN DEPARTMENT dep ON dep.Department_ID = d.Department_ID
    WHERE ap.Patient_ID = p_patient_id
    ORDER BY a.Available_Date DESC, a.Start_Time DESC;
END$$

DELIMITER ;

-- Example calls:
-- CALL sp_book_appointment(3, 2, 'General consultation');
-- CALL sp_patient_appointment_history(1);
