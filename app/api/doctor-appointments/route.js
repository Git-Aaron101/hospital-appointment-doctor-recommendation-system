
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import pool from "../../../lib/db";

async function getAuthenticatedDoctor() {
  const cookieStore = await cookies();
  const token = cookieStore.get("doctor_token")?.value;

  if (!token || !process.env.AUTH_SECRET) {
    return null;
  }

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

// GET: Retrieve appointments belonging to the logged-in doctor.
export async function GET() {
  try {
    const doctorId = await getAuthenticatedDoctor();

    if (!doctorId) {
      return NextResponse.json(
        { error: "Please log in as a doctor." },
        { status: 401 }
      );
    }

    const [appointments] = await pool.execute(
      `SELECT
          a.Appointment_ID,
          a.Status,
          a.Reason,
          a.Booked_At,
          da.Availability_ID,
          da.Available_Date,
          da.Start_Time,
          da.End_Time,
          p.Patient_ID,
          p.First_Name AS Patient_First_Name,
          p.Last_Name AS Patient_Last_Name,
          p.Phone AS Patient_Phone,
          p.Email AS Patient_Email
       FROM APPOINTMENT a
       JOIN DOCTOR_AVAILABILITY da
         ON a.Availability_ID = da.Availability_ID
       JOIN PATIENT p
         ON a.Patient_ID = p.Patient_ID
       WHERE da.Doctor_ID = ?
       ORDER BY da.Available_Date ASC, da.Start_Time ASC`,
      [doctorId]
    );

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Doctor appointments error:", error);

    return NextResponse.json(
      { error: "Could not retrieve doctor appointments." },
      { status: 500 }
    );
  }
}

// PATCH: Update the status of an appointment belonging to this doctor.
export async function PATCH(request) {
  try {
    const doctorId = await getAuthenticatedDoctor();

    if (!doctorId) {
      return NextResponse.json(
        { error: "Please log in as a doctor." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const appointmentId = Number(body.appointmentId);
    const newStatus = body.status;

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return NextResponse.json(
        { error: "A valid appointment ID is required." },
        { status: 400 }
      );
    }

    if (!["Completed", "Cancelled"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Status must be Completed or Cancelled." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE APPOINTMENT a
       JOIN DOCTOR_AVAILABILITY da
         ON a.Availability_ID = da.Availability_ID
       SET a.Status = ?
       WHERE a.Appointment_ID = ?
         AND da.Doctor_ID = ?
         AND a.Status = 'Booked'`,
      [newStatus, appointmentId, doctorId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          error:
            "Appointment not found, not assigned to you, or no longer Booked.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Appointment marked as ${newStatus}.`,
    });
  } catch (error) {
    console.error("Doctor appointment update error:", error);

    return NextResponse.json(
      { error: "Could not update appointment status." },
      { status: 500 }
    );
  }
}
