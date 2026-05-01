"use client";
import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "CMPS350";
const SESSION_KEY = "zento-admin-unlocked";

export default function AuthGuard() {
    const [locked, setLocked] = useState(true);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem(SESSION_KEY) === "1") {
            setLocked(false);
        }
    }, []);

    function handleSubmit(e) {
        e.preventDefault();
        if (input === ADMIN_PASSWORD) {
            sessionStorage.setItem(SESSION_KEY, "1");
            setLocked(false);
        } else {
            setError("Incorrect password. Access denied.");
            setShake(true);
            setInput("");
            setTimeout(() => setShake(false), 600);
        }
    }

    if (!locked) return null;

    return (
        <div style={styles.overlay}>
            <div style={{ ...styles.card, animation: shake ? "authShake 0.5s" : "none" }}>

                <div style={styles.iconWrap}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b4bff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>

                <h2 style={styles.title}>Admin Access Only</h2>

                <p style={styles.description}>
                    The <strong>Statistics</strong> page contains platform-wide data and is
                    restricted to administrators only.
                </p>

                <div style={styles.noticeBox}>
                    <span style={styles.noticeIcon}>⚠️</span>
                    <p style={styles.noticeText}>
                        This link appears in the navigation <strong>for testing and demonstration
                        purposes only</strong>. In a production environment it would not be
                        visible to regular users.
                    </p>
                </div>

                <div style={styles.hintBox}>
                    <span style={styles.hintIcon}>ℹ️</span>
                    <p style={styles.hintText}>
                        You have been given the password{" "}
                        <code style={styles.code}>CMPS350</code>{" "}
                        for demonstration purposes only.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label} htmlFor="admin-pw">Admin Password</label>
                    <input
                        id="admin-pw"
                        type="password"
                        value={input}
                        onChange={e => { setInput(e.target.value); setError(""); }}
                        placeholder="Enter admin password"
                        style={{
                            ...styles.input,
                            borderColor: error ? "#e11d48" : "#e6e8f1",
                            outline: error ? "2px solid #fce7f3" : "none",
                        }}
                        autoFocus
                    />
                    {error && (
                        <p style={styles.error}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{marginRight:4,verticalAlign:"middle"}}>
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            {error}
                        </p>
                    )}
                    <button type="submit" style={styles.button}>
                        Unlock Statistics
                    </button>
                </form>
            </div>

            <style>{`
                @keyframes authShake {
                    0%,100% { transform: translateX(0); }
                    20%     { transform: translateX(-10px); }
                    40%     { transform: translateX(10px); }
                    60%     { transform: translateX(-6px); }
                    80%     { transform: translateX(6px); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(245, 246, 251, 0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
    },
    card: {
        background: "#ffffff",
        border: "1px solid #e6e8f1",
        borderRadius: "16px",
        padding: "2.5rem 2rem",
        maxWidth: "460px",
        width: "100%",
        boxShadow: "0 20px 60px rgba(59, 75, 255, 0.1), 0 4px 16px rgba(26, 31, 54, 0.08)",
        textAlign: "center",
        color: "#1a1f36",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
    },
    iconWrap: {
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "#eef0ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 1.1rem",
    },
    title: {
        fontSize: "1.45rem",
        fontWeight: 700,
        margin: "0 0 0.75rem",
        color: "#1a1f36",
        letterSpacing: "-0.02em",
    },
    description: {
        fontSize: "0.95rem",
        color: "#6b7190",
        marginBottom: "1rem",
        lineHeight: 1.6,
    },
    noticeBox: {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.6rem",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: "10px",
        padding: "0.7rem 0.9rem",
        marginBottom: "0.75rem",
        textAlign: "left",
    },
    noticeIcon: {
        fontSize: "1rem",
        flexShrink: 0,
        lineHeight: 1.6,
    },
    noticeText: {
        margin: 0,
        fontSize: "0.85rem",
        color: "#92400e",
        lineHeight: 1.55,
    },
    hintBox: {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.6rem",
        background: "#eef0ff",
        border: "1px solid #c7d2fe",
        borderRadius: "10px",
        padding: "0.7rem 0.9rem",
        marginBottom: "1.6rem",
        textAlign: "left",
    },
    hintIcon: {
        fontSize: "1rem",
        flexShrink: 0,
        lineHeight: 1.6,
    },
    hintText: {
        margin: 0,
        fontSize: "0.85rem",
        color: "#3730a3",
        lineHeight: 1.55,
    },
    code: {
        background: "#c7d2fe",
        color: "#1e1b4b",
        padding: "0.05rem 0.45rem",
        borderRadius: "5px",
        fontFamily: "monospace",
        fontWeight: 700,
        letterSpacing: "0.05em",
        fontSize: "0.9em",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "0.55rem",
        textAlign: "left",
    },
    label: {
        fontSize: "0.75rem",
        color: "#6b7190",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
    },
    input: {
        width: "100%",
        padding: "0.7rem 1rem",
        borderRadius: "8px",
        border: "1.5px solid #e6e8f1",
        background: "#f5f6fb",
        color: "#1a1f36",
        fontSize: "0.95rem",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
    },
    error: {
        color: "#e11d48",
        fontSize: "0.83rem",
        margin: "0",
        display: "flex",
        alignItems: "center",
    },
    button: {
        marginTop: "0.35rem",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "none",
        background: "#3b4bff",
        color: "#ffffff",
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.01em",
        transition: "background 0.2s",
    },
};
