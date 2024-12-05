import { useState, useEffect } from 'react';
import usePartySocket from 'partysocket/react';
import { SVGCanvas } from './SVGCanvas';

interface Shape {
  type: 'circle' | 'rect' | 'line' | 'triangle' | 'squiggle';
  x: number;
  y: number;
  size: number;
  color: string;
  rotation?: number;
}

interface Design {
  id: string;
  shapes: Shape[];
  filters: Array<{
    type: string;
    parameters: {
      seed: number;
      intensity: number;
    };
  }>;
}

interface ArtGridProps {
  roomId: string;
}

// Helper functions for color generation
const generateRandomHex = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
};

const colorPalette = [
  // Reds to Oranges
  '#FF0000', '#FF1A1A', '#FF3333', '#FF4D4D', '#FF6666', '#FF8080', 
  '#FF9999', '#FFB3B3', '#FF8533', '#FF9933', '#FFB366', '#FFCC99',
  // Yellows
  '#FFFF00', '#FFFF33', '#FFFF66', '#FFFF99', '#FFFFCC', '#FFFFD9',
  // Greens
  '#00FF00', '#33FF33', '#66FF66', '#99FF99', '#CCFFCC', '#004D00',
  '#006600', '#008000', '#009900', '#00B300', '#00CC00', '#00E600',
  // Blues
  '#0000FF', '#1A1AFF', '#3333FF', '#4D4DFF', '#6666FF', '#8080FF',
  '#9999FF', '#B3B3FF', '#000099', '#0000B3', '#0000CC', '#0000E6',
  // Purples
  '#4B0082', '#663399', '#800080', '#9932CC', '#9400D3', '#8B008B',
  '#9370DB', '#BA55D3', '#DDA0DD', '#EE82EE', '#FF00FF', '#DA70D6',
  // ... (more colors omitted for brevity)
];

const generateMonochromeColor = () => {
  // 70% chance of pure black or white
  if (Math.random() < 0.7) {
    return Math.random() < 0.5 ? '#000000' : '#FFFFFF';
  }
  // 30% chance of a grayscale color
  const value = Math.floor(Math.random() * 256);
  return `#${value.toString(16).padStart(2, '0').repeat(3)}`;
};

const generatePureBWColor = () => {
  return Math.random() < 0.5 ? '#000000' : '#FFFFFF';
};

const randomColor = (colorMode: 'normal' | 'monochrome' | 'bw' = 'normal') => {
  switch (colorMode) {
    case 'bw':
      return generatePureBWColor();
    case 'monochrome':
      return generateMonochromeColor();
    default:
      if (Math.random() < 0.2) {
        return generateRandomHex();
      }
      return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  }
};

// Generate a random design
const generateDesign = (clickCount: number): Design => {
  const shapes: Shape[] = [];
  const baseShapes = Math.floor(Math.random() * 5) + 3;
  const numShapes = baseShapes + (clickCount - 1) * (Math.floor(Math.random() * 6) + 5);
  
  const colorMode = (() => {
    const rand = Math.random();
    console.log('Color mode random value:', rand);
    if (rand < 0.15) {
      console.log('Selected monochrome mode');
      return 'monochrome';       // 0.00 to 0.15 = monochrome
    }
    if (rand < 0.25) {
      console.log('Selected black and white mode');
      return 'bw';               // 0.15 to 0.25 = bw
    }
    console.log('Selected normal color mode');
    return 'normal';            // 0.25 to 1.00 = normal
  })();

  // 20% chance to add a grid of vertical lines
  if (Math.random() < 0.2) {
    const numLines = 128;
    const spacing = 512 / numLines;
    for (let i = 0; i < numLines; i++) {
      shapes.push({
        type: 'line',
        x: i * spacing,
        y: 0,
        size: 1920, // Full height
        color: randomColor(colorMode),
        rotation: 0
      });
    }
  }

  // Add regular shapes
  for (let i = 0; i < numShapes; i++) {
    shapes.push({
      type: (() => {
        const shapes = ['circle', 'rect', 'line', 'triangle', 'squiggle'];
        return shapes[Math.floor(Math.random() * shapes.length)] as Shape['type'];
      })(),
      x: Math.random() * 512,
      y: Math.random() * 1920,
      size: Math.random() * 128 + 1,
      color: randomColor(colorMode),
      rotation: Math.random() * 360
    });
  }

  return {
    id: Math.random().toString(16).slice(2),
    shapes,
    filters: [{  // Single stable filter
      type: 'saturate',
      parameters: {
        seed: Math.random(),  // This will be fixed when design is created
        intensity: 0.8        // Using a fixed value for stability
      }
    }]
  };
};

const emptyDesign: Design = {
  id: '',
  shapes: [],
  filters: []
};

export default function ArtGrid({ roomId }: ArtGridProps) {
  const [users, setUsers] = useState<string[]>([]);
  const [designs, setDesigns] = useState<Record<string, Design>>({});
  const [clickCount, setClickCount] = useState(1);
  const [count, setCount] = useState(0);
  const durableObjectName = 'x0y0_v0';

  const socket = usePartySocket({
    room: roomId,
    onMessage(event) {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'init':
          setUsers(data.users);
          setDesigns(data.designs);
          break;
        case 'users':
          setUsers(data.users);
          break;
        case 'designs':
          setDesigns(data.designs);
          break;
      }
    }
  });

  const fetchCount = async () => {
    try {
      const response = await fetch(`https://s-count.adam-f8f.workers.dev/?name=${durableObjectName}`);
      const data = await response.text();
      setCount(parseInt(data, 10));
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const handleIncrement = async () => {
    try {
      await fetch(`https://s-count.adam-f8f.workers.dev/increment?name=${durableObjectName}`, {
        method: 'POST',
      });
      fetchCount(); // Update count after increment
    } catch (error) {
      console.error('Error incrementing count:', error);
    }
  };

  const handleCanvasClick = async (userId: string) => {
    if (userId === socket.id) {
      setClickCount(prev => prev + 1);
      const newDesign = generateDesign(clickCount);
      socket.send(JSON.stringify({
        type: 'update_design',
        design: newDesign
      }));
      await handleIncrement(); // Add increment call
    }
  };

  // Only generate initial design for the current user when they first join
  useEffect(() => {
    if (users.includes(socket.id) && !designs[socket.id]) {
      const newDesign = generateDesign(1);
      socket.send(JSON.stringify({
        type: 'update_design',
        design: newDesign
      }));
    }
  }, [users, socket.id]);

  // Add useEffect for initial count fetch
  useEffect(() => {
    fetchCount();
  }, []);

  return (
    <div style={{ display: 'flex', flexWrap: 'none', height: '100%', position: 'relative' }}>
      {users.map(userId => (
        <div key={userId} style={{ width: '100%', alignItems: 'stretch', position: 'relative' }}>
          <SVGCanvas
            design={designs[userId] || emptyDesign}
            isActive={userId === socket.id}
            onClick={() => handleCanvasClick(userId)}
          />
          <div style={{ position: 'absolute', bottom: '8px', right: 0, left: 0, textAlign: 'center', marginTop: '0.5rem', fontSize: '10px' }}>
            <code>{userId.slice(0, 6)}</code>
            {userId === socket.id && <b> You</b>}
          </div>
         
        </div>
      ))}
       <small style={{ position: 'absolute', top: '8px', right: '8px' }}>{count}</small>
    </div>
  );
}
