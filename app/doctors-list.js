
"use client";

import { useEffect, useState } from "react";

export default function DoctorsList() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await fetch("/api/departments");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to load departments");
        }

        setDepartments(result.departments);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchDepartments();
  }, []);

  useEffect(() => {
    async function fetchDoctors() {
      setLoading(true);
      setError("");

      try {
        const url = departmentId
          ? `/api/doctors?departmentId=${departmentId}`
          : "/api/doctors";

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to load doctors");
        }

        setDoctors(result.doctors);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDoctors();
  }, [departmentId]);

  return (
    <section className="doctors-section">
      <h2>Find Your Doctor</h2>

      <div className="filter-container">
        <label htmlFor="department-filter">
          Filter by Department:
        </label>

        <select
          id="department-filter"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">All Departments</option>

          {departments.map((department) => (
            <option
              key={department.Department_ID}
              value={department.Department_ID}
            >
              {department.Department_Name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading doctors...</p>}

      {!loading && error && <p>Error: {error}</p>}

      {!loading && !error && doctors.length === 0 && (
        <p>No doctors found in this department.</p>
      )}

      {!loading && !error && (
        <div className="doctor-grid">
          {doctors.map((doctor) => (
            <article className="doctor-card" key={doctor.Doctor_ID}>
              <h3>
                Dr. {doctor.First_Name} {doctor.Last_Name}
              </h3>

              <p>{doctor.Qualification}</p>

              <p>
                <strong>Department:</strong> {doctor.Department_Name}
              </p>

              <p>
                <strong>Experience:</strong>{" "}
                {doctor.Years_Experience} years
              </p>

              <p>
                <strong>Consultation Fee:</strong> ₹
                {Number(doctor.Consultation_Fee).toFixed(2)}
              </p>

              <div className="specialization-list">
                <strong>Specializations:</strong>

                {doctor.Specializations.length > 0 ? (
                  <ul>
                    {doctor.Specializations.map((specialization) => (
                      <li key={specialization.Specialization_ID}>
                        {specialization.Specialization_Name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Not specified</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
