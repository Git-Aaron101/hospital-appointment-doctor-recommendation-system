
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import pool from "../../../lib/db";

async function getAuthenticatedDoctor() {
  const cookieStore = await cookies();
  const token = cookieStore.get("doctor_token")?.value;

  if (!token || !process.env.AUTH_SECRET) return null;

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "doctor" || !payload.doctorId) {
      return null;
    }

    return Number(payload.doctorId);
  } catch {
    return null;
  }
}

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

// GET: Retrieve only non-deleted availability belonging to the doctor.
export async function GET() {
  try {
    const doctorId = await getAuthenticatedDoctor();

    if (!doctorId) {
      return errorResponse("Please log in as a doctor.", 401);
    }

    const [slots] = await pool.execute(
      `SELECT
          da.Availability_ID,
          da.Available_Date,
          da.Start_Time,
          da.End_Time,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM APPOINTMENT a
              WHERE a.Availability_ID = da.Availability_ID
                AND a.Status <> 'Cancelled'
            )
            THEN 'Booked'
            ELSE 'Available'
          END AS Slot_Status
       FROM DOCTOR_AVAILABILITY da
       WHERE da.Doctor_ID = ?
         AND da.Is_Deleted = 0
       ORDER BY da.Available_Date ASC, da.Start_Time ASC`,
      [doctorId]
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Doctor availability retrieval error:", error);

    return NextResponse.json(
      { error: "Could not retrieve availability." },
      { status: 500 }
    );
  }
}

// POST: Generate appointment slots for the logged-in doctor.
export async function POST(request) {
  let connection;

  try {
    const doctorId = await getAuthenticatedDoctor();

    if (!doctorId) {
      return errorResponse("Please log in as a doctor.", 401);
    }

    const body = await request.json();
    const { date, startTime, endTime, duration } = body;

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return errorResponse("Please provide a valid date.");
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return errorResponse("Invalid calendar date.");
    }

    if (date <= new Date().toISOString().slice(0, 10)) {
      return errorResponse("Availability date must be in the future.");
    }

    if (
      typeof startTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
      typeof endTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
    ) {
      return errorResponse("Please provide valid start and end times.");
    }

    if (![15, 30, 60].includes(Number(duration))) {
      return errorResponse(
        "Appointment duration must be 15, 30 or 60 minutes."
      );
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const slotDuration = Number(duration);

    if (endMinutes <= startMinutes) {
      return errorResponse("End time must be later than start time.");
    }

    if ((endMinutes - startMinutes) % slotDuration !== 0) {
      return errorResponse(
        "The selected time range must divide evenly into appointment slots."
      );
    }

    const [doctors] = await pool.execute(
      "SELECT Doctor_ID FROM DOCTOR WHERE Doctor_ID = ? AND Is_Active = 1",
      [doctorId]
    );

    if (doctors.length === 0) {
      return errorResponse("Doctor account is not active.", 403);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check overlaps only against active, non-deleted availability.
    const [existingSlots] = await connection.execute(
      `SELECT Availability_ID, Start_Time, End_Time
       FROM DOCTOR_AVAILABILITY
       WHERE Doctor_ID = ?
         AND Available_Date = ?
         AND Is_Deleted = 0
       FOR UPDATE`,
      [doctorId, date]
    );

    const overlaps = existingSlots.some((slot) => {
      const existingStart = timeToMinutes(slot.Start_Time);
      const existingEnd = timeToMinutes(slot.End_Time);

      return (
        startMinutes < existingEnd &&
        endMinutes > existingStart
      );
    });

    if (overlaps) {
      await connection.rollback();

      return errorResponse(
        "This time range overlaps with existing doctor availability."
      );
    }

    const insertQuery = `
      INSERT INTO DOCTOR_AVAILABILITY
        (Doctor_ID, Available_Date, Start_Time, End_Time)
      VALUES (?, ?, ?, ?)
    `;

    const generatedSlots = [];

    for (
      let currentTime = startMinutes;
      currentTime < endMinutes;
      currentTime += slotDuration
    ) {
      const slotEnd = currentTime + slotDuration;

      const formatTime = (minutes) => {
        const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
        const mins = String(minutes % 60).padStart(2, "0");
        return `${hours}:${mins}:00`;
      };

      const slotStartTime = formatTime(currentTime);
      const slotEndTime = formatTime(slotEnd);

      const [result] = await connection.execute(insertQuery, [
        doctorId,
        date,
        slotStartTime,
        slotEndTime,
      ]);

      generatedSlots.push({
        Availability_ID: result.insertId,
        Available_Date: date,
        Start_Time: slotStartTime,
        End_Time: slotEndTime,
      });
    }

    await connection.commit();

    return NextResponse.json(
      {
        message: `${generatedSlots.length} appointment slots created successfully.`,
        slots: generatedSlots,
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Doctor availability creation error:", error);

    return NextResponse.json(
      { error: "Could not create availability slots." },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// DELETE: Soft-delete an unused slot while preserving appointment history.
export async function DELETE(request) {
  let connection;

  try {
    const doctorId = await getAuthenticatedDoctor();

    if (!doctorId) {
      return errorResponse("Please log in as a doctor.", 401);
    }

    const body = await request.json();
    const availabilityId = Number(body.availabilityId);

    if (!Number.isInteger(availabilityId) || availabilityId <= 0) {
      return errorResponse("A valid availability ID is required.");
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify that this slot belongs to the logged-in doctor.
    const [slots] = await connection.execute(
      `SELECT Availability_ID
       FROM DOCTOR_AVAILABILITY
       WHERE Availability_ID = ?
         AND Doctor_ID = ?
         AND Is_Deleted = 0
       FOR UPDATE`,
      [availabilityId, doctorId]
    );

    if (slots.length === 0) {
      await connection.rollback();

      return errorResponse(
        "Availability slot not found or already deleted.",
        404
      );
    }

    // A slot can be removed if it has no appointment
    // or only cancelled appointments.
    const [activeAppointments] = await connection.execute(
      `SELECT Appointment_ID, Status
       FROM APPOINTMENT
       WHERE Availability_ID = ?
         AND Status <> 'Cancelled'
       LIMIT 1`,
      [availabilityId]
    );

    if (activeAppointments.length > 0) {
      await connection.rollback();

      return errorResponse(
        "This slot has an active or completed appointment and cannot be deleted.",
        409
      );
    }

    // Preserve the slot and its appointment history.
    await connection.execute(
      `UPDATE DOCTOR_AVAILABILITY
       SET Is_Deleted = 1
       WHERE Availability_ID = ?
         AND Doctor_ID = ?`,
      [availabilityId, doctorId]
    );

    await connection.commit();

    return NextResponse.json({
      message: "Availability slot removed successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Doctor availability deletion error:", error);

    return NextResponse.json(
      { error: "Could not remove availability slot." },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
