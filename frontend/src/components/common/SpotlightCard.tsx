import { Box, BoxProps } from "@mantine/core";
import { useRef } from "react";

interface SpotlightCardProps extends BoxProps {
  children: React.ReactNode;
  spotlightColor?: string;
}

export function SpotlightCard({ 
  children, 
  spotlightColor = "rgba(255, 255, 255, 0.15)", 
  style,
  className,
  ...others 
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    divRef.current.style.setProperty("--mouse-x", `${x}px`);
    divRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <Box
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card ${className || ""}`}
      style={{
        ...style,
        ["--spotlight-color" as any]: spotlightColor,
      }}
      {...others}
    >
      <div className="spotlight-overlay" />
      <div className="spotlight-content">
        {children}
      </div>
      
      <style>{`
        .spotlight-card {
          position: relative;
          background: rgba(21, 21, 26, 0.6); /* Glass Dark */
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .spotlight-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .spotlight-overlay {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background: radial-gradient(
            600px circle at var(--mouse-x, 0) var(--mouse-y, 0),
            var(--spotlight-color),
            transparent 40%
          );
          opacity: 0;
          transition: opacity 0.3s;
          z-index: 2;
          mix-blend-mode: overlay;
        }

        .spotlight-card:hover .spotlight-overlay {
          opacity: 1;
        }
        
        /* Inner Border Glow */
        .spotlight-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            400px circle at var(--mouse-x, 0) var(--mouse-y, 0),
            rgba(255, 255, 255, 0.3),
            transparent 40%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
        }

        .spotlight-content {
          position: relative;
          z-index: 1;
          height: 100%;
        }
      `}</style>
    </Box>
  );
}

