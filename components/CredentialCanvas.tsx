import React, { useRef, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Member, Credential } from "../types";
import { resolveMediaUrl } from "../services/memberService";
import { Download, Image as ImageIcon } from "lucide-react";

interface CredentialCanvasProps {
  member: Member;
  credential: Credential;
  qrValue: string;
}

export const CredentialCanvas: React.FC<CredentialCanvasProps> = ({
  member,
  credential,
  qrValue,
}) => {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);

  // Hidden QR ref to extract image data
  const qrRef = useRef<HTMLDivElement>(null);

  const [frontTemplate] = useState<string | null>(null);
  const [backTemplate] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  // Diseño base (sobre las plantillas originales)
  const WIDTH = 1012;
  const HEIGHT = 638;
  // Tamaño de exportación físico: 8.5 cm x 5.3 cm a 300 DPI
  const PRINT_WIDTH = Math.round((8.5 / 2.54) * 300); // cm -> pulgadas -> px
  const PRINT_HEIGHT = Math.round((5.3 / 2.54) * 300);
  const DEFAULT_FRONT = "/templates/front.png";
  const DEFAULT_BACK = "/templates/back.png";

  // DRAW FRONT
  useEffect(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const drawFront = async () => {
      try {
        // 1. Background Template (usa la plantilla por defecto si no se sube nada)
        const frontBg = frontTemplate || DEFAULT_FRONT;
        const img = await loadImage(frontBg);
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

        // 2. Member Photo (Left Side)
        // ... dentro de drawFront

        // 2. Member Photo (Left Side)
        if (member.photoUrl) {
          try {
            const photo = await loadImage(resolveMediaUrl(member.photoUrl));
            // Coordenadas cuadrícula del recuadro de foto en la plantilla frontal
            const photoX = 36;
            const photoY = 276;
            const photoW = 156;
            const photoH = 156;

            // Optional: Draw a white background behind photo
            ctx.fillStyle = "#fff";
            ctx.fillRect(photoX, photoY, photoW, photoH);

            // ✨✨✨ Lógica de Ajuste (object-fit: cover) ✨✨✨

            // 1. Obtener dimensiones de la imagen de origen y destino
            const imgRatio = photo.width / photo.height;
            const boxRatio = photoW / photoH;

            let drawWidth; // Ancho de la parte de la imagen original a dibujar (sx, sw)
            let drawHeight; // Alto de la parte de la imagen original a dibujar (sy, sh)
            let offsetX = 0; // Posición x de inicio en la imagen original (sx)
            let offsetY = 0; // Posición y de inicio en la imagen original (sy)

            if (imgRatio > boxRatio) {
              // La imagen es más ancha que el recuadro de destino.
              // Ajustamos por altura y centramos horizontalmente, recortando los lados.
              drawHeight = photo.height;
              drawWidth = photo.height * boxRatio;
              offsetX = (photo.width - drawWidth) / 2;
              offsetY = 0;
            } else {
              // La imagen es más alta que el recuadro de destino (o es la misma proporción).
              // Ajustamos por ancho y centramos verticalmente, recortando arriba/abajo.
              drawWidth = photo.width;
              drawHeight = photo.width / boxRatio;
              offsetX = 0;
              offsetY = (photo.height - drawHeight) / 2;
            }

            // Dibujar usando los 9 argumentos de drawImage:
            // ctx.drawImage(imagen, sx, sy, sw, sh, dx, dy, dw, dh)
            // (s=source/origen, d=destination/destino)
            ctx.drawImage(
              photo,
              offsetX, // sx: Recorte X en la imagen original
              offsetY, // sy: Recorte Y en la imagen original
              drawWidth, // sw: Ancho de la parte original a usar
              drawHeight, // sh: Alto de la parte original a usar
              photoX, // dx: Posición X en el canvas
              photoY, // dy: Posición Y en el canvas
              photoW, // dw: Ancho final en el canvas (el tamaño del recuadro)
              photoH // dh: Alto final en el canvas (el tamaño del recuadro)
            );
            // ✨✨✨ FIN Lógica de Ajuste ✨✨✨
          } catch (e) {
            // ... el resto del código de placeholder
            console.warn("Could not load member photo, skipping.", e);
            // Draw placeholder if photo fails
            ctx.fillStyle = "#ccc";
            ctx.fillRect(photoX, photoY, photoW, photoH);
            ctx.fillStyle = "#666";
            ctx.font = "14px sans-serif";
            ctx.fillText("Error Foto", photoX + 70, photoY + 120);
          }
        }

        // 3. Text Data (Right Side)
        ctx.textAlign = "left";

        // ROLE (arriba de la foto)
        ctx.fillStyle = "#000000";
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText((member.role || "").toUpperCase(), 140, 220);
        ctx.textAlign = "left";

        ctx.fillStyle = "#000000";
        ctx.font = "  22px Arial, sans-serif";
        ctx.fillText((member.firstName || "").toUpperCase(), 240, 300);
        ctx.fillText((member.lastName || "").toUpperCase(), 620, 300);

        ctx.fillStyle = "#1e293b";
        ctx.font = "26px Arial, sans-serif";
        const addressX = 240;
        const addressY = 405;
        const dir = [member.street, member.houseNumber]
          .filter(Boolean)
          .join(" ");
        const colony = member.colony ? member.colony : "";
        if (dir) ctx.fillText(dir.toUpperCase(), addressX, addressY);
        if (colony) ctx.fillText(colony.toUpperCase(), addressX, addressY + 32);

        // C.P (usar postalCode; fallback ID)
        ctx.font = "24px Arial, sans-serif";
        const cpValue = member.postalCode || member.id;
        ctx.fillText((cpValue || "").toUpperCase(), addressX + 60, 500);

        // Ya no mostramos ciudad en esta plantilla
      } catch (error) {
        console.error("Error drawing front canvas:", error);
      }
    };

    drawFront();
  }, [frontTemplate, member]);

  // DRAW BACK
  useEffect(() => {
    const canvas = backCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const drawBack = async () => {
      try {
        // 1. Background Template (usa la plantilla por defecto si no se sube nada)
        const backBg = backTemplate || DEFAULT_BACK;
        const img = await loadImage(backBg);
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

        // 2. QR Code
        const qrCanvas = qrRef.current?.querySelector("canvas");
        if (qrCanvas) {
          const qrDataUrl = qrCanvas.toDataURL();
          const qrImg = await loadImage(qrDataUrl);

          // Coordenadas del QR en la plantilla reversible
          const qrSize = 272;
          const qrX = 30;
          const qrY = 220;

          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Label under QR
          ctx.fillStyle = "#000";
          ctx.font = "bold 14px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            "ESCANEAR PARA VALIDAR",
            qrX + qrSize / 2,
            qrY + qrSize + 20
          );
        }

        // 3. Text Fields (alineadas con barras azules)
        ctx.textAlign = "left";
        ctx.fillStyle = "#000000";

        // VIGENCIA
        ctx.font = "bold 34px Arial, sans-serif";
        ctx.fillText(credential.expirationDate, 537, 260);

        // SANGRE
        if (member.bloodType) {
          ctx.fillText(member.bloodType, 665, 370);
        }

        // CURP / Emergency (usamos emergencias como CURP si no hay otro campo)
        const curpValue = member.curp || member.emergencyContact || member.id;
        ctx.font = "28px Arial, sans-serif";
        ctx.fillText(curpValue, 468, 475);
      } catch (error) {
        console.error("Error drawing back canvas:", error);
      }
    };

    // Small timeout to ensure QR is rendered
    setTimeout(drawBack, 200);
  }, [backTemplate, member, credential]);

  // Improved Image Loader
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Only set crossOrigin for external URLs (http/https) that are not base64 data
      if (src.startsWith("http")) {
        img.crossOrigin = "Anonymous";
      }

      img.onload = () => resolve(img);

      img.onerror = (e) => {
        console.error(
          "Image load failed for source:",
          src.substring(0, 50) + "..."
        );
        reject(new Error("Failed to load image"));
      };

      img.src = src;
    });
  };

  const downloadCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    filename: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Escala el lienzo de vista previa al tamaño físico requerido
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = PRINT_WIDTH;
    exportCanvas.height = PRINT_HEIGHT;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(canvas, 0, 0, PRINT_WIDTH, PRINT_HEIGHT);

    const link = document.createElement("a");
    link.download = filename;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Render Areas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* FRONT */}
        <div className="flex flex-col gap-2 items-center">
          <h4 className="font-bold text-slate-600 flex items-center gap-2">
            <ImageIcon size={16} /> Vista Frente
          </h4>
          <div className="border shadow-lg bg-white p-1 rounded">
            <canvas
              ref={frontCanvasRef}
              width={WIDTH}
              height={HEIGHT}
              className="w-full h-auto max-w-[500px]"
            />
          </div>
          <button
            onClick={() =>
              downloadCanvas(
                frontCanvasRef,
                `credencial_frente_${member.id}.png`
              )
            }
            className="mt-2 flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 text-sm font-bold shadow transition-all hover:shadow-lg"
          >
            <Download size={16} /> Descargar PNG
          </button>
        </div>

        {/* BACK */}
        <div className="flex flex-col gap-2 items-center">
          <h4 className="font-bold text-slate-600 flex items-center gap-2">
            <ImageIcon size={16} /> Vista Reverso
          </h4>
          <div className="border shadow-lg bg-white p-1 rounded">
            <canvas
              ref={backCanvasRef}
              width={WIDTH}
              height={HEIGHT}
              className="w-full h-auto max-w-[500px]"
            />
          </div>
          <button
            onClick={() =>
              downloadCanvas(
                backCanvasRef,
                `credencial_reverso_${member.id}.png`
              )
            }
            className="mt-2 flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 text-sm font-bold shadow transition-all hover:shadow-lg"
          >
            <Download size={16} /> Descargar PNG
          </button>
        </div>
      </div>

      {/* Hidden QR Source for Canvas Generation */}
      <div ref={qrRef} className="hidden">
        <QRCodeCanvas
          value={qrValue}
          size={256}
          level={"H"}
          includeMargin={false}
        />
      </div>
    </div>
  );
};
