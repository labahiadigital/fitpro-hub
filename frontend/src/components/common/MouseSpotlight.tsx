import React, { useEffect, useRef } from "react";

/**
 * MouseSpotlight Component
 * 
 * Attaches a mouse move listener to a container (or document if no ref provided)
 * and updates CSS variables --mouse-x and --mouse-y on that container.
 * This allows for high-performance "spotlight" effects using only CSS.
 */
interface MouseSpotlightProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const MouseSpotlight: React.FC<MouseSpotlightProps> = ({ 
  children, 
  className, 
  style 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      container.style.setProperty("--mouse-x", `${x}px`);
      container.style.setProperty("--mouse-y", `${y}px`);
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={style}
    >
      {children}
    </div>
  );
};

