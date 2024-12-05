import type * as Party from "partykit/server";

interface Design {
  shapes: Array<any>;
  filters: Array<any>;
}

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}
  
  // Store connected clients and their data
  connections = new Map<string, WebSocket>();
  designs: Record<string, Design> = {};

  async onConnect(conn: Party.Connection) {
    // Store new connection
    this.connections.set(conn.id, conn);
    
    // Send current state to new connection
    conn.send(JSON.stringify({
      type: 'init',
      designs: this.designs,
      users: Array.from(this.connections.keys())
    }));
    
    // Broadcast updated users list to all clients
    this.broadcastConnections();
  }

  async onClose(conn: Party.Connection) {
    // Remove disconnected user
    this.connections.delete(conn.id);
    
    // Broadcast updated users list to all clients
    this.broadcastConnections();
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'update_design':
          this.designs[sender.id] = data.design;
          this.broadcastDesigns();
          break;
        // Add other message type handlers as needed
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  }

  private broadcastConnections() {
    const message = JSON.stringify({
      type: 'users',
      users: Array.from(this.connections.keys())
    });
    
    this.room.broadcast(message);
  }

  private broadcastDesigns() {
    const message = JSON.stringify({
      type: 'designs',
      designs: this.designs
    });
    
    this.room.broadcast(message);
  }
}

Server satisfies Party.Worker;
