import React from 'react';

export const GovRsLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="220" height="48" viewBox="0 0 220 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <text x="0" y="15" fontFamily="Public Sans, sans-serif" fontWeight="400" fontSize="11" fill="#FFFFFF">GOVERNO DO ESTADO</text>
    <text x="0" y="32" fontFamily="Public Sans, sans-serif" fontWeight="800" fontSize="16" fill="#FFFFFF">RIO GRANDE</text>
    <text x="0" y="47" fontFamily="Public Sans, sans-serif" fontWeight="800" fontSize="16" fill="#FFFFFF">DO SUL</text>
    
    <line x1="145" y1="10" x2="145" y2="38" stroke="rgba(251, 186, 0, 0.4)" strokeWidth="1" />
    <text x="155" y="30" fontFamily="Public Sans, sans-serif" fontWeight="600" fontSize="12" fill="#FFFFFF">SECOM/RS</text>
  </svg>
);
