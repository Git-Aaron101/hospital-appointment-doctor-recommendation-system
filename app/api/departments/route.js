
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET() {
  try {
    const [departments] = await pool.query(`
      SELECT
        Department_ID,
        Department_Name,
        Description
      FROM DEPARTMENT
      ORDER BY Department_Name ASC
    `);

    return NextResponse.json({
      status: "success",
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Departments API error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to retrieve departments",
      },
      { status: 500 }
    );
  }
}
