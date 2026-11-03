
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import pool from "../../../lib/db";

// Authentication secret
function getSecret() {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

// Standard error response
function errorResponse(message, status = 400) {
  return NextResponse.json(
    { status: "error", message },
    { status }
  );
}

// GET /api/auth?action=me
// Verify currently logged-in patient
export async function GET(request) {
  const action = new URL(request.url).searchParams.get("action");

  if (action !== "me") {
    return errorResponse("Invalid authentication action.", 400);
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("patient_token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, getSecret());

    if (!payload.patientId || payload.role !== "patient") {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const [patients] = await pool.execute(
        `SELECT Patient_ID, First_Name, Last_Name, Email
        FROM PATIENT
        WHERE Patient_ID = ?`,
        [payload.patientId]
       );

    if (patients.length === 0) {
     return NextResponse.json(
        { authenticated: false },
        { status: 401 }
    );
    }

    return NextResponse.json({
    authenticated: true,
    patient: {
        Patient_ID: patients[0].Patient_ID,
        First_Name: patients[0].First_Name,
        Last_Name: patients[0].Last_Name,
        Email: patients[0].Email,
    },
   });

  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

// POST /api/auth
// Handles registration, login and logout
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // =====================================
    // REGISTER
    // =====================================
    if (action === "register") {
      const {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        phone,
        email,
        password,
        address,
      } = body;

      if (
        !firstName ||
        !lastName ||
        !dateOfBirth ||
        !gender ||
        !phone ||
        !email ||
        !password
      ) {
        return errorResponse(
          "Please fill in all required fields."
        );
      }

      if (
        typeof firstName !== "string" ||
        typeof lastName !== "string" ||
        typeof phone !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        (address != null && typeof address !== "string")
      ) {
        return errorResponse("Invalid input format.");
      }

      if (
        firstName.trim().length > 60 ||
        lastName.trim().length > 60 ||
        phone.trim().length > 20 ||
        email.trim().length > 120 ||
        (address && address.length > 255)
      ) {
        return errorResponse(
          "One or more fields exceed the allowed length."
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        return errorResponse("Please enter a valid email address.");
      }

      if (password.length < 8 || password.length > 72) {
        return errorResponse(
          "Password must contain 8 to 72 characters."
        );
      }

      const allowedGenders = [
        "Female",
        "Male",
        "Other",
        "Prefer not to say",
      ];

      if (!allowedGenders.includes(gender)) {
        return errorResponse("Invalid gender selection.");
      }

      if (
        typeof dateOfBirth !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ) {
        return errorResponse("Invalid date of birth.");
      }

      const birthDate = new Date(
        `${dateOfBirth}T00:00:00.000Z`
      );

      if (
        Number.isNaN(birthDate.getTime()) ||
        birthDate.toISOString().slice(0, 10) !== dateOfBirth ||
        dateOfBirth >= new Date().toISOString().slice(0, 10)
      ) {
        return errorResponse(
          "Date of birth must be a valid date in the past."
        );
      }

      // Hash password before storing
      const passwordHash = await bcrypt.hash(password, 12);

      const [result] = await pool.execute(
        `INSERT INTO PATIENT
        (
          First_Name,
          Last_Name,
          Date_of_Birth,
          Gender,
          Phone,
          Email,
          Password_Hash,
          Address
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          firstName.trim(),
          lastName.trim(),
          dateOfBirth,
          gender,
          phone.trim(),
          normalizedEmail,
          passwordHash,
          address?.trim() || null,
        ]
      );

      return NextResponse.json(
        {
          status: "success",
          message: "Patient registered successfully.",
          patient: {
            Patient_ID: result.insertId,
            First_Name: firstName.trim(),
            Last_Name: lastName.trim(),
            Email: normalizedEmail,
          },
        },
        { status: 201 }
      );
    }

    // =====================================
    // LOGIN
    // =====================================
    if (action === "login") {
      const { email, password } = body;

      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
      ) {
        return errorResponse(
          "Email and password are required."
        );
      }

      const [rows] = await pool.execute(
        `SELECT
          Patient_ID,
          First_Name,
          Last_Name,
          Email,
          Password_Hash
         FROM PATIENT
         WHERE Email = ?`,
        [email.trim().toLowerCase()]
      );

      if (rows.length === 0) {
        return errorResponse(
          "Invalid email or password.",
          401
        );
      }

      const patient = rows[0];

      const passwordMatches = await bcrypt.compare(
        password,
        patient.Password_Hash
      );

      if (!passwordMatches) {
        return errorResponse(
          "Invalid email or password.",
          401
        );
      }

      // Generate JWT
      const token = await new SignJWT({
        patientId: patient.Patient_ID,
        role: "patient",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(getSecret());

      const response = NextResponse.json({
        status: "success",
        message: "Login successful.",
        patient: {
          Patient_ID: patient.Patient_ID,
          First_Name: patient.First_Name,
          Last_Name: patient.Last_Name,
          Email: patient.Email,
        },
      });

      // Store JWT in HTTP-only cookie
      response.cookies.set("patient_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2,
      });

      return response;
    }

    // =====================================
    // LOGOUT
    // =====================================
    if (action === "logout") {
      const response = NextResponse.json({
        status: "success",
        message: "Logged out successfully.",
      });

      response.cookies.set("patient_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    return errorResponse("Unknown authentication action.");

  } catch (error) {
    console.error("Authentication API error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(
        "This email address or phone number is already registered.",
        409
      );
    }

    return errorResponse(
      "Authentication operation failed.",
      500
    );
  }
}
