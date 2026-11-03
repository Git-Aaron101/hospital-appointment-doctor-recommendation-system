
"use client";

import { useEffect, useState } from "react";

export default function DepartmentsList() {
  const [departments, setDepartments] = useState([]);
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
      } finally {
        setLoading(false);
      }
    }

    fetchDepartments();
  }, []);

  if (loading) return <p>Loading departments...</p>;

  if (error) return <p>Error: {error}</p>;

  return (
    <section className="departments-section">
      <h2>Our Departments</h2>

      <div className="department-grid">
        {departments.map((department) => (
          <article
            className="department-card"
            key={department.Department_ID}
          >
            <h3>{department.Department_Name}</h3>
            <p>{department.Description || "No description available."}</p>
          </article>
        ))}
      </div>

      {departments.length === 0 && (
        <p>No departments are currently available.</p>
      )}
    </section>
  );
}
