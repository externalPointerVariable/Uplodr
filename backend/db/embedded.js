const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'saas_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let dbState = {
  users: [],
  files: [],
  folders: [],
  shares: [],
  apikeys: [],
  activities: []
};

// Load database from file
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      if (raw.trim()) {
        dbState = { ...dbState, ...JSON.parse(raw) };
      }
    } else {
      saveDB();
    }
  } catch (err) {
    console.warn('⚠️ Error loading embedded database, initializing fresh state:', err.message);
    saveDB();
  }
}

// Save database to file atomically
let saveTimeout = null;
function saveDB(immediate = false) {
  const doSave = () => {
    try {
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(dbState, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('❌ Failed saving embedded database:', err.message);
    }
  };

  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    doSave();
  } else {
    if (!saveTimeout) {
      saveTimeout = setTimeout(() => {
        saveTimeout = null;
        doSave();
      }, 100);
    }
  }
}

loadDB();

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function matchesFilter(item, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(expected)) {
      const matched = expected.some((f) => matchesFilter(item, f));
      if (!matched) return false;
      continue;
    }

    if (key === '$and' && Array.isArray(expected)) {
      const matched = expected.every((f) => matchesFilter(item, f));
      if (!matched) return false;
      continue;
    }

    const val = item[key];

    if (expected && typeof expected === 'object' && !(expected instanceof RegExp)) {
      if ('$in' in expected && Array.isArray(expected.$in)) {
        const strVal = String(val);
        const inMatch = expected.$in.some((e) => String(e) === strVal);
        if (!inMatch) return false;
      }
      if ('$ne' in expected) {
        if (String(val) === String(expected.$ne)) return false;
      }
      if ('$regex' in expected) {
        const regex = expected.$regex instanceof RegExp 
          ? expected.$regex 
          : new RegExp(expected.$regex, expected.$options || '');
        if (!regex.test(String(val || ''))) return false;
      }
      if ('$gt' in expected && !(val > expected.$gt)) return false;
      if ('$gte' in expected && !(val >= expected.$gte)) return false;
      if ('$lt' in expected && !(val < expected.$lt)) return false;
      if ('$lte' in expected && !(val <= expected.$lte)) return false;
      if ('$exists' in expected) {
        const exists = val !== undefined && val !== null;
        if (exists !== expected.$exists) return false;
      }
    } else if (expected instanceof RegExp) {
      if (!expected.test(String(val || ''))) return false;
    } else {
      if (String(val) !== String(expected)) return false;
    }
  }

  return true;
}

class Query {
  constructor(collection, filter = {}) {
    this.collection = collection;
    this.filter = filter;
    this._sortCriteria = null;
    this._limitVal = null;
    this._skipVal = 0;
  }

  sort(criteria) {
    this._sortCriteria = criteria;
    return this;
  }

  limit(n) {
    this._limitVal = n;
    return this;
  }

  skip(n) {
    this._skipVal = n;
    return this;
  }

  select() {
    return this;
  }

  populate() {
    return this;
  }

