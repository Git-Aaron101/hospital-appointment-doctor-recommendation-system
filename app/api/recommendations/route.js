
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import pool from "../../../lib/db";
import clientPromise from "../../../lib/mongodb";

const DATABASE_NAME = "hospital_recommendations";
const COLLECTION_NAME = "doctor_preferences";

async function getAuthenticatedPatient() {
  try {
    if (!process.env.AUTH_SECRET) {
      throw new Error("AUTH_SECRET is not configured");
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("patient_token")?.value;

    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET
    );

    const { payload } = await jwtVerify(token, secret);

    if (!payload.patientId || payload.role !== "patient") {
      return null;
    }

    const [patients] = await pool.execute(
      "SELECT Patient_ID FROM PATIENT WHERE Patient_ID = ?",
      [payload.patientId]
    );

    if (patients.length === 0) return null;

    return Number(patients[0].Patient_ID);
  } catch {
    return null;
  }
}

async function getPreferencesCollection() {
  const client = await clientPromise;
  const db = client.db(DATABASE_NAME);
  const collection = db.collection(COLLECTION_NAME);

  await collection.createIndex(
    { patient_id: 1 },
    { unique: true }
  );

  return collection;
}

// GET /api/recommendations
// Retrieve the logged-in patient's preferences.
export async function GET() {
  try {
    const patientId = await getAuthenticatedPatient();

    if (!patientId) {
      return NextResponse.json(
        { status: "error", message: "Please log in first." },
        { status: 401 }
      );
    }

    const collection = await getPreferencesCollection();

    const preferences = await collection.findOne(
      { patient_id: patientId },
      { projection: { _id: 0 } }
    );

    return NextResponse.json({
      status: "success",
      preferences: preferences || null,
    });
  } catch (error) {
    console.error("Preference retrieval error:", error);

    return NextResponse.json(
      { status: "error", message: "Unable to retrieve preferences." },
      { status: 500 }
    );
  }
}

// POST /api/recommendations
// Save the logged-in patient's preferences.
export async function POST(request) {
  try {
    const patientId = await getAuthenticatedPatient();

    if (!patientId) {
      return NextResponse.json(
        { status: "error", message: "Please log in first." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      preferredSpecializationId,
      maxConsultationFee,
      minExperience,
    } = body;

    if (
      preferredSpecializationId !== null &&
      preferredSpecializationId !== undefined &&
      (!Number.isInteger(preferredSpecializationId) ||
        preferredSpecializationId <= 0)
    ) {
      return NextResponse.json(
        { status: "error", message: "Invalid specialization ID." },
        { status: 400 }
      );
    }

    if (
      maxConsultationFee !== null &&
      maxConsultationFee !== undefined &&
      (!Number.isFinite(maxConsultationFee) ||
        maxConsultationFee < 0)
    ) {
      return NextResponse.json(
        { status: "error", message: "Invalid consultation fee." },
        { status: 400 }
      );
    }

    if (
      minExperience !== null &&
      minExperience !== undefined &&
      (!Number.isInteger(minExperience) ||
        minExperience < 0 ||
        minExperience > 60)
    ) {
      return NextResponse.json(
        { status: "error", message: "Invalid experience value." },
        { status: 400 }
      );
    }

    const collection = await getPreferencesCollection();

    const now = new Date();

    const preferences = {
      preferred_specialization_id:
        preferredSpecializationId ?? null,
      max_consultation_fee:
        maxConsultationFee ?? null,
      min_experience: minExperience ?? null,
      updated_at: now,
    };

    await collection.updateOne(
      { patient_id: patientId },
      {
        $set: preferences,
        $setOnInsert: {
          patient_id: patientId,
          created_at: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      status: "success",
      message: "Recommendation preferences saved.",
      preferences: {
        patient_id: patientId,
        ...preferences,
      },
    });
  } catch (error) {
    console.error("Preference saving error:", error);

    return NextResponse.json(
      { status: "error", message: "Unable to save preferences." },
      { status: 500 }
    );
  }
}
