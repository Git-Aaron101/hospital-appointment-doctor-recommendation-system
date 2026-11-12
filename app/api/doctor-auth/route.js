
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import pool from "../../../lib/db";

function getSecret() {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/doctor-auth?action=me
export async function GET(request) {
  try {
    const action = new URL(request.url).searchParams.get("action");

    if (action !== "me") {
      return errorResponse("Invalid authentication action.", 400);
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("doctor_token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getSecret());

    if (payload.role !== "doctor" || !payload.doctorId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const [rows] = await pool.execute(
      `SELECT Doctor_ID, First_Name, Last_Name, Email
       FROM DOCTOR
       WHERE Doctor_ID = ? AND Is_Active = 1`,
      [payload.doctorId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      doctor: rows[0],
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// POST /api/doctor-auth
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "login") {
      const { email, password } = body;

      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
      ) {
        return errorResponse("Email and password are required.");
      }

      const [rows] = await pool.execute(
        `SELECT Doctor_ID, First_Name, Last_Name, Email, Password_Hash
         FROM DOCTOR
         WHERE Email = ? AND Is_Active = 1`,
        [email.trim().toLowerCase()]
      );

      if (rows.length === 0) {
        return errorResponse("Invalid email or password.", 401);
      }

      const doctor = rows[0];

      const passwordMatches = await bcrypt.compare(
        password,
        doctor.Password_Hash
      );

      if (!passwordMatches) {
        return errorResponse("Invalid email or password.", 401);
      }

      const token = await new SignJWT({
        doctorId: doctor.Doctor_ID,
        role: "doctor",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(getSecret());

      const response = NextResponse.json({
        status: "success",
        message: "Doctor login successful.",
        doctor: {
          Doctor_ID: doctor.Doctor_ID,
          First_Name: doctor.First_Name,
          Last_Name: doctor.Last_Name,
          Email: doctor.Email,
        },
      });

      response.cookies.set("doctor_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2,
      });

      return response;
    }

    if (action === "logout") {
      const response = NextResponse.json({
        status: "success",
        message: "Doctor logged out successfully.",
      });

      response.cookies.set("doctor_token", "", {
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
    console.error("Doctor authentication error:", error);
    return errorResponse("Doctor authentication operation failed.", 500);
  }
}
