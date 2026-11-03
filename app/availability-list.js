
"use client";

import { useEffect, useState } from "react";

export default function AvailabilityList() {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const response = await fetch("/api/doctors");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || result.message || "Unable to load doctors");
        }

        setDoctors(result.doctors || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingDoctors(false);
      }
    }

    fetchDoctors();
  }, []);

  async function fetchSlots(id) {
    if (!id) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setError("");

    try {
      const response = await fetch(
        `/api/doctors?doctorId=${id}&includeSlots=true`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Unable to load slots");
      }

      setSlots(result.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    setSelectedSlot("");
    setSuccess("");
    setReason("");

    if (!doctorId) {
      setSlots([]);
      return;
    }

    fetchSlots(doctorId);
  }, [doctorId]);

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

      const result = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Appointment booking failed.");
      }

      setSuccess("Appointment booked successfully!");
      setSelectedSlot("");
      setReason("");

      await fetchSlots(doctorId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <section className="availability-section">
      <h2>Book an Appointment</h2>

      <label htmlFor="doctor-select">
        Select a Doctor:
      </label>

      <select
        id="doctor-select"
        value={doctorId}
        onChange={(event) => {
          setDoctorId(event.target.value);
          setError("");
        }}
      >
        <option value="">Choose a doctor</option>

        {doctors.map((doctor) => (
          <option
            key={doctor.Doctor_ID}
            value={doctor.Doctor_ID}
          >
            Dr. {doctor.First_Name} {doctor.Last_Name}
            {" — "}
            {doctor.Department_Name}
          </option>
        ))}
      </select>

      {loadingDoctors && <p>Loading doctors...</p>}

      {error && <p className="error-message">{error}</p>}

      {success && <p className="success-message">{success}</p>}

      {doctorId && loadingSlots && (
        <p>Loading available slots...</p>
      )}

      {doctorId && !loadingSlots && (
        <>
          <h3>Available Slots</h3>

          {slots.length === 0 ? (
            <p>No available slots for this doctor.</p>
          ) : (
            <div className="slot-grid">
              {slots.map((slot) => (
                <article
                  className={`slot-card ${
                    selectedSlot === String(slot.Availability_ID)
                      ? "selected-slot"
                      : ""
                  }`}
                  key={slot.Availability_ID}
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

              <label htmlFor="appointment-reason">
                Reason for Visit (Optional)
              </label>

              <textarea
                id="appointment-reason"
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
        </>
      )}
    </section>
  );
}
