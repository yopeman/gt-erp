import React, { useMemo } from 'react';
import { QrCode, QrEcc } from '../../utils/qrCodeGenerator';

/**
 * Standard ISO/IEC 18004 Compliant SVG QR Code
 * Includes standard 4-module quiet zone (white border) necessary for smartphone camera detection.
 */
export default function QrCodeSvg({
  text,
  size = 64,
  margin = 4,
  className = '',
  errorCorrection = QrEcc.LOW
}) {
  const qr = useMemo(() => {
    if (!text) return null;
    try {
      return QrCode.encodeText(text, errorCorrection);
    } catch (err) {
      console.warn('Failed to encode QR code:', err);
      return null;
    }
  }, [text, errorCorrection]);

  if (!qr) {
    return (
      <div
        className={`bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 font-mono ${className}`}
        style={{ width: size, height: size }}
      >
        QR
      </div>
    );
  }

  const matrixSize = qr.size;
  const totalSize = matrixSize + margin * 2;

  // Build SVG path for crisp rendering without sub-pixel anti-aliasing artifacts
  const pathParts = [];
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (qr.getModule(c, r)) {
        const x = c + margin;
        const y = r + margin;
        pathParts.push(`M${x},${y}h1v1h-1z`);
      }
    }
  }
  const pathData = pathParts.join('');

  return (
    <div
      className={`bg-white p-0.5 rounded-sm shadow-xs border border-slate-200 inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={text}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        shapeRendering="crispEdges"
        className="block w-full h-full"
      >
        <rect width={totalSize} height={totalSize} fill="#ffffff" />
        <path d={pathData} fill="#000000" />
      </svg>
    </div>
  );
}
