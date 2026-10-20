import { useState } from "react";

export default function CustomerService() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 9999,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: "65px",
            width: "280px",
            padding: "24px",
            boxSizing: "border-box",
            border: "1px solid #d4af37",
            borderRadius: "16px",
            background: "#151515",
            color: "#fff",
            boxShadow: "0 8px 30px #0006",
          }}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close customer service"
            style={{
              position: "absolute",
              top: "8px",
              right: "12px",
              border: 0,
              background: "transparent",
              color: "#fff",
              fontSize: "25px",
              cursor: "pointer",
            }}
          >
            ×
          </button>

          <div style={{ fontSize: "30px", color: "#d4af37" }}>
            ✉
          </div>

          <h3 style={{ color: "#f5d76e" }}>
            Customer Service
          </h3>

          <p style={{ color: "#ccc", lineHeight: 1.6 }}>
            Need help? Contact our support team on Telegram.
          </p>

          <a
            href="https://t.me/BlackGold_Support"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              marginTop: "18px",
              padding: "12px",
              borderRadius: "8px",
              background: "#d4af37",
              color: "#111",
              textAlign: "center",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Open Telegram Support ↗
          </a>

          <div
            style={{
              marginTop: "12px",
              color: "#bbb",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            @BlackGold_Support
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 20px",
          border: "1px solid #d4af37",
          borderRadius: "30px",
          background: "#111",
          color: "#f5d76e",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 18px #0005",
        }}
      >
        ✉ Customer Service
      </button>
    </div>
  );
}