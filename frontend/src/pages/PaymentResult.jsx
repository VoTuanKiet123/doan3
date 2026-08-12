import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader, RefreshCw } from "lucide-react";
import api from "../services/api";

/**
 * PaymentResult – Trang xử lý kết quả sau khi redirect từ VNPay về.
 * Chỉ hiển thị UI "đang xử lý", việc xác nhận thật được IPN xử lý ngầm.
 */
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | processing | success | failed
  const [message, setMessage] = useState("");
  const [polling, setPolling] = useState(false);

  const orderId = searchParams.get("orderId");
  const responseCode = searchParams.get("responseCode");
  const statusParam = searchParams.get("status");

  useEffect(() => {
    if (statusParam === "failed" || statusParam === "error") {
      setStatus("failed");
      setMessage(searchParams.get("message") || "Thanh toán thất bại");
      return;
    }

    if (statusParam === "processing" && orderId) {
      setStatus("processing");
      setMessage("Đang xác nhận thanh toán...");
      startPolling(orderId);
      return;
    }

    // Nếu không có orderId, hiển thị lỗi
    if (!orderId) {
      setStatus("failed");
      setMessage("Không tìm thấy thông tin giao dịch");
      return;
    }
  }, []);

  const startPolling = (orderId) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 30; // 30 lần x 2 giây = 60 giây

    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/vnpay/check-status/${orderId}`);
        if (res.data.status === "success") {
          clearInterval(poll);
          setStatus("success");
          setMessage("Thanh toán thành công!");
          setPolling(false);
        } else if (res.data.status === "failed") {
          clearInterval(poll);
          setStatus("failed");
          setMessage("Thanh toán thất bại hoặc đã hết hạn");
          setPolling(false);
        }
      } catch (err) {
        // Ignore polling errors
      }

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        setStatus("failed");
        setMessage(
          "Quá thời gian chờ xác nhận. Vui lòng kiểm tra lại trong mục Lịch sử đặt sân.",
        );
        setPolling(false);
      }
    }, 2000);

    return () => clearInterval(poll);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 max-w-md w-full p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader size={36} className="text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Đang xử lý...
            </h2>
            <p className="text-sm text-slate-500">
              Vui lòng đợi trong giây lát
            </p>
          </>
        )}

        {status === "processing" && (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={36} className="text-amber-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Đang xác nhận
            </h2>
            <p className="text-sm text-slate-500 mb-4">{message}</p>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Mã giao dịch:</p>
              <p className="text-sm font-mono font-bold text-slate-700">
                {orderId}
              </p>
            </div>
            {polling && (
              <p className="text-xs text-slate-400 mt-4">
                Đang chờ xác nhận từ VNPay...
              </p>
            )}
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-700 mb-2">
              Thanh toán thành công!
            </h2>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <button
              onClick={() => navigate("/my-bookings")}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold cursor-pointer transition"
            >
              Xem lịch đặt của tôi
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={36} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Thanh toán thất bại
            </h2>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/my-bookings")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold cursor-pointer transition"
              >
                Lịch sử đặt sân
              </button>
              <button
                onClick={() => navigate("/courts")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold cursor-pointer transition"
              >
                Đặt lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