  async exec() {
    let items = (dbState[this.collection] || []).filter((item) => matchesFilter(item, this.filter));

    // Cloning to avoid mutations
    items = items.map((i) => wrapDoc(this.collection, { ...i }));

    if (this._sortCriteria) {
      const keys = Object.keys(this._sortCriteria);
      items.sort((a, b) => {
        for (const k of keys) {
          const dir = this._sortCriteria[k] === -1 || this._sortCriteria[k] === 'desc' ? -1 : 1;
          const valA = a[k] instanceof Date ? a[k].getTime() : a[k];
          const valB = b[k] instanceof Date ? b[k].getTime() : b[k];
          if (valA < valB) return -1 * dir;
          if (valA > valB) return 1 * dir;
        }
        return 0;
      });
    }

    if (this._skipVal > 0) {
      items = items.slice(this._skipVal);
    }

    if (this._limitVal !== null && this._limitVal >= 0) {
      items = items.slice(0, this._limitVal);
    }

    return items;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

function wrapDoc(collectionName, doc) {
  if (!doc) return null;
  const wrapped = { ...doc };
  wrapped._id = String(doc._id);
  wrapped.id = String(doc._id);

  wrapped.save = async function () {
    const list = dbState[collectionName];
    const index = list.findIndex((i) => String(i._id) === String(wrapped._id));
    wrapped.updatedAt = new Date().toISOString();
    if (index >= 0) {
      list[index] = { ...wrapped };
    } else {
      list.push({ ...wrapped });
    }
    saveDB();
    return wrapDoc(collectionName, wrapped);
  };

  wrapped.toObject = function () {
    return { ...this };
  };

  wrapped.toJSON = function () {
    return { ...this };
  };

  return wrapped;
}

function createModel(collectionName) {
  if (!dbState[collectionName]) {
    dbState[collectionName] = [];
  }

  return {
    find(filter = {}) {
      return new Query(collectionName, filter);
    },

    async findOne(filter = {}) {
      const items = (dbState[collectionName] || []).filter((item) => matchesFilter(item, filter));
      if (!items.length) return null;
      return wrapDoc(collectionName, { ...items[0] });
    },

    async findById(id) {
      if (!id) return null;
      const items = (dbState[collectionName] || []).filter((item) => String(item._id) === String(id));
      if (!items.length) return null;
      return wrapDoc(collectionName, { ...items[0] });
    },

    async findByIdAndUpdate(id, update, options = {}) {
      const items = dbState[collectionName] || [];
      const index = items.findIndex((item) => String(item._id) === String(id));
      if (index === -1) return null;

      let fieldsToUpdate = update;
      if (update.$set) {
        fieldsToUpdate = { ...update.$set };
      }
      if (update.$inc) {
        for (const [k, incVal] of Object.entries(update.$inc)) {
          items[index][k] = (items[index][k] || 0) + incVal;
        }
      }

      items[index] = {
        ...items[index],
        ...fieldsToUpdate,
        updatedAt: new Date().toISOString()
      };

      saveDB();
      return wrapDoc(collectionName, items[index]);
    },

    async findByIdAndDelete(id) {
      const items = dbState[collectionName] || [];
      const index = items.findIndex((item) => String(item._id) === String(id));
      if (index === -1) return null;
      const removed = items.splice(index, 1)[0];
      saveDB();
      return wrapDoc(collectionName, removed);
    },

    async create(docData) {
      const now = new Date().toISOString();
      const docs = Array.isArray(docData) ? docData : [docData];
      const created = [];

      for (const d of docs) {
        const item = {
          _id: d._id || generateId(),
          ...d,
          createdAt: d.createdAt || now,
          updatedAt: d.updatedAt || now
        };
        dbState[collectionName].push(item);
        created.push(wrapDoc(collectionName, item));
      }

      saveDB();
      return Array.isArray(docData) ? created : created[0];
    },

    async countDocuments(filter = {}) {
      const items = (dbState[collectionName] || []).filter((item) => matchesFilter(item, filter));
      return items.length;
    },

    async deleteMany(filter = {}) {
      const before = dbState[collectionName].length;
      dbState[collectionName] = dbState[collectionName].filter((item) => !matchesFilter(item, filter));
      const deletedCount = before - dbState[collectionName].length;
      saveDB();
      return { deletedCount };
    },

    async updateMany(filter = {}, update = {}) {
      let count = 0;
      const items = dbState[collectionName] || [];
      for (let i = 0; i < items.length; i++) {
        if (matchesFilter(items[i], filter)) {
          let fields = update;
          if (update.$set) fields = { ...update.$set };
          items[i] = { ...items[i], ...fields, updatedAt: new Date().toISOString() };
          count++;
        }
      }
      saveDB();
      return { modifiedCount: count };
    }
  };
}

module.exports = {
  createModel,
  dbState,
  saveDB,
  generateId
};

