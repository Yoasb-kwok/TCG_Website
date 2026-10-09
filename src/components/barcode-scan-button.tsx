"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { IScannerControls } from "@zxing/browser";
import { cn } from "@/lib/utils";

type ScanStatus = "starting" | "scanning" | "error";

const RETAIL_FORMATS = ["EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "CODE_39", "ITF"] as const;

export function cameraErrorMessage(
  error: unknown,
  options?: { secureContext?: boolean; supported?: boolean },
) {
  if (options?.secureContext === false) {
    return "相機需要安全連線（HTTPS）。請用 https 網址開啟，或者繼續用手打／掃碼槍。";
  }
  if (options?.supported === false) {
    return "這個瀏覽器不支援相機掃描。可以繼續用手打或者掃碼槍。";
  }
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "相機權限被拒絕。請喺 Safari 或 Chrome 允許這個網站使用相機，然後再撳掃描。";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
    return "搵唔到可用相機。可以繼續用手打或者掃碼槍。";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "相機正被其他程式使用，請關閉後再試。";
  }
  if (name === "AbortError") return "";
  return "開唔到相機，請再試一次。可以繼續用手打或者掃碼槍。";
}

function waitForVideo(ref: RefObject<HTMLVideoElement | null>, alive: () => boolean) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (!alive()) {
        reject(new DOMException("cancelled", "AbortError"));
        return;
      }
      if (ref.current) {
        resolve(ref.current);
        return;
      }
      if (Date.now() - started > 2000) {
        reject(new Error("video"));
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  });
}

export function BarcodeScanButton({
  onDetect,
  className,
  disabled = false,
}: {
  onDetect: (code: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("starting");
  const [message, setMessage] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const sessionRef = useRef(0);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const close = () => {
    sessionRef.current += 1;
    stopCamera();
    setTorchOn(false);
    setTorchAvailable(false);
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const openScanner = () => {
    if (disabled || open) return;
    const session = ++sessionRef.current;
    setStatus("starting");
    setMessage("");
    setTorchOn(false);
    setTorchAvailable(false);
    setOpen(true);

    if (!window.isSecureContext) {
      setStatus("error");
      setMessage(cameraErrorMessage(null, { secureContext: false }));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage(cameraErrorMessage(null, { supported: false }));
      return;
    }

    const streamPromise = navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });

    void (async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await streamPromise;
        if (session !== sessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = await waitForVideo(videoRef, () => session === sessionRef.current);
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play().catch(() => undefined);

        const [{ BrowserMultiFormatOneDReader, BarcodeFormat, BrowserCodeReader }, { DecodeHintType }] =
          await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        if (session !== sessionRef.current) return;

        setTorchAvailable(BrowserCodeReader.mediaStreamIsTorchCompatible(stream));
        const hints = new Map();
        hints.set(
          DecodeHintType.POSSIBLE_FORMATS,
          RETAIL_FORMATS.map((format) => BarcodeFormat[format]),
        );
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatOneDReader(hints, {
          delayBetweenScanAttempts: 150,
          tryPlayVideoTimeout: 8000,
        });
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          const text = result?.getText()?.trim();
          if (!text || session !== sessionRef.current) return;
          sessionRef.current += 1;
          controlsRef.current?.stop();
          controlsRef.current = null;
          stream?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setTorchOn(false);
          setOpen(false);
          onDetect(text);
        });
        if (session !== sessionRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("scanning");
      } catch (error) {
        if (session !== sessionRef.current) return;
        stream?.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        const text = cameraErrorMessage(error);
        if (!text) return;
        setStatus("error");
        setMessage(text);
      }
    })();
  };

  const toggleTorch = async () => {
    const next = !torchOn;
    try {
      await controlsRef.current?.switchTorch?.(next);
      setTorchOn(next);
    } catch {
      setMessage("這部裝置開唔到補光。");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openScanner}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="用相機掃描條碼"
        className={cn(
          "inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted px-3 text-sm font-extrabold text-foreground hover:bg-muted/80 disabled:text-muted-foreground",
          className,
        )}
      >
        掃描
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="barcode-scan-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
        >
          <video ref={videoRef} className="min-h-0 w-full flex-1 object-cover" autoPlay muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-[38%] h-28 rounded-2xl border-2 border-pink-400" />
          <div className="space-y-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p id="barcode-scan-title" className="text-center text-base font-extrabold">
              {status === "error" ? "開唔到相機" : "對準商品條碼"}
            </p>
            <p className="text-center text-sm font-bold text-white/80">
              {message || (status === "starting" ? "啟動緊相機…" : "支援 EAN-13、UPC、Code 128")}
            </p>
            <div className="flex gap-2">
              {torchAvailable && status === "scanning" && (
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  className="h-12 flex-1 rounded-xl border border-white/30 text-sm font-extrabold"
                >
                  {torchOn ? "關補光" : "開補光"}
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="h-12 flex-1 rounded-xl bg-white text-base font-extrabold text-black"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
