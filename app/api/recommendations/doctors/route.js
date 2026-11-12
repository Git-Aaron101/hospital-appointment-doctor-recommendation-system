
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import pool from "../../../../lib/db";
import clientPromise from "../../../../lib/mongodb";

const DATABASE_NAME = "hospital_recommendations";
const COLLECTION_NAME = "doctor_preferences";

async function getAuthenticatedPatient() {
  try {
    if (!process.env.AUTH_SECRET) return null;

    const cookieStore = await cookies();
    const token = cookieStore.get("patient_token")?.value;

    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.patientId || payload.role !== "patient") {
      return null;
    }

    const [patients] = await pool.execute(
      "SELECT Patient_ID FROM PATIENT WHERE Patient_ID = ?",
      [payload.patientId]
    );

    return patients.length ? Number(patients[0].Patient_ID) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // 1. Authenticate the patient
    const patientId = await getAuthenticatedPatient();

    if (!patientId) {
      return NextResponse.json(
        { status: "error", message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Retrieve preferences from MongoDB
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const preferences = await collection.findOne({
      patient_id: patientId,
    });

    if (!preferences) {
      return NextResponse.json({
        status: "success",
        message: "Please save your preferences first.",
        count: 0,
        recommendations: [],
      });
    }

    // 3. Retrieve active doctors and specializations from MySQL
    const [rows] = await pool.execute(`
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
      ORDER BY d.Doctor_ID, s.Specialization_Name
    `);

    // 4. Group specialization rows into individual doctors
    const doctorsMap = new Map();

    for (const row of rows) {
      if (!doctorsMap.has(row.Doctor_ID)) {
        doctorsMap.set(row.Doctor_ID, {
          Doctor_ID: row.Doctor_ID,
          First_Name: row.First_Name,
          Last_Name: row.Last_Name,
          Qualification: row.Qualification,
          Years_Experience: Number(row.Years_Experience),
          Consultation_Fee: Number(row.Consultation_Fee),
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

    // 5. Calculate recommendation scores
    const specializationId =
      preferences.preferred_specialization_id;

    const maxFee = preferences.max_consultation_fee;
    const minExperience = preferences.min_experience;

    const recommendations = Array.from(doctorsMap.values())
      .map((doctor) => {
        const specializationMatch =
          specializationId == null ||
          doctor.Specializations.some(
            (s) => s.Specialization_ID === specializationId
          );

        const feeMatch =
          maxFee == null ||
          doctor.Consultation_Fee <= Number(maxFee);

        const experienceMatch =
          minExperience == null ||
          doctor.Years_Experience >= Number(minExperience);

        // Doctors satisfying more preferences receive higher scores.
        let score = 0;

        if (specializationMatch) score += 50;
        if (feeMatch) score += 30;
        if (experienceMatch) score += 20;

        return {
          ...doctor,
          recommendationScore: score,
          matches: {
            specialization: specializationMatch,
            consultationFee: feeMatch,
            experience: experienceMatch,
          },
        };
      })
      .filter((doctor) => doctor.recommendationScore > 0)
      .sort(
        (a, b) =>
          b.recommendationScore - a.recommendationScore ||
          b.Years_Experience - a.Years_Experience
      );

    // 6. Return ranked recommendations
    return NextResponse.json({
      status: "success",
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Doctor recommendation error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to generate doctor recommendations.",
      },
      { status: 500 }
    );
  }
}
