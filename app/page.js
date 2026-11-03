
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
              <Link href="/login">Login</Link>

              <Link href="/register" className="nav-register">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <h1>Hospital Appointment System</h1>

      <p>
        Book hospital appointments and find doctors based on their
        departments and specializations.
      </p>

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
          <h2>My Appointments</h2>
          <p>View and manage your appointment history.</p>
        </div>
      </section>

      <DepartmentsList />
      <DoctorsList />
      <AvailabilityList />
    </main>
  );
}
