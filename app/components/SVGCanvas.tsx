import { memo, useMemo } from 'react';
import { createNoise2D } from 'simplex-noise';
import { scaleLinear } from 'd3-scale';
import type { Design, Shape } from '../types';

interface SVGCanvasProps {
  design: Design;
  isActive: boolean;
  onClick?: () => void;
}

// Add complexity levels
const COMPLEXITY_LEVELS = {
  1: { shapes: 1, useGradients: false, useNoise: false },
  2: { shapes: 2, useGradients: true, useNoise: false },
  3: { shapes: 3, useGradients: true, useNoise: true },
  4: { shapes: 5, useGradients: true, useNoise: true },
  // Add more levels as needed
};

// Add a utility function to generate deterministic colors from a seed
function getColorFromSeed(seed: string | number, index: number): string {
  // Use the seed and index to generate a predictable number between 0 and 1
  const hash = String(seed) + index;
  const n = Array.from(hash).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = (n * 137.508) % 360; // Golden angle approximation for nice color distribution
  return `hsl(${hue}, 70%, 50%)`;
}

export const SVGCanvas = memo(function SVGCanvas({ 
  design, 
  isActive, 
  onClick 
}: SVGCanvasProps) {
  // Generate stable gradients for the current design
  const gradientDefs = useMemo(() => {
    return design.shapes.map((_, i) => ({
      id: `gradient-${i}`,
      colors: [
        getColorFromSeed(design.id, i * 2),
        getColorFromSeed(design.id, i * 2 + 1)
      ]
    }));
  }, [design.id]);

  return (
    <div className={`canvas-wrapper ${isActive ? 'active' : ''}`}
         onClick={onClick}
         style={{
           cursor: isActive ? 'pointer' : 'default',
           borderTop: isActive ? '2px solid #ff0f0f' : '1px solid #000000',
           borderRight: isActive ? '2px solid #ff0f0f' : '1px solid #000000',
           borderLeft: isActive ? '2px solid #ff0f0f' : '0px solid #000000',
           borderBottom: isActive ? '2px solid #ff0f0f' : '1px solid #000000',
           borderRadius: '0px',
           overflow: 'hidden',
           height: '100%',
           position: 'relative'
         }}>
      <svg
        viewBox="0 0 256 256"
        style={{
          width: '100%',
          height: '100%',
          background: 'orange',
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          {design.filters.map((filter, i) => (
            <filter key={i} id={`filter-${i}`}>
              {filter.type === 'blur' && (
                <feGaussianBlur stdDeviation={filter.parameters.radius || 0} />
              )}
            </filter>
          ))}
          
          {/* Add gradients */}
          {gradientDefs.map((gradient, index) => (
            <linearGradient 
              key={gradient.id} 
              id={gradient.id} 
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="256"
              y2="1000"
              gradientTransform={`rotate(${getColorFromSeed(design.id, index * 3) % 90}, 128, 128)`}
            >
              <stop offset="0%" stopColor={gradient.colors[0]} />
              <stop offset="100%" stopColor={gradient.colors[1]} />
            </linearGradient>
          ))}
          
          {/* Add noise texture */}
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" />
            <feDisplacementMap in="SourceGraphic" scale="20" />
          </filter>
        </defs>
        
        {/* Background with gradient */}
        <rect 
          x="0" 
          y="-2000" 
          width="256" 
          height="4000" 
          fill={`url(#gradient-${design.shapes.length - 1})`}
        />
        
        {design.shapes.map((shape, i) => (
          <ShapeElement 
            key={i} 
            shape={shape} 
            gradientId={`gradient-${i}`}
            useNoise={design.shapes.length > 2}
          />
        ))}
      </svg>
    </div>
  );
});

const ShapeElement = ({ 
  shape, 
  gradientId, 
  useNoise 
}: { 
  shape: Shape; 
  gradientId: string;
  useNoise: boolean;
}) => {
  const commonProps = {
    fill: `url(#${gradientId})`,
    filter: useNoise ? 'url(#noise)' : undefined,
    transform: shape.rotation ? `rotate(${shape.rotation} ${shape.x} ${shape.y})` : undefined,
  };

  switch (shape.type) {
    case 'circle':
      return (
        <circle
          cx={shape.x}
          cy={shape.y}
          r={shape.size}
          {...commonProps}
        />
      );
    case 'rect':
      return (
        <rect
          x={shape.x - shape.size/2}
          y={shape.y - shape.size/2}
          width={shape.size}
          height={shape.size}
          {...commonProps}
        />
      );
    // Add more shape types as needed
    default:
      return null;
  }
}; 