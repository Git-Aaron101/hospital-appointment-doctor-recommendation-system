
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import DepartmentsList from "./departments-list";
import DoctorsList from "./doctors-list";
import AvailabilityList from "./availability-list";

export default function Home() {
  const [patient, setPatient] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  async function checkLogin() {
    try {
      const response = await fetch("/api/auth?action=me");
      const data = await response.json();

      if (response.ok && data.authenticated) {
        setPatient(data.patient);
      } else {
        setPatient(null);
      }
    } catch {
      setPatient(null);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "logout" }),
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      setPatient(null);
      window.location.reload();
    } catch (error) {
      alert(error.message);
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    checkLogin();
  }, []);

  return (
    <main className="container">

      <nav className="home-nav">
        <div className="home-nav-brand">
          Hospital Appointment System
        </div>

        <div className="home-nav-links">
          {checkingAuth ? (
            <span>Checking login...</span>
          ) : patient ? (
            <>
              <span className="welcome-user">
                Hello, {patient.First_Name}!
              </span>

              <Link href="/appointments">
                My Appointments
              </Link>

              <Link href="/recommendations">
                Find Recommended Doctors
              </Link>

              <button
                type="button"
                className="nav-logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Patient Login</Link>

              <Link href="/doctor-login">
                Doctor Login
              </Link>

              <Link href="/register" className="nav-register">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="role-hero">
        <h1>Welcome to Hospital Appointment System</h1>

        <p>
          Your healthcare journey starts here.
          Book appointments, discover doctors, and manage
          your healthcare experience in one place.
        </p>

        {!checkingAuth && !patient && (
          <div className="role-selection">

            <div className="role-card">
              <div className="role-icon">👤</div>

              <h2>Patient Portal</h2>

              <p>
                Find doctors, explore specializations,
                book appointments, and get personalized
                doctor recommendations.
              </p>

              <Link
                href="/login"
                className="role-button patient-button"
              >
                Patient Login
              </Link>

              <p className="role-register">
                New patient?{" "}
                <Link href="/register">Create an account</Link>
              </p>
            </div>

            <div className="role-card">
              <div className="role-icon">🩺</div>

              <h2>Doctor Portal</h2>

              <p>
                Manage your appointments, view patient
                details, update appointment status,
                and manage your availability.
              </p>

              <Link
                href="/doctor-login"
                className="role-button doctor-button"
              >
                Doctor Login
              </Link>
            </div>

          </div>
        )}

        {!checkingAuth && patient && (
          <div className="patient-welcome">
            <h2>Welcome back, {patient.First_Name}!</h2>
            <p>What would you like to do today?</p>

            <div className="patient-actions">
              <Link href="/appointments" className="role-button patient-button">
                My Appointments
              </Link>

              <Link href="/recommendations" className="role-button doctor-button">
                Find Recommended Doctors
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h2>Find Doctors</h2>
          <p>Browse doctors and their specializations.</p>
        </div>

        <div className="feature-card">
          <h2>Book Appointments</h2>
          <p>View available slots and book appointments.</p>
        </div>

        <div className="feature-card">
          <h2>Doctor Recommendations</h2>
          <p>
            Discover doctors based on your preferences
            and healthcare requirements.
          </p>
        </div>
      </section>

      <DepartmentsList />
      <DoctorsList />
      <AvailabilityList />

    </main>
  );
}
