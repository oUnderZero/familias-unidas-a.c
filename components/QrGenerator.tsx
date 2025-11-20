import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrGeneratorProps {
  value: string;
  size?: number;
}

export const QrGenerator: React.FC<QrGeneratorProps> = ({ value, size = 128 }) => {
  return (
    <div className="bg-white p-2 rounded-lg shadow-sm inline-block border border-gray-200">
      <QRCodeSVG
        value={value}
        size={size}
        level={"H"}
        includeMargin={true}
      />
    </div>
  );
};