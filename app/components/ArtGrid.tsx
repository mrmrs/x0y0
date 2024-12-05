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

// Helper function to generate random colors
const randomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generate a random design
const generateDesign = (clickCount: number): Design => {
  const shapes: Shape[] = [];
  const baseShapes = Math.floor(Math.random() * 5) + 3; // 3-7 shapes
  const numShapes = baseShapes + (clickCount - 1) * (Math.floor(Math.random() * 6) + 5); // Add 5-10 shapes per click

  for (let i = 0; i < numShapes; i++) {
    shapes.push({
      type: (() => {
        const shapes = ['circle', 'rect', 'line', 'triangle', 'squiggle'];
        return shapes[Math.floor(Math.random() * shapes.length)] as Shape['type'];
      })(),
      x: Math.random() * 512,
      y: Math.random() * 1920,
      size: Math.random() * 128 + 1, // size between 10-40
      color: randomColor(),
      rotation: Math.random() * 360
    });
  }

  return {
    id: Math.random().toString(16).slice(2),
    shapes,
    filters: Array(numShapes).fill(null).map((_, i) => ({
      type: 'complex',
      parameters: {
        seed: Math.random(),
        intensity: Math.random() * 0.8 + 0.2
      }
    }))
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

  const handleCanvasClick = (userId: string) => {
    if (userId === socket.id) {
      setClickCount(prev => prev + 1);
      const newDesign = generateDesign(clickCount);
      socket.send(JSON.stringify({
        type: 'update_design',
        design: newDesign
      }));
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

  return (
    <div style={{ display: 'flex', flexWrap: 'none', background: 'orange', height: '100%' }}>
      {users.map(userId => (
        <div key={userId} style={{ width: '100%', alignItems: 'stretch', position: 'relative' }}>
          <SVGCanvas
            design={designs[userId] || emptyDesign}
            isActive={userId === socket.id}
            onClick={() => handleCanvasClick(userId)}
          />
          <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, textAlign: 'center', marginTop: '0.5rem', fontSize: '10px' }}>
            User: {userId.slice(0, 6)}
            {userId === socket.id && ' (You)'}
          </div>
        </div>
      ))}
    </div>
  );
}
