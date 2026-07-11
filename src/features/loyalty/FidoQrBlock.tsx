import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  /** base64url-encoded raw binary frame from generate_loyalty_qr */
  payloadB64url: string;
  size?: number;
}

function b64urlToUint8Array(b64url: string): Uint8Array {
  // base64url → base64 standard
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function FidoQrBlock({ payloadB64url, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const bytes = b64urlToUint8Array(payloadB64url);
      QRCode.toCanvas(canvas, [{ data: bytes, mode: "byte" }], {
        errorCorrectionLevel: "M",
        width: size,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    } catch {
      // silently ignore — QR block simply won't render
    }
  }, [payloadB64url, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="rounded-xl" />
      <div className="text-center space-y-0.5">
        <p className="text-xs font-black text-on-surface uppercase tracking-widest">
          Scannez avec Fido
        </p>
        <p className="text-[10px] text-outline">
          Cumulez vos points de fidélité
        </p>
      </div>
    </div>
  );
}
