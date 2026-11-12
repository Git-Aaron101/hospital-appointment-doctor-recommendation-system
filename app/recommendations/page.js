
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RecommendationsPage() {
  const [doctors, setDoctors] = useState([]);
  const [preferences, setPreferences] = useState({
    preferredSpecializationId: "",
    maxConsultationFee: "",
    minExperience: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    async function loadData() {
      try {
        const [doctorResponse, preferenceResponse] =
          await Promise.all([
            fetch("/api/doctors"),
            fetch("/api/recommendations"),
          ]);

        if (preferenceResponse.status === 401) {
          setMessage("Please log in to manage your preferences.");
          setMessageType("error");
          return;
        }

        if (!doctorResponse.ok || !preferenceResponse.ok) {
          throw new Error("Unable to load your preferences.");
        }

        const doctorData = await doctorResponse.json();
        const preferenceData = await preferenceResponse.json();

        setDoctors(doctorData.doctors || []);

        const saved = preferenceData.preferences;

        if (saved) {
          setPreferences({
            preferredSpecializationId:
              saved.preferred_specialization_id ?? "",
            maxConsultationFee:
              saved.max_consultation_fee ?? "",
            minExperience:
              saved.min_experience ?? "",
          });
        }
      } catch (error) {
        setMessage(error.message);
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const specializations = Array.from(
    new Map(
      doctors.flatMap((doctor) =>
        doctor.Specializations.map((specialization) => [
          specialization.Specialization_ID,
          specialization,
        ])
      )
    ).values()
  ).sort((a, b) =>
    a.Specialization_Name.localeCompare(b.Specialization_Name)
  );

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const payload = {
      preferredSpecializationId:
        preferences.preferredSpecializationId === ""
          ? null
          : Number(preferences.preferredSpecializationId),

      maxConsultationFee:
        preferences.maxConsultationFee === ""
          ? null
          : Number(preferences.maxConsultationFee),

      minExperience:
        preferences.minExperience === ""
          ? null
          : Number(preferences.minExperience),
    };

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save preferences.");
      }

      setMessage("Your preferences were saved successfully!");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container recommendations-page">
        <p>Loading your preferences...</p>
      </main>
    );
  }

  return (
    <main className="container recommendations-page">
      <nav className="home-nav">
        <div className="home-nav-brand">
          Hospital Appointment System
        </div>

        <div className="home-nav-links">
          <Link href="/">Home</Link>
          <Link href="/appointments">My Appointments</Link>
        </div>
      </nav>

      <section className="recommendations-card">
        <h1>Find Your Ideal Doctor</h1>

        <p className="recommendations-description">
          Tell us your preferences and we'll recommend doctors
          who best match your needs.
        </p>

        {message && (
          <p
            className={`recommendations-message ${
              messageType === "error"
                ? "recommendations-error"
                : ""
            }`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}

        <form
          className="recommendations-form"
          onSubmit={handleSubmit}
        >
          <div className="recommendation-form-group">
            <label htmlFor="specialization">
              Preferred Specialization
            </label>

            <select
              id="specialization"
              value={preferences.preferredSpecializationId}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  preferredSpecializationId: event.target.value,
                })
              }
            >
              <option value="">Any specialization</option>

              {specializations.map((specialization) => (
                <option
                  key={specialization.Specialization_ID}
                  value={specialization.Specialization_ID}
                >
                  {specialization.Specialization_Name}
                </option>
              ))}
            </select>
          </div>

          <div className="recommendation-form-group">
            <label htmlFor="fee">
              Maximum Consultation Fee (₹)
            </label>

            <input
              id="fee"
              type="number"
              min="0"
              step="0.01"
              placeholder="Example: 1000"
              value={preferences.maxConsultationFee}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  maxConsultationFee: event.target.value,
                })
              }
            />
          </div>

          <div className="recommendation-form-group">
            <label htmlFor="experience">
              Minimum Doctor Experience (years)
            </label>

            <input
              id="experience"
              type="number"
              min="0"
              max="60"
              step="1"
              placeholder="Example: 5"
              value={preferences.minExperience}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  minExperience: event.target.value,
                })
              }
            />
          </div>

          <button
            type="submit"
            className="recommendations-submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save My Preferences"}
          </button>
        </form>

        <Link
        href="/recommendations/results"
        className="recommendations-back-link"
        >
        View My Recommended Doctors →
        </Link>
        <div></div>
        <Link
          href="/"
          className="recommendations-back-link"
        >
          ← Back to Home
        </Link>
      </section>
    </main>
  );
}
