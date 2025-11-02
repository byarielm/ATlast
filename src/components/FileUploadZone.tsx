import { Upload } from "lucide-react";
import { RefObject } from "react";

interface FileUploadZoneProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
}

export default function FileUploadZone({ onFileChange, fileInputRef }: FileUploadZoneProps) {
  return (
    <div>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-colors">
        <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" aria-hidden="true" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">Choose File</p>
        <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">TikTok Following.txt, Instagram HTML/JSON, or ZIP export</p>

        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept=".txt,.json,.html,.zip"
          onChange={onFileChange}
          className="sr-only"
          aria-label="Upload following data file"
        />

        <label
          htmlFor="file-upload"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              document.getElementById('file-upload')?.click();
            }
          }}
        >
          Browse Files
        </label>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          💡 <strong>How to get your data:</strong>
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-300 mt-2">
          <strong>TikTok:</strong> Profile → Settings → Account → Download your data → Upload Following.txt
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-300 mt-1">
          <strong>Instagram:</strong> Profile → Settings → Accounts Center → Your information and permissions → Download your information → Upload following.html
        </p>
      </div>
    </div>
  );
}