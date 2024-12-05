import { memo, useMemo, useState, useEffect } from 'react';
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
  4: { shapes: 5, useGradients: true, useNoise: true, useDistortion: true },
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

// Add new filter generation functions
const generateRandomFilter = (seed: number) => {
  // 20% chance of no filter
  if (seed < 0.2) return null;

  const filterTypes = [
    'crystallize',
    'liquidMetal',
    'neonGlow',
    'ripple',
    'psychedelic',
    'glitch',
    'painterly',
    'cosmic',
    'fire',
    'matrix',
    'doubleVision',
    'pixelate'
  ];
  
  const type = filterTypes[Math.floor(seed * filterTypes.length)];
  
  switch (type) {
    case 'crystallize':
      return {
        id: 'crystallize',
        elements: [
          { type: 'feTurbulence', attrs: { 
            baseFrequency: (seed * 0.1).toFixed(3), 
            numOctaves: Math.floor(seed * 5) + 2,
            seed: Math.floor(seed * 1000)
          }},
          { type: 'feDisplacementMap', attrs: { in: 'SourceGraphic', scale: 30 + seed * 50 }},
          { type: 'feColorMatrix', attrs: { type: 'saturate', values: 1 + seed * 3 }}
        ]
      };
    case 'liquidMetal':
      return {
        id: 'liquidMetal',
        elements: [
          { type: 'feGaussianBlur', attrs: { stdDeviation: seed * 4 }},
          { type: 'feColorMatrix', attrs: { type: 'matrix', 
            values: `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${20 + seed * 10} -${10 + seed * 5}` }},
          { type: 'feComposite', attrs: { operator: 'atop', in2: 'SourceGraphic' }}
        ]
      };
    case 'cosmic':
      return {
        id: 'cosmic',
        elements: [
          { type: 'feTurbulence', attrs: { 
            type: 'fractalNoise',
            baseFrequency: '0.01',
            numOctaves: '3',
            seed: Math.floor(seed * 1000)
          }},
          { type: 'feDisplacementMap', attrs: { in: 'SourceGraphic', scale: 50 }},
          { type: 'feGaussianBlur', attrs: { stdDeviation: seed * 2 }},
          { type: 'feColorMatrix', attrs: { type: 'hueRotate', values: (seed * 360).toString() }}
        ]
      };
    case 'matrix':
      return {
        id: 'matrix',
        elements: [
          { type: 'feColorMatrix', attrs: { type: 'matrix',
            values: `
              ${seed} 0 0 0 0
              0 ${seed * 2} 0 0 0
              0 0 ${seed * 0.5} 0 0
              0 0 0 1 0`
          }},
          { type: 'feTurbulence', attrs: { 
            baseFrequency: '0.005',
            seed: Math.floor(seed * 1000)
          }},
          { type: 'feDisplacementMap', attrs: { in: 'SourceGraphic', scale: 20 }}
        ]
      };
    case 'doubleVision':
      return {
        id: 'doubleVision',
        elements: [
          { type: 'feOffset', attrs: { dx: seed * 10, dy: seed * 10, in: 'SourceGraphic', result: 'COPY' }},
          { type: 'feColorMatrix', attrs: { 
            in: 'COPY',
            type: 'matrix',
            values: '1 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0.5 0'
          }},
          { type: 'feBlend', attrs: { in: 'SourceGraphic', in2: 'COPY', mode: 'screen' }}
        ]
      };
    case 'pixelate':
      return {
        id: 'pixelate',
        elements: [
          { type: 'feGaussianBlur', attrs: { stdDeviation: seed * 2 }},
          { type: 'feColorMatrix', attrs: { type: 'discrete', values: Math.floor(2 + seed * 5) }},
          { type: 'feMorphology', attrs: { operator: 'dilate', radius: seed * 2 }}
        ]
      };
    case 'neonGlow':
      return {
        id: 'neonGlow',
        elements: [
          { type: 'feGaussianBlur', attrs: { stdDeviation: 4 } },
          { type: 'feColorMatrix', attrs: { type: 'matrix',
            values: '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -6' } },
          { type: 'feBlend', attrs: { mode: 'screen', in2: 'SourceGraphic' } }
        ]
      };
    case 'ripple':
      return {
        id: 'ripple',
        elements: [
          { type: 'feTurbulence', attrs: { baseFrequency: '0.02', numOctaves: 3, seed: seed * 100 } },
          { type: 'feDisplacementMap', attrs: { in: 'SourceGraphic', scale: 30 } }
        ]
      };
    case 'psychedelic':
      return {
        id: 'psychedelic',
        elements: [
          { type: 'feColorMatrix', attrs: { type: 'hueRotate', values: (seed * 360).toString() } },
          { type: 'feColorMatrix', attrs: { type: 'saturate', values: '3' } }
        ]
      };
    case 'glitch':
      return {
        id: 'glitch',
        elements: [
          { type: 'feOffset', attrs: { dx: 3, dy: 0, in: 'SourceGraphic', result: 'RED' } },
          { type: 'feOffset', attrs: { dx: -3, dy: 0, in: 'SourceGraphic', result: 'BLUE' } },
          { type: 'feBlend', attrs: { mode: 'screen', in: 'RED', in2: 'BLUE' } }
        ]
      };
    case 'painterly':
      return {
        id: 'painterly',
        elements: [
          { type: 'feMorphology', attrs: { operator: 'dilate', radius: '2' } },
          { type: 'feGaussianBlur', attrs: { stdDeviation: '2' } }
        ]
      };
    default:
      // Fallback filter if something goes wrong
      return null;
  }
};

