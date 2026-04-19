import { redirect } from "next/navigation";

// The "/" route redirects visitors straight into the static Phase 1 UI.
// Clients that are not logged in will then be bounced to /auth/login by
// the auth script.
export default function HomePage() {
    redirect("/pages/auth/login.html");
}
