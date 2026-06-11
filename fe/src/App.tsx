export default function App() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>🎉 Dự Án Upload Ảnh</h1>
      <p style={{ fontSize: "18px", color: "#666" }}>
        Backend API: <strong>POST /api/upload</strong>
      </p>
      <p
        style={{
          fontSize: "14px",
          color: "#999",
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        Dự án này là một ứng dụng upload ảnh đơn giản.
        <br />
        Backend chạy trên port 5000, chỉ giữ lại chức năng upload.
      </p>
    </div>
  );
}
