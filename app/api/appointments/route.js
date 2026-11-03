
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import pool from "../../../lib/db";

async function getAuthenticatedPatient() {
  const cookieStore = await cookies();
  const token = cookieStore.get("patient_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "patient" || !payload.patientId) {
      return null;
    }

    return Number(payload.patientId);
  } catch {
    return null;
  }
}

// GET /api/appointments
// Retrieves the logged-in patient's appointment history.
export async function GET() {
  try {
    const patientId = await getAuthenticatedPatient();

    if (!patientId) {
      return NextResponse.json(
        { error: "Please log in to view your appointments." },
        { status: 401 }
      );
    }

    const [appointments] = await pool.execute(
      `SELECT
          a.Appointment_ID,
          a.Status,
          a.Reason,
          a.Booked_At,
          da.Available_Date,
          da.Start_Time,
          da.End_Time,
          d.Doctor_ID,
          CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
          dep.Department_Name
       FROM APPOINTMENT a
       JOIN DOCTOR_AVAILABILITY da
         ON a.Availability_ID = da.Availability_ID
       JOIN DOCTOR d
         ON da.Doctor_ID = d.Doctor_ID
       JOIN DEPARTMENT dep
         ON d.Department_ID = dep.Department_ID
       WHERE a.Patient_ID = ?
       ORDER BY da.Available_Date DESC, da.Start_Time DESC`,
      [patientId]
    );

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Appointment history error:", error);

    return NextResponse.json(
      { error: "Could not retrieve appointment history." },
      { status: 500 }
    );
  }
}

// POST /api/appointments
// Supports booking and cancellation.
export async function POST(request) {
  try {
    const patientId = await getAuthenticatedPatient();

    if (!patientId) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "book") {
      const availabilityId = Number(body.availabilityId);
      const reason = body.reason?.trim() || null;

      if (
        !Number.isInteger(availabilityId) ||
        availabilityId <= 0
      ) {
        return NextResponse.json(
          { error: "A valid availability ID is required." },
          { status: 400 }
        );
      }

      if (reason !== null && reason.length > 500) {
        return NextResponse.json(
          { error: "Reason cannot exceed 500 characters." },
          { status: 400 }
        );
      }

      await pool.query(
        "CALL sp_book_appointment(?, ?, ?)",
        [patientId, availabilityId, reason]
      );

      return NextResponse.json({
        message: "Appointment booked successfully."
      });
    }

    if (action === "cancel") {
      const appointmentId = Number(body.appointmentId);

      if (
        !Number.isInteger(appointmentId) ||
        appointmentId <= 0
      ) {
        return NextResponse.json(
          { error: "A valid appointment ID is required." },
          { status: 400 }
        );
      }

      await pool.query(
        "CALL sp_cancel_appointment(?, ?)",
        [appointmentId, patientId]
      );

      return NextResponse.json({
        message: "Appointment cancelled successfully."
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'book' or 'cancel'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Appointment operation error:", error);

    return NextResponse.json(
      { error: error.sqlMessage || error.message || "Appointment operation failed." },
      { status: 400 }
    );
  }
}
