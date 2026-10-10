import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { staffApi } from "@/lib/api";
import { toast } from "sonner";

const scannerId = "staff-qr-reader";

export default function StaffQrScanner({ counterId, onCheckedIn }) {
  const scannerRef = useRef(null);
  const handlingRef = useRef(false);
  const activeRef = useRef(false);
  const operationRef = useRef(false);
  const propsRef = useRef({ counterId, onCheckedIn });

  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("off");

  useEffect(() => {
    propsRef.current = { counterId, onCheckedIn };
  }, [counterId, onCheckedIn]);

  useEffect(() => {
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    let mounted = true;

    const cleanup = async () => {
      activeRef.current = false;

      if (scanner.isScanning) {
        await scanner.stop().catch(() => {});
      }

      scanner.clear();

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }
    };

    return () => {
      mounted = false;
      activeRef.current = false;
      cleanup();
    };
  }, []);

  const toggleCamera = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner || operationRef.current) return;

    operationRef.current = true;

    try {
      if (activeRef.current) {
        activeRef.current = false;
        setStatus("stopping");

        if (scanner.isScanning) {
          await scanner.stop();
        }

        setCameraOn(false);
        setStatus("off");
        return;
      }

      setStatus("starting");

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (!activeRef.current || handlingRef.current) return;

          handlingRef.current = true;
          setStatus("checking");

          try {
            const { counterId, onCheckedIn } = propsRef.current;
            const response = await staffApi.qrCheckIn(decodedText, counterId);

            toast.success(
              response.data.message || "Token checked in successfully.",
            );

            onCheckedIn?.(response.data.data.token);
          } catch (error) {
            toast.error(error.response?.data?.message || "QR check-in failed.");
          } finally {
            handlingRef.current = false;

            if (activeRef.current) {
              setStatus("ready");
            }
          }
        },
        () => {},
      );

      activeRef.current = true;
      setCameraOn(true);
      setStatus("ready");
    } catch (error) {
      activeRef.current = false;
      setCameraOn(false);
      setStatus("error");

      toast.error(
        "Unable to start the camera. Check browser permissions and ensure the page uses HTTPS or localhost.",
      );
    } finally {
      operationRef.current = false;
    }
  }, []);

  return (
    <div className="space-y-3">
      <div
        id={scannerId}
        className="min-h-64 overflow-hidden rounded-2xl bg-slate-950"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500" role="status">
          {status === "starting"
            ? "Starting camera..."
            : status === "stopping"
              ? "Turning camera off..."
              : status === "checking"
                ? "Verifying token securely..."
                : status === "error"
                  ? "Camera unavailable."
                  : status === "ready"
                    ? "Camera is on. Scan a QR code."
                    : "Camera is off."}
        </p>

        <button
          type="button"
          onClick={toggleCamera}
          disabled={
            status === "starting" ||
            status === "stopping" ||
            status === "checking"
          }
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            cameraOn
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
        </button>
      </div>
    </div>
  );
}