// Add a helper function to get a stable rotation value
const getStableRotation = (id: string | undefined, index: number) => {
  // Handle undefined or empty id
  if (!id) return (index * 3 % 90).toString();
  
  // Convert the id to a number by summing char codes if parseInt fails
  const baseNum = parseInt(id, 16) || 
    id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((baseNum + index * 3) % 90).toString();
};

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
          {/* Replace existing filter definitions with dynamic ones */}
          {design.shapes.map((_, i) => {
            const filter = generateRandomFilter(
              // Use both design.id and shape index for more variation
              (parseInt(design.id || '0', 16) / Number.MAX_SAFE_INTEGER) + (i * 0.1)
            );
            if (!filter) return null;
            return (
              <filter key={i} id={`filter-${i}`}>
                {filter.elements.map((element, j) => {
                  const Component = element.type;
                  return <Component key={j} {...element.attrs} />;
                })}
              </filter>
            );
          })}
          
          {/* Keep existing gradients */}
          {gradientDefs.map((gradient, index) => (
            <linearGradient 
              key={gradient.id || index}
              id={gradient.id || `gradient-${index}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="256"
              y2="1000"
              gradientTransform={`rotate(${getStableRotation(design.id, index)}, 128, 128)`}
            >
              <stop offset="0%" stopColor={gradient.colors[0] || '#000'} />
              <stop offset="100%" stopColor={gradient.colors[1] || '#fff'} />
            </linearGradient>
          ))}
          
          {/* Add noise texture */}
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" />
            <feDisplacementMap in="SourceGraphic" scale="20" />
          </filter>
          
          <filter id="organic-distortion">
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency="0.012" 
              numOctaves="4" 
              seed={parseInt(design.id, 16) || 1}
            />
            <feDisplacementMap 
              in="SourceGraphic" 
              scale="30"
            />
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
            design={design}
          />
        ))}
      </svg>
    </div>
  );
});

const ShapeElement = ({ 
  shape, 
  gradientId, 
  useNoise,
  design 
}: { 
  shape: Shape; 
  gradientId: string;
  useNoise: boolean;
  design: Design;
}) => {
  const commonProps = {
    fill: `url(#${gradientId})`,
    filter: Math.random() > 0.2 ? `url(#filter-${Math.floor(Math.random() * design.shapes.length)})` : undefined,
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
    case 'line':
      return (
        <line
          x1={shape.x - shape.size/2}
          y1={shape.y}
          x2={shape.x + shape.size/2}
          y2={shape.y}
          stroke={`url(#${gradientId})`}
          strokeWidth={shape.size/10}
          {...commonProps}
        />
      );
    case 'triangle': {
      // Calculate points for equilateral triangle
      const height = shape.size * Math.sqrt(3) / 2;
      const points = `
        ${shape.x},${shape.y - height}
        ${shape.x - shape.size/2},${shape.y + height}
        ${shape.x + shape.size/2},${shape.y + height}
      `;
      return <polygon points={points} {...commonProps} />;
    }
    case 'squiggle': {
      // Create a wavy path using sine wave
      const points = Array.from({ length: 20 }, (_, i) => {
        const t = i / 19;
        const x = shape.x - shape.size/2 + shape.size * t;
        const y = shape.y + Math.sin(t * Math.PI * 4) * (shape.size/4);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
      return (
        <path
          d={points}
          stroke={`url(#${gradientId})`}
          strokeWidth={shape.size/10}
          fill="none"
          {...commonProps}
        />
      );
    }
    default:
      return null;
  }
}; 