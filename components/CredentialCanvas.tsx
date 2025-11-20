import React, { useRef, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Member, Credential } from '../types';
import { resolveMediaUrl } from '../services/memberService';
import { Download, Upload, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface CredentialCanvasProps {
  member: Member;
  credential: Credential;
  qrValue: string;
}

export const CredentialCanvas: React.FC<CredentialCanvasProps> = ({ member, credential, qrValue }) => {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Hidden QR ref to extract image data
  const qrRef = useRef<HTMLDivElement>(null);

  const [frontTemplate, setFrontTemplate] = useState<string | null>(null);
  const [backTemplate, setBackTemplate] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  // Default dimensions for standard ID card (High Res)
  const WIDTH = 1012;
  const HEIGHT = 638;

  // DRAW FRONT
  useEffect(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const drawFront = async () => {
      try {
        // 1. Background Template
        if (frontTemplate) {
          const img = await loadImage(frontTemplate);
          ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        } else {
          // Placeholder Guide
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);
          
          ctx.fillStyle = '#64748b';
          ctx.font = '30px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText("Vista Previa (Sube tu plantilla FRENTE)", WIDTH / 2, HEIGHT / 2);
        }

        // 2. Member Photo (Left Side)
        if (member.photoUrl) {
          try {
            const photo = await loadImage(resolveMediaUrl(member.photoUrl));
            
            // Coordenadas ajustadas para el recuadro izquierdo de la plantilla mostrada
            const photoX = 45; 
            const photoY = 235;
            const photoW = 215;
            const photoH = 260;
            
            // Optional: Draw a white background behind photo in case of transparency
            ctx.fillStyle = '#fff';
            ctx.fillRect(photoX, photoY, photoW, photoH);
            
            // Draw Photo
            ctx.drawImage(photo, photoX, photoY, photoW, photoH);
            
            // Draw a border around photo
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(photoX, photoY, photoW, photoH);

          } catch (e) {
            console.warn("Could not load member photo, skipping.", e);
            // Draw placeholder if photo fails
            ctx.fillStyle = '#ccc';
            ctx.fillRect(45, 235, 215, 260);
            ctx.fillStyle = '#666';
            ctx.font = '14px sans-serif';
            ctx.fillText("Error Foto", 150, 360);
          }
        }

        // 3. Text Data (Right Side)
        ctx.textAlign = 'left';
        
        // ROLE (VOCAL/TESORERA) - Above Name
        ctx.fillStyle = '#000000'; 
        ctx.font = 'bold 30px Arial, sans-serif';
        // Centered over the name area somewhat? Or fixed position
        // Based on image: "VOCAL" is to the left or top? In the image provided, "TESORERA" was above name.
        ctx.fillText(member.role.toUpperCase(), 290, 220);

        // NAME - Below "NOMBRE" label
        // Label "NOMBRE" is approx at Y=230 in the image
        // Text should be at Y=270 approx
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 38px Arial, sans-serif';
        // Split full name if too long?
        const fullName = `${member.firstName} ${member.lastName}`.toUpperCase();
        ctx.fillText(fullName, 290, 275);

        // ADDRESS - Below "DIRECCIÓN" label
        // Label "DIRECCIÓN" is approx at Y=330
        // Text area starts approx Y=370
        ctx.fillStyle = '#1e293b';
        ctx.font = '22px Arial, sans-serif';
        const addressX = 290;
        const addressStartY = 375;
        const lineHeight = 30;

        if (member.street) {
            const fullStreet = `C. ${member.street} #${member.houseNumber || ''}`.toUpperCase();
            ctx.fillText(fullStreet, addressX, addressStartY);
        }
        if (member.colony) {
            ctx.fillText(`COL. ${member.colony}`.toUpperCase(), addressX, addressStartY + lineHeight);
        }
        if (member.city) {
            ctx.fillText(member.city.toUpperCase(), addressX, addressStartY + (lineHeight * 2));
        }

        // ID - Bottom area or C.P area
        ctx.fillStyle = '#64748b';
        ctx.font = '16px monospace';
        ctx.fillText(`ID: ${member.id}`, addressX, 550);

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const drawBack = async () => {
      try {
        // 1. Background Template
        if (backTemplate) {
          const img = await loadImage(backTemplate);
          ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        } else {
          // Placeholder
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          ctx.fillStyle = '#64748b';
          ctx.font = '30px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText("Vista Previa (Sube tu plantilla REVERSO)", WIDTH / 2, HEIGHT / 2);
        }

        // 2. QR Code
        // Placing on the LEFT side based on typical layouts where text fields are on the right
        const qrCanvas = qrRef.current?.querySelector('canvas');
        if (qrCanvas) {
            const qrDataUrl = qrCanvas.toDataURL();
            const qrImg = await loadImage(qrDataUrl);
            
            // Position: Left Side, vertically centered relative to the content area
            const qrSize = 240;
            const qrX = 60; 
            const qrY = 200;
            
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

            // Label under QR
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("ESCANEAR PARA VALIDAR", qrX + (qrSize/2), qrY + qrSize + 20);
        }

        // 3. Text Fields (Right Side aligned with white boxes)
        // "VIGENCIA" label is approx Y=210
        // "TIPO DE SANGRE" label is approx Y=310
        // "CURP" label is approx Y=410
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000000';
        
        // We need to print the VALUES inside the white strips to the right of the labels
        // Assuming labels end around X=450, so we start text at X=480
        const textX = 480; 
        
        // VIGENCIA
        ctx.font = 'bold 34px Arial, sans-serif';
        // Center vertically in the white strip (approx Y=200 to 260) -> Text baseline ~245
        ctx.fillText(credential.expirationDate, textX, 245);

        // SANGRE
        if (member.bloodType) {
            // Strip approx Y=300 to 360 -> Text baseline ~345
            ctx.fillText(member.bloodType, textX, 345);
        }

        // CURP / Emergency
        if (member.emergencyContact) {
             // Strip approx Y=400 to 460 -> Text baseline ~445
            ctx.font = '28px Arial, sans-serif';
            ctx.fillText(member.emergencyContact, textX, 445);
        } else {
            // Fallback text if needed
            // ctx.fillText("NO REGISTRADO", textX, 445);
        }

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
      if (src.startsWith('http')) {
        img.crossOrigin = "Anonymous";
      }
      
      img.onload = () => resolve(img);
      
      img.onerror = (e) => {
        console.error("Image load failed for source:", src.substring(0, 50) + "...");
        reject(new Error("Failed to load image"));
      };
      
      img.src = src;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setFn: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFn(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>, filename: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Controls */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-2 flex items-start gap-2">
         <AlertTriangle size={16} className="mt-0.5 shrink-0" />
         <p>
            <strong>Nota:</strong> Sube las imágenes de "Frente" y "Reverso" que tienes en tu PC para ver el resultado final superpuesto.
            Los datos se ajustarán automáticamente a los espacios en blanco.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Upload size={16} /> Plantilla FRENTE
            </label>
            <input 
                type="file" 
                accept="image/*" 
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                onChange={(e) => handleImageUpload(e, setFrontTemplate)}
            />
         </div>
         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Upload size={16} /> Plantilla REVERSO
            </label>
            <input 
                type="file" 
                accept="image/*" 
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                onChange={(e) => handleImageUpload(e, setBackTemplate)}
            />
         </div>
      </div>

      {/* Render Areas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* FRONT */}
        <div className="flex flex-col gap-2 items-center">
            <h4 className="font-bold text-slate-600 flex items-center gap-2"><ImageIcon size={16}/> Vista Frente</h4>
            <div className="border shadow-lg bg-white p-1 rounded">
                <canvas 
                    ref={frontCanvasRef} 
                    width={WIDTH} 
                    height={HEIGHT} 
                    className="w-full h-auto max-w-[500px]"
                />
            </div>
            <button 
                onClick={() => downloadCanvas(frontCanvasRef, `credencial_frente_${member.id}.png`)}
                className="mt-2 flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 text-sm font-bold shadow transition-all hover:shadow-lg"
            >
                <Download size={16} /> Descargar PNG
            </button>
        </div>

        {/* BACK */}
        <div className="flex flex-col gap-2 items-center">
             <h4 className="font-bold text-slate-600 flex items-center gap-2"><ImageIcon size={16}/> Vista Reverso</h4>
             <div className="border shadow-lg bg-white p-1 rounded">
                <canvas 
                    ref={backCanvasRef} 
                    width={WIDTH} 
                    height={HEIGHT} 
                    className="w-full h-auto max-w-[500px]"
                />
            </div>
            <button 
                onClick={() => downloadCanvas(backCanvasRef, `credencial_reverso_${member.id}.png`)}
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
