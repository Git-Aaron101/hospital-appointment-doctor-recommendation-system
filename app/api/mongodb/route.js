
import clientPromise from "../../../lib/mongodb.js";

export async function GET() {
  try {
    const client = await clientPromise;

    await client.db("admin").command({ ping: 1 });

    return Response.json({
      success: true,
      message: "MongoDB Atlas connected successfully!",
      database: "hospital_recommendations",
    });
  } catch (error) {
    console.error("MongoDB health check failed:", error.message);

    return Response.json(
      {
        success: false,
        message: "MongoDB connection failed",
      },
      { status: 500 }
    );
  }
}
