"use client";

import { useRef } from "react";

export function Signature({ onChange }: { onChange: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rectangle.left) * 800) / rectangle.width,
      y: ((event.clientY - rectangle.top) * 240) / rectangle.height,
    };
  }
  return (
    <div className="signature-area">
      <canvas
        ref={canvasRef}
        width={800}
        height={240}
        aria-label="受取人の署名欄。指またはマウスで署名してください。"
        onPointerDown={(event) => {
          const context = event.currentTarget.getContext("2d")!;
          const position = point(event);
          drawing.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          context.beginPath();
          context.moveTo(position.x, position.y);
          context.lineWidth = 3;
          context.lineCap = "round";
          context.strokeStyle = "#203c38";
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = event.currentTarget.getContext("2d")!;
          const position = point(event);
          context.lineTo(position.x, position.y);
          context.stroke();
          hasStroke.current = true;
        }}
        onPointerUp={(event) => {
          drawing.current = false;
          if (hasStroke.current) onChange(event.currentTarget.toDataURL("image/png"));
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <div className="signature-caption">
        <span>受取人の方が、指またはマウスで署名してください。</span>
        <button
          type="button"
          onClick={() => {
            canvasRef.current?.getContext("2d")?.clearRect(0, 0, 800, 240);
            hasStroke.current = false;
            onChange("");
          }}
        >
          書き直す
        </button>
      </div>
    </div>
  );
}
