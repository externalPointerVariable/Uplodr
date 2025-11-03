import { useState, useEffect } from "react";
import { UploadCloud, X } from "lucide-react";
import { uploadMedia } from "../../services/api"; // adjust path if needed

const UploadModal = ({ onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadMedia(selectedFile); // your API call
      onUpload(res.data); // pass uploaded media back to parent
      onClose(); // close modal
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl p-6 rounded-xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold mb-4">Upload Media</h3>

        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="mb-4 w-full border border-gray-300 rounded-lg p-2"
        />

        {uploadError && (
          <p className="text-red-500 text-sm mb-4">{uploadError}</p>
        )}

        {previewUrl && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-semibold mb-2">File Preview:</h4>
            {selectedFile.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 object-contain mx-auto"
              />
            ) : (
              <div className="text-gray-500 text-sm">Video Preview Unavailable</div>
            )}
            <p className="mt-2 text-sm text-gray-600">
              Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB (Max 5MB)
            </p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isUploading && (
            <svg
              className="animate-spin h-5 w-5 text-white"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          )}
          <UploadCloud className="w-5 h-5" />
          <span>{isUploading ? "Uploading to S3..." : "Start Upload"}</span>
        </button>
      </div>
    </div>
  );
};

export default UploadModal;