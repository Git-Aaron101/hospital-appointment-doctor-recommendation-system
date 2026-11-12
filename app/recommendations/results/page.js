
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RecommendedDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch("/api/recommendations/doctors");

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load recommendations.");
        }

        setDoctors(data.recommendations || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  async function handleSelectDoctor(doctor) {
    setSelectedDoctor(doctor);
    setSlots([]);
    setSelectedSlot("");
    setReason("");
    setSuccess("");
    setError("");
    setLoadingSlots(true);

    try {
      const response = await fetch(
        `/api/doctors?doctorId=${doctor.Doctor_ID}&includeSlots=true`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load available slots.");
      }

      setSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBooking() {
    if (!selectedSlot) {
      setError("Please select an appointment slot.");
      return;
    }

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "book",
          availabilityId: Number(selectedSlot),
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Appointment booking failed.");
      }

      setSuccess("Appointment booked successfully!");
      setSelectedSlot("");
      setReason("");

      // Refresh available slots after booking.
      handleSelectDoctor(selectedDoctor);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <p>Finding doctors that match your preferences...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <nav className="home-nav">
        <div className="home-nav-brand">
          Hospital Appointment System
        </div>

        <div className="home-nav-links">
          <Link href="/">Home</Link>
          <Link href="/recommendations">My Preferences</Link>
          <Link href="/appointments">My Appointments</Link>
        </div>
      </nav>

      <section className="doctors-section">
        <h1>Recommended Doctors</h1>

        <p>
          Doctors ranked according to your saved preferences.
        </p>

        <Link
          href="/recommendations"
          className="recommendations-back-link"
        >
          Edit My Preferences
        </Link>

        {error && <p className="error-message">{error}</p>}

        {doctors.length === 0 ? (
          <article className="feature-card">
            <h2>No recommendations available</h2>
            <p>
              Save your preferences or try different criteria
              to find suitable doctors.
            </p>
            <Link href="/recommendations">
              Update Preferences
            </Link>
          </article>
        ) : (
          <div className="doctor-grid">
            {doctors.map((doctor) => (
              <article className="doctor-card" key={doctor.Doctor_ID}>
                <h3>
                  Dr. {doctor.First_Name} {doctor.Last_Name}
                </h3>

                <p>{doctor.Qualification}</p>

                <p>
                  <strong>Department:</strong>{" "}
                  {doctor.Department_Name}
                </p>

                <p>
                  <strong>Experience:</strong>{" "}
                  {doctor.Years_Experience} years
                </p>

                <p>
                  <strong>Consultation Fee:</strong>{" "}
                  ₹{doctor.Consultation_Fee}
                </p>

                <div className="specialization-list">
                  <strong>Specializations:</strong>
                  <ul>
                    {doctor.Specializations.map((specialization) => (
                      <li key={specialization.Specialization_ID}>
                        {specialization.Specialization_Name}
                      </li>
                    ))}
                  </ul>
                </div>

                <p>
                  <strong>Recommendation Score:</strong>{" "}
                  {doctor.recommendationScore}/100
                </p>

                <p>
                  {doctor.matches.specialization
                    ? "✓ Specialization match"
                    : "✗ Specialization mismatch"}
                  <br />
                  {doctor.matches.consultationFee
                    ? "✓ Within your budget"
                    : "✗ Above your budget"}
                  <br />
                  {doctor.matches.experience
                    ? "✓ Meets experience preference"
                    : "✗ Below experience preference"}
                </p>

                <button
                  type="button"
                  onClick={() => handleSelectDoctor(doctor)}
                >
                  View Available Slots
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedDoctor && (
        <section className="availability-section">
          <h2>
            Available Slots — Dr. {selectedDoctor.First_Name}{" "}
            {selectedDoctor.Last_Name}
          </h2>

          {loadingSlots && <p>Loading available slots...</p>}

          {!loadingSlots && slots.length === 0 && (
            <p>No available slots for this doctor.</p>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className="slot-grid">
              {slots.map((slot) => (
                <article
                  key={slot.Availability_ID}
                  className={`slot-card ${
                    selectedSlot === String(slot.Availability_ID)
                      ? "selected-slot"
                      : ""
                  }`}
                >
                  <p>
                    <strong>Date:</strong>{" "}
                    {String(slot.Available_Date).slice(0, 10)}
                  </p>

                  <p>
                    <strong>Time:</strong>{" "}
                    {String(slot.Start_Time).slice(0, 8)}
                    {" - "}
                    {String(slot.End_Time).slice(0, 8)}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSlot(String(slot.Availability_ID))
                    }
                  >
                    {selectedSlot === String(slot.Availability_ID)
                      ? "Selected"
                      : "Select Slot"}
                  </button>
                </article>
              ))}
            </div>
          )}

          {selectedSlot && (
            <div className="booking-form">
              <h3>Confirm Your Appointment</h3>

              <label htmlFor="recommendation-reason">
                Reason for Visit (Optional)
              </label>

              <textarea
                id="recommendation-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Briefly describe the reason for your visit"
              />

              <button
                type="button"
                onClick={handleBooking}
                disabled={booking}
              >
                {booking ? "Booking..." : "Book Appointment"}
              </button>
            </div>
          )}

          {success && (
            <p className="success-message">{success}</p>
          )}

          {error && <p className="error-message">{error}</p>}
        </section>
      )}
    </main>
  );
}
