import { Folder, Trash2 } from "lucide-react";

const FolderCard = ({ name, onClick, onDelete }) => {
  return (
    <div className="flex flex-col items-center group">
      <div
        onClick={onClick}
        className="cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <Folder
          className="w-24 h-24 text-amber-500 fill-amber-50"
          strokeWidth={1.5}
        />
      </div>

      <p className="mt-2 text-sm text-gray-700 font-medium truncate w-32 text-center" title={name}>
        {name}
      </p>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="mt-3 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100"
          title={`Delete folder ${name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default FolderCard;
