import { Upload } from "lucide-react";
import AppHeader from "../components/AppHeader";
import PlatformSelector from "../components/PlatformSelector";
import FileUploadZone from "../components/FileUploadZone";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface HomePageProps {
  session: atprotoSession | null;
  onLogout: () => void;
  onNavigate: (step: 'home' | 'login') => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentStep: string;
}

export default function HomePage({ session, onLogout, onNavigate, onFileUpload, currentStep }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AppHeader session={session} onLogout={onLogout} onNavigate={onNavigate} currentStep={currentStep} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Upload Following Data
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload your exported data from any platform to find matches on the ATmosphere
          </p>
  
          <PlatformSelector />
          <FileUploadZone onFileChange={onFileUpload} />
        </div>
      </div>
    </div>
  );
}