import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { UploadCloud, ChevronRight, Home, Trash2 } from "lucide-react";
import MediaCard from "../components/MediaCard";
import FolderCard from "../components/FolderCard";
import UploadModal from "../components/UploadModal";
import { getMediaList, deleteMedia, deleteFolder } from "../services/mediaService.js";

const Dashboard = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [allMedia, setAllMedia] = useState([]);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(""); // Breadcrumb navigation
  const [filterType, setFilterType] = useState("All"); // Image/Video toggle
  const [folderFilter, setFolderFilter] = useState("All"); // Dropdown filter

  const user = useSelector((state) => state.auth.userData);
  const filterButtons = ["All", "Image", "Video"];

  const fetchMedia = async () => {
    setIsMediaLoading(true);
    try {
      const media = (await getMediaList("All", "All")) || [];
      setAllMedia(media);
    } catch (err) {
      console.error("Failed to fetch media:", err);
      setAllMedia([]);
    } finally {
      setIsMediaLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDeleteFile = async (id) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteMedia(id);
      setAllMedia((prev) => prev.filter((m) => m && m._id !== id));
    } catch (err) {
      alert("Failed to delete file: " + err.message);
    }
  };

  const handleDeleteFolder = async (folderPath) => {
    if (!window.confirm(`Are you sure you want to delete the folder "${folderPath}" and ALL files inside it?`)) return;
    try {
      await deleteFolder(folderPath);
      const folderRegex = new RegExp(`^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|/)`);
      setAllMedia((prev) => prev.filter((m) => !folderRegex.test(m.folder || "Default")));
      if (currentPath.startsWith(folderPath)) setCurrentPath("");
    } catch (err) {
      alert("Failed to delete folder: " + err.message);
    }
  };

  // --- Logic for Folders & Filtering ---

  // Unique folders for the dropdown
  const uniqueFoldersList = Array.from(new Set(allMedia.map(m => m.folder || "Default"))).sort();

  // 1. Determine which files to show based on FOLDER filter vs PATH navigation
  const filesToDisplay = (() => {
    if (folderFilter === "All") {
      // Show files in the current hierarchical path
      return allMedia.filter(m => {
        const f = m.folder || "Default";
        return currentPath === "" ? f === "Default" : f === currentPath;
      });
    } else {
      // Just filter by the folder selected in dropdown across the whole app
      return allMedia.filter(m => (m.folder || "Default") === folderFilter);
    }
  })();

  // 2. Filter the result by the TYPE buttons (Image/Video)
  const filteredMedia = filesToDisplay.filter(m => {
    if (filterType === "All") return true;
    return m.file_type === filterType || m.file_mimetype?.startsWith(filterType.toLowerCase() + "/");
  });

  // 3. Direct Subfolders always follow the current path (Navigation logic)
  const subfolders = (() => {
    const foldersSet = new Set();
    const prefix = currentPath === "" ? "" : currentPath + "/";
    allMedia.forEach(m => {
      const f = m.folder || "Default";
      if (f === "Default" || f === currentPath) return;

      if (currentPath === "") {
        if (!f.includes("/")) foldersSet.add(f);
        else foldersSet.add(f.split("/")[0]);
      } else if (f.startsWith(prefix)) {
        const sub = f.slice(prefix.length).split("/")[0];
        foldersSet.add(prefix + sub);
      }
    });
    return Array.from(foldersSet).sort();
  })();

  const images = filteredMedia.filter(m => m.file_type === "Image" || m.file_mimetype?.startsWith("image/"));
  const videos = filteredMedia.filter(m => m.file_type === "Video" || m.file_mimetype?.startsWith("video/"));
  const others = filteredMedia.filter(m => !images.includes(m) && !videos.includes(m));

  const pathSegments = currentPath === "" ? [] : currentPath.split("/");

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <h2 className="text-3xl font-extrabold text-gray-900">
        {user?.name || user?.email}'s Media Dashboard
      </h2>

      {/* 🏠 Breadcrumbs (Navigation) */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 px-4 flex items-center space-x-2 text-gray-500 shadow-sm overflow-x-auto">
        <div 
          className="flex items-center cursor-pointer hover:text-teal-600 transition shrink-0" 
          onClick={() => { setCurrentPath(""); setFolderFilter("All"); }}
        >
          <Home className={`w-4 h-4 mr-1 ${currentPath === "" ? "text-teal-600" : ""}`} />
          <span className={currentPath === "" ? "text-teal-600 font-semibold" : ""}>Root</span>
        </div>
        {pathSegments.map((seg, idx) => {
          const p = pathSegments.slice(0, idx + 1).join("/");
          return (
            <div key={p} className="flex items-center shrink-0">
              <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
              <span 
                className={`cursor-pointer hover:text-teal-600 transition ${idx === pathSegments.length - 1 ? "text-gray-900 font-semibold" : ""}`} 
                onClick={() => { setCurrentPath(p); setFolderFilter("All"); }}
              >
                {seg}
              </span>
            </div>
          );
        })}
      </div>

      {/* ☁️ Toolbar Container (Filtering) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <button onClick={() => setShowUploadModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg shadow-teal-300/50 flex items-center space-x-2 shrink-0">
          <UploadCloud className="w-5 h-5" />
          <span>Upload to {currentPath === "" ? "Root" : pathSegments[pathSegments.length - 1]}</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {filterButtons.map((btn) => (
              <button
                key={btn}
                onClick={() => setFilterType(btn)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  filterType === btn ? "bg-teal-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none hover:bg-gray-50 transition cursor-pointer"
          >
            <option value="All">Filter by Folder...</option>
            {uniqueFoldersList.filter(f => f !== "Default").map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 📁 Content Header */}
      <h3 className="text-2xl font-bold text-gray-800">
        {currentPath === "" ? "Folder Contents" : pathSegments[pathSegments.length - 1]} ({filteredMedia.length})
      </h3>

      {isMediaLoading ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Syncing with your cloud storage...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 📂 Folders Section - only show in Normal Navigation Mode (No filters active) */}
          {subfolders.length > 0 && folderFilter === "All" && filterType === "All" && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-600 px-1 border-l-4 border-amber-400 pl-3">Subfolders</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-8 py-4">
                {subfolders.map((p) => (
                  <FolderCard key={p} name={p.split("/").pop()} onClick={() => { setCurrentPath(p); setFolderFilter("All"); }} onDelete={() => handleDeleteFolder(p)} />
                ))}
              </div>
            </div>
          )}

          {/* 🖼️ Images Section */}
          {images.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-600 px-1 border-l-4 border-blue-400 pl-3">Images ({images.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {images.map((m) => <MediaCard key={m._id} media={m} onDelete={handleDeleteFile} />)}
              </div>
            </div>
          )}

          {/* 🎥 Videos Section */}
          {videos.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-600 px-1 border-l-4 border-red-400 pl-3">Videos ({videos.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {videos.map((m) => <MediaCard key={m._id} media={m} onDelete={handleDeleteFile} />)}
              </div>
            </div>
          )}

          {/* 📄 Other Files Section */}
          {others.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-600 px-1 border-l-4 border-gray-400 pl-3">Other Files ({others.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {others.map((m) => <MediaCard key={m._id} media={m} onDelete={handleDeleteFile} />)}
              </div>
            </div>
          )}

          {(subfolders.length === 0 && filteredMedia.length === 0) && (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">Nothing found here</p>
            </div>
          )}
        </div>
      )}

      {showUploadModal && <UploadModal initialFolder={currentPath === "" ? "Default" : currentPath} onClose={() => setShowUploadModal(false)} onUpload={fetchMedia} />}
    </div>
  );
};

export default Dashboard;