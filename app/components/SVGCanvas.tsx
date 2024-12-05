import { memo } from 'react';
import type { Design, Shape } from '../types';

interface SVGCanvasProps {
  design: Design;
  isActive: boolean;
  onClick?: () => void;
}

export const SVGCanvas = memo(function SVGCanvas({ 
  design, 
  isActive, 
  onClick 
}: SVGCanvasProps) {
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
           height: '100%'
         }}>
      <svg
        viewBox="0 0 256 256"
        style={{
          width: '100%',
          height: '100%',
          background: '#fff'
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
        </defs>
        
        {design.shapes.map((shape, i) => (
          <ShapeElement key={i} shape={shape} />
        ))}
      </svg>
    </div>
  );
});

const ShapeElement = ({ shape }: { shape: Shape }) => {
  switch (shape.type) {
    case 'circle':
      return (
        <circle
          cx={shape.x}
          cy={shape.y}
          r={shape.size}
          fill={shape.color}
          transform={shape.rotation ? `rotate(${shape.rotation} ${shape.x} ${shape.y})` : undefined}
        />
      );
    case 'rect':
      return (
        <rect
          x={shape.x - shape.size/2}
          y={shape.y - shape.size/2}
          width={shape.size}
          height={shape.size}
          fill={shape.color}
          transform={shape.rotation ? `rotate(${shape.rotation} ${shape.x} ${shape.y})` : undefined}
        />
      );
    // Add more shape types as needed
    default:
      return null;
  }
}; 