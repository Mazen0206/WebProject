export const metadata = {
    title: "Zento — Social Media Platform",
    description: "CMPS 350 Web Development Course Project — Phase 2",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
