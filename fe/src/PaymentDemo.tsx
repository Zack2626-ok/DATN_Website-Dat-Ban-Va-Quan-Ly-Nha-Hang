import { useState } from "react";
import { Modal } from "./components/Modal";

export default function PaymentDemo() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Demo: Cashier Payment Modal</h1>
      <button onClick={() => setConfirmOpen(true)} style={{ padding: "10px 20px", cursor: "pointer" }}>
        Open Payment Modal
      </button>

      {confirmOpen && (
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Xác nhận Thanh toán"
          footer={
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmOpen(false)}>Hủy</button>
              <button onClick={() => { alert("Payment confirmed!"); setConfirmOpen(false); }}>Xác nhận</button>
            </div>
          }
        >
          <div style={{ marginBottom: "15px" }}>
            <p>
              Hóa đơn: <strong>HD-12345</strong>
            </p>
            <p>
              Tạm tính: <strong>1,000,000 vnđ</strong>
            </p>
            <p>
              Thuế (10%): <strong>100,000 vnđ</strong>
            </p>
            <p>
              Tip: <strong>50,000 vnđ</strong>
            </p>
            <p>
              Tổng: <strong>1,150,000 vnđ</strong>
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
