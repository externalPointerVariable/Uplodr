import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { UploadCloud } from "lucide-react";
import MediaCard from "../components/MediaCard";
import UploadModal from "../components/UploadModal";
import { getMediaList } from "../services/api";

const Dashboard = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [filterType, setFilterType] = useState("All");

  const user = useSelector((state) => state.auth.userData);
  const filterButtons = ["All", "Image", "Video"];

  useEffect(() => {
    const fetchMedia = async () => {
      setIsMediaLoading(true);
      try {
        const res = await getMediaList(filterType);
        setMediaList(res.data || []);
      } catch (err) {
        console.error("Failed to fetch media:", err);
        setMediaList([]);
      } finally {
        setIsMediaLoading(false);
      }
    };

    fetchMedia();
  }, [filterType]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
        {user?.name || user?.email}'s Media Dashboard
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-4 bg-white rounded-xl shadow-md border border-gray-200">
        <button
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-teal-300/50 shadow-lg flex items-center justify-center space-x-2"
        >
          <UploadCloud className="w-5 h-5" />
          <span>Upload New File</span>
        </button>

        <div className="flex flex-wrap space-x-2 w-full sm:w-auto">
          {filterButtons.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === type
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        {filterType} ({mediaList.length})
      </h3>

      {isMediaLoading ? (
        <div className="text-center p-10 bg-white rounded-xl shadow-md">
          <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your media files...</p>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-xl shadow-md border border-gray-200">
          <p className="text-xl text-gray-500">
            You haven't uploaded any{" "}
            {filterType !== "All"
              ? filterType.toLowerCase() + " files"
              : "media"}{" "}
            yet.
          </p>
          <p className="mt-2 text-gray-400">
            Click "Upload New File" to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {mediaList.map((media) => (
            <MediaCard key={media._id} media={media} />
          ))}
        </div>
      )}

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
};

export default Dashboard;