import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ExtensionImport from './pages/ExtensionImport';

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

        {/* Extension import route */}
        <Route path="/import/:importId" element={<ExtensionImport />} />
      </Routes>
    </BrowserRouter>
  );
}
