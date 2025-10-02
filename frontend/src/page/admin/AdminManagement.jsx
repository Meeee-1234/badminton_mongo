// src/pages/AdminManagement.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

//const API = process.env.REACT_APP_API_URL || "https://badminton-mongo.vercel.app";
const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // ===== Admin Guard (ฝั่ง client) =====
  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    const rawUser = localStorage.getItem("auth:user");

    if (!token || !rawUser) {
      setMessage("❌ Unauthorized: กรุณา login เป็น admin");
      setLoading(false);
      navigate("/login");
      return;
    }

    let user = null;
    try { user = JSON.parse(rawUser); } catch {}

    if (!user || user.role !== "admin") {
      setMessage("❌ Forbidden: เฉพาะผู้ดูแลระบบเท่านั้น");
      setLoading(false);
      navigate("/"); // หรือ /login
      return;
    }

    // ===== ยืนยันกับเซิร์ฟเวอร์อีกรอบ (แนะนำ) =====
    (async () => {
      try {
        // ใช้ /api/admin/ping หรือ /api/admin/users ก็ได้ (ต้อง require admin ฝั่ง server)
        const res = await fetch(`${API}/api/admin/ping`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          setMessage("❌ ไม่มีสิทธิ์เข้าถึง (server denied)");
          setLoading(false);
          navigate("/login");
          return;
        }
        // ผ่าน -> ค่อยไปโหลดข้อมูลจริง
        await fetchAllData(token);
      } catch (err) {
        console.error("Verify admin failed:", err);
        setMessage("❌ ตรวจสอบสิทธิ์ล้มเหลว");
        setLoading(false);
        navigate("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/login");
  };

  // ✅ Delete User
  const handleDeleteUser = async (id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) return;

    const token = localStorage.getItem("auth:token");
    try {
      const res = await fetch(`${API}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      console.log("📌 Raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Response is not JSON: " + text.substring(0, 100));
      }

      if (!res.ok) throw new Error(data.error || "ลบผู้ใช้ไม่สำเร็จ");

      setUsers((prev) => prev.filter((u) => u._id !== id));
      alert("✅ " + (data.message || "ลบสำเร็จ"));
    } catch (err) {
      console.error("❌ Delete user error:", err);
      alert("❌ " + err.message);
    }
  };

  // ===== โหลดข้อมูลทั้งหมด (users + bookings) =====
  const fetchAllData = async (token) => {
    try {
      const [userRes, bookingRes] = await Promise.all([
        fetch(`${API}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API}/api/admin/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (userRes.status === 401 || userRes.status === 403) {
        setMessage("❌ ไม่มีสิทธิ์เข้าถึงผู้ใช้");
        setLoading(false);
        navigate("/login");
        return;
      }
      if (bookingRes.status === 401 || bookingRes.status === 403) {
        setMessage("❌ ไม่มีสิทธิ์เข้าถึงการจอง");
        setLoading(false);
        navigate("/login");
        return;
      }

      if (!userRes.ok || !bookingRes.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");

      const [userData, bookingData] = await Promise.all([
        userRes.json(),
        bookingRes.json(),
      ]);

      const filteredUsers = (userData.users || []).filter((u) => u.role !== "admin");
      setUsers(filteredUsers);
      setBookings(bookingData.bookings || []);
      setLoading(false);
    } catch (err) {
      console.error("โหลดข้อมูลล้มเหลว:", err);
      setMessage("❌ โหลดข้อมูลไม่สำเร็จ");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          fontFamily: "Segoe UI, sans-serif",
          background: "#f9fafb",
          minHeight: "100vh",
        }}
      >
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Segoe UI, sans-serif",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      {/* Header + Logout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center" }}>
          📊 Admin Management
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Flash message */}
      {message && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      {/* Users Table */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>👤 Users</h2>
        <div
          style={{
            overflowX: "auto",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>#</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>ชื่อ</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Email</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Phone</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((u, index) => (
                  <tr key={u._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.phone || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}>
                    ไม่มีข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bookings Table */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>📝 Bookings</h2>
        <div
          style={{
            overflowX: "auto",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "User", "Date", "Court", "Hour", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 12,
                      background: "#10b981",
                      color: "#fff",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map((b, index) => (
                  <tr key={b._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.user?.name || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.date}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.court}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {`${b.hour}:00 - ${b.hour + 1}:00`}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {b.status === "booked" && "📌 จองแล้ว"}
                      {b.status === "arrived" && "✅ มาแล้ว"}
                      {b.status === "canceled" && "❌ ยกเลิก"}
                      {!b.status && "-"}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}>
                    ไม่มีข้อมูลการจอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
