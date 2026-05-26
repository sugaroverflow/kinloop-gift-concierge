import "./globals.css";

export const metadata = {
  title: "Kinloop",
  description: "Turn gift signals into approval-ready birthday picks."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
