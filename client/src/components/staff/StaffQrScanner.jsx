import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { staffApi } from "@/lib/api";
import { toast } from "sonner";

const scannerId = "staff-qr-reader";

export default function StaffQrScanner({ counterId, onCheckedIn }) {
  const scannerRef = useRef(null);
  const handlingRef = useRef(false);
  const [status, setStatus] = useState("starting");

  useEffect(() => {
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    let active = true;

    const stopScanner = async () => {
      if (scanner.isScanning) {
        await scanner.stop().catch(() => {});
      }
      scanner.clear();
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (!active || handlingRef.current) return;
          handlingRef.current = true;
          setStatus("checking");
          try {
            const response = await staffApi.qrCheckIn(decodedText, counterId);
            toast.success(
              response.data.message || "Token checked in successfully.",
            );
            onCheckedIn?.(response.data.data.token);
          } catch (error) {
            toast.error(error.response?.data?.message || "QR check-in failed.");
          } finally {
            handlingRef.current = false;
            if (active) setStatus("ready");
          }
        },
        () => {},
      )
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch(() => {
        if (active) {
          setStatus("error");
          toast.error(
            "Unable to access the camera. Check browser permissions.",
          );
        }
      });

    return () => {
      active = false;
      stopScanner();
      scannerRef.current = null;
    };
  }, [counterId, onCheckedIn]);

  return (
    <div className="space-y-3">
      <div
        id={scannerId}
        className="overflow-hidden rounded-2xl bg-slate-950 min-h-64"
      />
      <p className="text-xs text-slate-500" role="status">
        {status === "checking"
          ? "Verifying token securely..."
          : status === "error"
            ? "Scanner unavailable."
            : "Point the camera at a citizen's secure QR code."}
      </p>
    </div>
  );
}
