
import { NextResponse } from "next/server";
import pool from "../../lib/db";

// GET /api
// Combined application health and database status check
export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM PATIENT) AS patients,
        (SELECT COUNT(*) FROM DOCTOR) AS doctors,
        (SELECT COUNT(*) FROM APPOINTMENT) AS appointments,
        (SELECT COUNT(*) FROM DOCTOR_AVAILABILITY) AS slots
    `);

    return NextResponse.json({
      status: "success",
      message: "Hospital Appointment System API is running",
      database: "connected",
      data: rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "API is running, but database connection failed.",
      },
      { status: 500 }
    );
  }
}
