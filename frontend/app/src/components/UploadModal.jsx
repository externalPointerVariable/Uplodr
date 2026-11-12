import { useRef } from "react";
import { useState, useEffect } from "react";
import { UploadCloud, X } from "lucide-react";
import { uploadMedia } from "../services/mediaService.js";

const UploadModal = ({ onClose, onUpload, initialFolder = "Default" }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [folderName, setFolderName] = useState(initialFolder);
  const [isFolderUpload, setIsFolderUpload] = useState(false);
  const fileInputRef = useRef(null); 

  useEffect(() => {
  setFolderName(initialFolder || "Default");
}, [initialFolder]);;
useEffect(() => {
  if (fileInputRef.current) {
    if (isFolderUpload) {
      fileInputRef.current.setAttribute("webkitdirectory", "");
      fileInputRef.current.setAttribute("directory", "");
    } else {
      fileInputRef.current.removeAttribute("webkitdirectory");
      fileInputRef.current.removeAttribute("directory");
    }
  }
}, [isFolderUpload]); 

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedFiles(files);
    setSelectedFile(files[0]);
    setUploadError(null);

    const preview = URL.createObjectURL(files[0]);
    setPreviewUrl(preview);

    // For folder upload, if folder name is still default, prefill with selected folder root name.
    if (isFolderUpload && files[0]?.webkitRelativePath) {
      const rootFolder = files[0].webkitRelativePath.split("/")[0];
      if (rootFolder && (!folderName || folderName.trim() === "" || folderName === "Default")) {
        setFolderName(rootFolder);
      }
    }
  };

  const handleUpload = async () => {
    const filesToUpload = selectedFiles.length ? selectedFiles : selectedFile ? [selectedFile] : [];
    if (!filesToUpload.length) return;

    const tooLarge = filesToUpload.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setUploadError(`File '${tooLarge.name}' exceeds 5MB limit.`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    let successCount = 0;
    const errors = [];

    for (const file of filesToUpload) {
      try {
        let finalFolder = folderName;
        
        // If it's a folder upload, calculate the relative sub-path
        if (isFolderUpload && file.webkitRelativePath) {
          const pathSegments = file.webkitRelativePath.split("/");
          if (pathSegments.length > 2) {
            // Remove the root folder name from the path and the filename at the end
            // e.g. "Root/Sub/file.txt" -> ["Root", "Sub", "file.txt"] -> "Sub"
            // Then prepend the user's chosen folderName
            const subPath = pathSegments.slice(1, -1).join("/");
            finalFolder = `${folderName}/${subPath}`;
          }
        }

        await uploadMedia(file, finalFolder, file.webkitRelativePath || file.name);
        successCount += 1;
      } catch (err) {
        errors.push(`${file.name}: ${err.message || 'Upload failed'}`);
      }
    }

    setIsUploading(false);

    if (errors.length) {
      setUploadError(`Some files failed: ${errors.join('; ')}`);
      setUploadSuccess(successCount ? `Uploaded ${successCount}/${filesToUpload.length} files to '${folderName}'` : null);
    } else {
      setUploadSuccess(`Uploaded ${successCount} file(s) to '${folderName}'`);
    }

    if (successCount > 0) {
      onUpload();
      setTimeout(() => {
        onClose();
      }, 1200);
    }

    return {
      successCount,
      errorCount: errors.length,
      errors,
    };
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

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Folder Name
        </label>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="e.g. Family, Travel, Work"
          className="mb-4 w-full border border-gray-300 rounded-lg p-2"
        />

        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={isFolderUpload}
            onChange={(e) => setIsFolderUpload(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Upload whole folder (select directory)</span>
        </label>

       <input
  ref={fileInputRef}
  type="file"
  onChange={handleFileChange}
  className="mb-4 w-full border border-gray-300 rounded-lg p-2"
  multiple
/>

        {uploadError && (
          <p className="text-red-500 text-sm mb-4">{uploadError}</p>
        )}

        {uploadSuccess && (
          <p className="text-green-600 text-sm mb-4">{uploadSuccess}</p>
        )}

        {isFolderUpload && selectedFiles.length > 0 && (
          <div className="text-gray-600 text-sm mb-4">
            <p>{selectedFiles.length} files selected</p>
            <p className="text-xs text-gray-500">
              {selectedFiles.slice(0, 10).map((file) => file.webkitRelativePath || file.name).join(", ")}
              {selectedFiles.length > 10 ? ` (+${selectedFiles.length - 10} more)` : ""}
            </p>
          </div>
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
          disabled={((selectedFiles.length === 0) && !selectedFile) || isUploading}
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