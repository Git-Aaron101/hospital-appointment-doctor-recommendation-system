import "./globals.css";

export const metadata = {
  title: "Hospital Appointment System",
  description: "Hospital appointment booking and doctor recommendation system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}