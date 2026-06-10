import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import MapView from './components/MapView';

export default function App() {
  return (
    <div className="h-full w-full flex flex-col">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/cvs" replace />} />
          <Route path="/cvs" element={<MapView mode="cvs" />} />
          <Route path="/dorm" element={<MapView mode="dorm" />} />
          <Route path="*" element={<Navigate to="/cvs" replace />} />
        </Routes>
      </main>
    </div>
  );
}
