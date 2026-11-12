const Folder = require('../models/folder.model');
const File = require('../models/file.model');
const Activity = require('../models/activity.model');

// Create a new folder
exports.createFolder = async (req, res) => {
  try {
    const { name, parentPath = '/', color = 'indigo' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const cleanName = name.trim().replace(/[/\\?%*:|"<>]/g, '-');
    const cleanParent = (parentPath || '/').trim();
    const fullPath = cleanParent === '/' ? `/${cleanName}` : `${cleanParent}/${cleanName}`;

    // Check if folder already exists
    const existing = await Folder.findOne({ user: req.user._id, path: fullPath });
    if (existing) {
      return res.status(400).json({ message: 'A folder with this name already exists in this directory' });
    }

    const folder = await Folder.create({
      user: req.user._id,
      name: cleanName,
      path: fullPath,
      parentPath: cleanParent,
      color
    });

    await Activity.create({
      user: req.user._id,
      action: 'FOLDER_CREATED',
      targetName: cleanName,
      details: `Created folder ${fullPath}`
    }).catch(() => {});

    res.status(201).json({ message: 'Folder created successfully', folder });
  } catch (error) {
    console.error('Create Folder Error:', error);
    res.status(500).json({ message: 'Failed to create folder' });
  }
};

// List all user folders
exports.listFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user._id });
    res.json(folders);
  } catch (error) {
    console.error('List Folders Error:', error);
    res.status(500).json({ message: 'Failed to list folders' });
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, user: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const folderPath = folder.path;

    // Move files in this folder to Trash
    const regex = new RegExp(`^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|/)`);
    const files = await File.find({ user: req.user._id, isTrashed: false });
    
    for (const f of files) {
      if (regex.test(f.folder || '/')) {
        f.isTrashed = true;
        f.trashedAt = new Date().toISOString();
        await f.save();
      }
    }

    // Delete subfolders as well
    const allFolders = await Folder.find({ user: req.user._id });
    for (const sub of allFolders) {
      if (regex.test(sub.path)) {
        await Folder.findByIdAndDelete(sub._id);
      }
    }

    await Folder.findByIdAndDelete(folder._id);

    await Activity.create({
      user: req.user._id,
      action: 'FOLDER_DELETED',
      targetName: folder.name,
      details: `Deleted folder ${folderPath}`
    }).catch(() => {});

    res.json({ message: `Folder "${folder.name}" deleted` });
  } catch (error) {
    console.error('Delete Folder Error:', error);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
};

