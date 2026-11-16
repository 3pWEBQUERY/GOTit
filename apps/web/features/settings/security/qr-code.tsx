"use client";

import { Skeleton } from "@app/ui";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * QR-Code der otpauth-URI als SVG in einer Data-URL (die CSP erlaubt `img-src data:`).
 * Dunkle Module auf weissem Grund in beiden Farbschemata, damit Kameras ihn lesen.
 */
export function QrCode({ value, alt }: { value: string; alt: string }) {
  const [source, setSource] = useState<{ value: string; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: "svg", margin: 2, errorCorrectionLevel: "M" }).then(
      (svg) => {
        if (active) setSource({ value, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [value]);

  if (!source || source.value !== value) return <Skeleton variant="block" className="size-48 rounded-control" />;
  // eslint-disable-next-line @next/next/no-img-element -- Data-URL, next/image optimiert sie nicht
  return <img src={source.url} alt={alt} width={192} height={192} className="size-48 rounded-control border border-border" />;
}
