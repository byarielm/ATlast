import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';

/**
 * Application Router
 * Handles all routing for the application
 */
export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app route */}
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
