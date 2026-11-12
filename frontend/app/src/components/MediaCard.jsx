import { Trash2 } from "lucide-react";

const MediaCard = ({ media, onDelete }) => {
  const isImage = media.file_type === "Image";
  const formattedDate = new Date(media.createdAt || media.updatedAt || Date.now()).toLocaleDateString();

  const getPlaceholderIcon = () => {
    const imageUrl = media.file_location || (media.file_key ? `/uploads/${media.file_key.split('/').pop()}` : null);
    if (!isImage) {
      return <div className="text-gray-500 text-sm">Video Preview Unavailable</div>;
    }

    return (
      <img
        src={imageUrl}
        alt={media.file_name}
        className="object-cover w-full h-full"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "/image-placeholder.png";
        }}
      />
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
      <div className="relative h-48 bg-gray-200 flex items-center justify-center">
        {getPlaceholderIcon()}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {(media.file_relative_path || media.file_name).split('/').pop()}
          </p>
          <span className="text-xs text-gray-500">
            {media.file_type} • {formattedDate} • {media.folder || "Default"}
          </span>
        </div>

        <div className="flex space-x-2">
          <a
            href={media.file_location}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg transition duration-200"
          >
            View
          </a>
          <button
            onClick={() => onDelete(media._id)}
            className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition duration-200"
            title="Delete from S3 and Database"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;