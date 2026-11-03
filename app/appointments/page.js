
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAppointments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/appointments");
      const data = await response.json();

      if (response.status === 401) {
        setError("Please log in to view your appointments.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not load appointments.");
      }

      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(appointmentId) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          appointmentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Cancellation failed.");
      }

      alert(data.message || "Appointment cancelled.");
      await loadAppointments();
    } catch (err) {
      alert(err.message || "Unable to cancel appointment.");
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  if (loading) {
    return <main className="container"><p>Loading appointments...</p></main>;
  }

  if (error) {
    return (
      <main className="container">
        <h1>My Appointments</h1>
        <p>{error}</p>
        <Link href="/login">Go to Login</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="appointments-header">
        <h1>My Appointments</h1>
        <Link href="/">Back to Home</Link>
      </div>

      {appointments.length === 0 ? (
        <section className="feature-card">
          <h2>No appointments yet</h2>
          <p>You have not booked any appointments.</p>
          <Link href="/">Find a doctor and book an appointment</Link>
        </section>
      ) : (
        <section className="appointment-list">
          {appointments.map((appointment) => (
            <article
              className="appointment-card"
              key={appointment.Appointment_ID}
            >
              <h2>{appointment.Doctor_Name}</h2>

              <p><strong>Department:</strong> {appointment.Department_Name}</p>
              <p><strong>Date:</strong> {new Date(appointment.Available_Date).toLocaleDateString("en-IN")}</p>
              <p><strong>Time:</strong> {appointment.Start_Time} – {appointment.End_Time}</p>
              <p><strong>Status:</strong> {appointment.Status}</p>
              <p><strong>Reason:</strong> {appointment.Reason || "Not provided"}</p>

              {appointment.Status === "Booked" && (
                <button
                  className="cancel-button"
                  onClick={() =>
                    cancelAppointment(appointment.Appointment_ID)
                  }
                >
                  Cancel Appointment
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
