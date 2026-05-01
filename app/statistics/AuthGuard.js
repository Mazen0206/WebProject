"use client";
import { useEffect } from "react";

export default function AuthGuard() {
    useEffect(() => {
        const id = localStorage.getItem("zento-currentUserId");
        if (!id) {
            window.location.href = "/pages/auth/login.html";
            return;
        }
        fetch(`/api/users/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("invalid session");
            })
            .catch(() => {
                localStorage.removeItem("zento-currentUserId");
                window.location.href = "/pages/auth/login.html";
            });
    }, []);
    return null;
}
