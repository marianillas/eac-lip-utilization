export const metadata = {
  title: "EAC / LIP Utilization",
  description: "Core vs. overhead utilization dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
