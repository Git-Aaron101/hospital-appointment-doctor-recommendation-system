
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const departmentId = searchParams.get("departmentId");
    const doctorId = searchParams.get("doctorId");
    const includeSlots = searchParams.get("includeSlots") === "true";

    // Validate department ID
    if (departmentId !== null) {
      const id = Number(departmentId);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { status: "error", message: "Invalid department ID" },
          { status: 400 }
        );
      }
    }

    // Validate doctor ID
    if (doctorId !== null) {
      const id = Number(doctorId);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { status: "error", message: "Invalid doctor ID" },
          { status: 400 }
        );
      }
    }

    // =====================================
    // DOCTOR AVAILABILITY
    // GET /api/doctors?doctorId=1&includeSlots=true
    // =====================================
    if (includeSlots) {
      if (!doctorId) {
        return NextResponse.json(
          {
            status: "error",
            message: "Doctor ID is required to retrieve slots.",
          },
          { status: 400 }
        );
      }

      const [slots] = await pool.execute(
        `
        SELECT
          da.Availability_ID,
          da.Doctor_ID,
          da.Available_Date,
          da.Start_Time,
          da.End_Time
        FROM DOCTOR_AVAILABILITY da
        INNER JOIN DOCTOR d
          ON da.Doctor_ID = d.Doctor_ID
        LEFT JOIN APPOINTMENT a
          ON da.Availability_ID = a.Availability_ID
        WHERE da.Doctor_ID = ?
          AND d.Is_Active = 1
          AND da.Available_Date >= CURDATE()
          AND (
            a.Appointment_ID IS NULL
            OR a.Status = 'Cancelled'
          )
        ORDER BY da.Available_Date, da.Start_Time
        `,
        [Number(doctorId)]
      );

      return NextResponse.json({
        status: "success",
        count: slots.length,
        slots,
      });
    }

    // =====================================
    // DOCTOR LISTING
    // GET /api/doctors
    // GET /api/doctors?departmentId=1
    // =====================================
    let sql = `
      SELECT
        d.Doctor_ID,
        d.First_Name,
        d.Last_Name,
        d.Qualification,
        d.Years_Experience,
        d.Consultation_Fee,
        d.Department_ID,
        dep.Department_Name,
        s.Specialization_ID,
        s.Specialization_Name
      FROM DOCTOR d
      INNER JOIN DEPARTMENT dep
        ON d.Department_ID = dep.Department_ID
      LEFT JOIN DOCTOR_SPECIALIZATION ds
        ON d.Doctor_ID = ds.Doctor_ID
      LEFT JOIN SPECIALIZATION s
        ON ds.Specialization_ID = s.Specialization_ID
      WHERE d.Is_Active = 1
    `;

    const params = [];

    if (departmentId !== null) {
      sql += " AND d.Department_ID = ?";
      params.push(Number(departmentId));
    }

    if (doctorId !== null) {
      sql += " AND d.Doctor_ID = ?";
      params.push(Number(doctorId));
    }

    sql += `
      ORDER BY d.Doctor_ID, s.Specialization_Name
    `;

    const [rows] = await pool.execute(sql, params);

    const doctorsMap = new Map();

    for (const row of rows) {
      if (!doctorsMap.has(row.Doctor_ID)) {
        doctorsMap.set(row.Doctor_ID, {
          Doctor_ID: row.Doctor_ID,
          First_Name: row.First_Name,
          Last_Name: row.Last_Name,
          Qualification: row.Qualification,
          Years_Experience: row.Years_Experience,
          Consultation_Fee: row.Consultation_Fee,
          Department_ID: row.Department_ID,
          Department_Name: row.Department_Name,
          Specializations: [],
        });
      }

      if (row.Specialization_ID !== null) {
        doctorsMap.get(row.Doctor_ID).Specializations.push({
          Specialization_ID: row.Specialization_ID,
          Specialization_Name: row.Specialization_Name,
        });
      }
    }

    const doctors = Array.from(doctorsMap.values());

    return NextResponse.json({
      status: "success",
      count: doctors.length,
      doctors,
    });

  } catch (error) {
    console.error("Doctors API error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to retrieve doctor information.",
      },
      { status: 500 }
    );
  }
}
