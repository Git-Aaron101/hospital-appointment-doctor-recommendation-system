USE hospital_system;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cancel_appointment$$
CREATE PROCEDURE sp_cancel_appointment(
    IN p_appointment_id INT,
    IN p_patient_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT Status INTO v_status
    FROM APPOINTMENT
    WHERE Appointment_ID = p_appointment_id
      AND Patient_ID = p_patient_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Appointment not found for this patient';
    ELSEIF v_status <> 'Booked' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Only booked appointments can be cancelled';
    ELSE
        UPDATE APPOINTMENT
           SET Status = 'Cancelled'
         WHERE Appointment_ID = p_appointment_id;
    END IF;

    COMMIT;
END$$

DELIMITER ;

-- Example: CALL sp_cancel_appointment(1, 1);
