
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function DoctorDashboardPage() {
  const router = useRouter();

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [addingAvailability, setAddingAvailability] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState(null);

  const [appointmentView, setAppointmentView] = useState("upcoming");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [duration, setDuration] = useState("30");

  async function loadDashboard() {
    try {
      const authResponse = await fetch("/api/doctor-auth?action=me");

      if (authResponse.status === 401) {
        router.replace("/doctor-login");
        return;
      }

      const authData = await authResponse.json();

      if (!authResponse.ok || !authData.authenticated) {
        router.replace("/doctor-login");
        return;
      }

      setDoctor(authData.doctor);

      const [appointmentResponse, slotResponse] = await Promise.all([
        fetch("/api/doctor-appointments"),
        fetch("/api/doctor-availability"),
      ]);

      if (
        appointmentResponse.status === 401 ||
        slotResponse.status === 401
      ) {
        router.replace("/doctor-login");
        return;
      }

      const appointmentData = await appointmentResponse.json();
      const slotData = await slotResponse.json();

      if (!appointmentResponse.ok) {
        throw new Error(
          appointmentData.error || "Could not load appointments."
        );
      }

      if (!slotResponse.ok) {
        throw new Error(
          slotData.error || "Could not load availability."
        );
      }

      setAppointments(appointmentData.appointments || []);
      setSlots(slotData.slots || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function updateAppointment(appointmentId, status) {
    const actionText =
      status === "Completed"
        ? "mark this appointment as completed"
        : "cancel this appointment";

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    setUpdatingId(appointmentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/doctor-appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appointmentId, status }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/doctor-login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Status update failed.");
      }

      setMessage(data.message);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddAvailability(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!date || !startTime || !endTime) {
      setError("Please fill in the date, start time and end time.");
      return;
    }

    setAddingAvailability(true);

    try {
      const response = await fetch("/api/doctor-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          duration: Number(duration),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/doctor-login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not add availability.");
      }

      setMessage(data.message);
      setDate("");
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingAvailability(false);
    }
  }

  async function handleDeleteSlot(availabilityId) {
    const confirmed = window.confirm(
      `Are you sure you want to delete Slot #${availabilityId}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingSlotId(availabilityId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/doctor-availability", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ availabilityId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/doctor-login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not delete this slot.");
      }

      setMessage(data.message);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingSlotId(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/doctor-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "logout" }),
      });

      router.replace("/doctor-login");
      router.refresh();
    } catch {
      setError("Unable to log out. Please try again.");
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  }

  function formatTime(timeValue) {
    if (!timeValue) return "";

    const [hours, minutes] = String(timeValue).split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const totalAppointments = appointments.length;

  const bookedCount = appointments.filter(
    (a) => a.Status === "Booked"
  ).length;

  const completedCount = appointments.filter(
    (a) => a.Status === "Completed"
  ).length;

  const cancelledCount = appointments.filter(
    (a) => a.Status === "Cancelled"
  ).length;

  const visibleAppointments = appointments.filter((appointment) =>
    appointmentView === "upcoming"
      ? appointment.Status === "Booked"
      : ["Completed", "Cancelled", "No-show"].includes(appointment.Status)
  );

  // Only genuinely available slots appear in this section.
  // Booked and completed appointment slots are hidden.
  const availableSlots = slots.filter(
    (slot) => slot.Slot_Status === "Available"
  );

  if (loading) {
    return (
      <main className="container">
        <p>Loading your doctor dashboard...</p>
      </main>
    );
  }

  return (
    <main className="container doctor-dashboard">
      <nav className="home-nav">
        <div className="home-nav-brand">
          Hospital Appointment System
        </div>

        <div className="home-nav-links">
          <Link href="/">Home</Link>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <section className="doctor-dashboard-header">
        <h1>
          Welcome, Dr. {doctor?.First_Name} {doctor?.Last_Name}
        </h1>

        <p>Manage your appointments and patient visits.</p>

        <p>
          <strong>Email:</strong> {doctor?.Email}
        </p>
      </section>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {/* Appointment statistics */}
      <section className="doctor-statistics">
        <article className="doctor-stat-card">
          <h3>Total Appointments</h3>
          <p>{totalAppointments}</p>
        </article>

        <article className="doctor-stat-card">
          <h3>Booked</h3>
          <p>{bookedCount}</p>
        </article>

        <article className="doctor-stat-card">
          <h3>Completed</h3>
          <p>{completedCount}</p>
        </article>

        <article className="doctor-stat-card">
          <h3>Cancelled</h3>
          <p>{cancelledCount}</p>
        </article>
      </section>

      {/* Appointment management */}
      <section className="doctor-appointments-section">
        <h2>My Appointments</h2>

        <p>View and manage appointments assigned to you.</p>

        <div className="doctor-view-tabs">
          <button
            type="button"
            className={appointmentView === "upcoming" ? "active" : ""}
            onClick={() => setAppointmentView("upcoming")}
          >
            Booked Appointments ({bookedCount})
          </button>

          <button
            type="button"
            className={appointmentView === "history" ? "active" : ""}
            onClick={() => setAppointmentView("history")}
          >
            Appointment History ({completedCount + cancelledCount})
          </button>
        </div>

        {visibleAppointments.length === 0 ? (
          <article className="feature-card">
            <h3>
              {appointmentView === "upcoming"
                ? "No upcoming appointments"
                : "No appointment history"}
            </h3>

            <p>
              {appointmentView === "upcoming"
                ? "You currently have no booked appointments."
                : "Completed and cancelled appointments will appear here."}
            </p>
          </article>
        ) : (
          <div className="doctor-appointment-grid">
            {visibleAppointments.map((appointment) => (
              <article
                className="doctor-appointment-card"
                key={appointment.Appointment_ID}
              >
                <div className="doctor-appointment-heading">
                  <h3>Appointment #{appointment.Appointment_ID}</h3>

                  <span
                    className={`doctor-status doctor-status-${appointment.Status.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {appointment.Status}
                  </span>
                </div>

                <h4>
                  {appointment.Patient_First_Name}{" "}
                  {appointment.Patient_Last_Name}
                </h4>

                <p>
                  <strong>Patient ID:</strong> {appointment.Patient_ID}
                </p>

                <p>
                  <strong>Email:</strong> {appointment.Patient_Email}
                </p>

                <p>
                  <strong>Phone:</strong> {appointment.Patient_Phone}
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(appointment.Available_Date)}
                </p>

                <p>
                  <strong>Time:</strong>{" "}
                  {formatTime(appointment.Start_Time)} –{" "}
                  {formatTime(appointment.End_Time)}
                </p>

                <p>
                  <strong>Reason for Visit:</strong>{" "}
                  {appointment.Reason || "Not provided"}
                </p>

                {appointment.Status === "Booked" && (
                  <div className="doctor-appointment-actions">
                    <button
                      type="button"
                      onClick={() =>
                        updateAppointment(
                          appointment.Appointment_ID,
                          "Completed"
                        )
                      }
                      disabled={updatingId !== null}
                    >
                      {updatingId === appointment.Appointment_ID
                        ? "Updating..."
                        : "Mark Completed"}
                    </button>

                    <button
                      type="button"
                      className="doctor-cancel-button"
                      onClick={() =>
                        updateAppointment(
                          appointment.Appointment_ID,
                          "Cancelled"
                        )
                      }
                      disabled={updatingId !== null}
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Availability management */}
      <section className="doctor-availability-section">
        <h2>Manage My Availability</h2>

        <p>
          Add your available dates and working hours so patients can book
          appointments with you.
        </p>

        <form
          className="doctor-availability-form"
          onSubmit={handleAddAvailability}
        >
          <div className="doctor-availability-field">
            <label htmlFor="availability-date">Available Date</label>
            <input
              id="availability-date"
              type="date"
              min={getLocalDate()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>

          <div className="doctor-availability-time-grid">
            <div className="doctor-availability-field">
              <label htmlFor="availability-start">Start Time</label>
              <input
                id="availability-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </div>

            <div className="doctor-availability-field">
              <label htmlFor="availability-end">End Time</label>
              <input
                id="availability-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="doctor-availability-field">
            <label htmlFor="slot-duration">
              Appointment Duration
            </label>

            <select
              id="slot-duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          <p className="doctor-availability-hint">
            Your selected working hours will automatically be divided into
            individual appointment slots.
          </p>

          <button
            type="submit"
            className="doctor-add-availability-button"
            disabled={addingAvailability}
          >
            {addingAvailability ? "Adding Slots..." : "Add Availability"}
          </button>
        </form>
      </section>

      {/* Existing availability */}
      <section className="doctor-availability-list-section">
        <div className="doctor-availability-list-heading">
          <div>
            <h2>My Available Slots</h2>
            <p>
              Only unused slots that patients can book are shown here.
            </p>
          </div>

          <div className="doctor-slot-summary">
            <span>{availableSlots.length} Available</span>
          </div>
        </div>

        {availableSlots.length === 0 ? (
          <article className="feature-card">
            <h3>No available slots</h3>
            <p>
              You currently have no unused appointment slots.
              Add new availability using the form above.
            </p>
          </article>
        ) : (
          <div className="doctor-slot-grid">
            {availableSlots.map((slot) => (
              <article
                className="doctor-slot-card"
                key={slot.Availability_ID}
              >
                <div className="doctor-appointment-heading">
                  <h3>Slot #{slot.Availability_ID}</h3>

                  <span className="doctor-status doctor-status-available">
                    Available
                  </span>
                </div>

                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(slot.Available_Date)}
                </p>

                <p>
                  <strong>Time:</strong>{" "}
                  {formatTime(slot.Start_Time)} –{" "}
                  {formatTime(slot.End_Time)}
                </p>

                <button
                  type="button"
                  className="doctor-delete-slot-button"
                  onClick={() => handleDeleteSlot(slot.Availability_ID)}
                  disabled={deletingSlotId !== null}
                >
                  {deletingSlotId === slot.Availability_ID
                    ? "Deleting..."
                    : "Delete Slot"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
