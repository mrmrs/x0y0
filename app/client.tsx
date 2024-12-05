import "./styles.css";
import { createRoot } from "react-dom/client";
import ArtGrid from "./components/ArtGrid";

function App() {
  return (
    <main style={{ height: '100%'}}>
      <ArtGrid roomId="art-room-1" />
    </main>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
