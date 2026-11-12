import config from "../config/config";

// ✅ UPLOAD
export async function uploadMedia(file, folder, relativePath) {
  const token = localStorage.getItem("token");

  const formData = new FormData();
  formData.append("media", file);
  formData.append("folder", folder || "Default");
  formData.append("relativePath", relativePath || file.name);

  const res = await fetch(`${config.backendEndpoint}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.message || `Upload failed (${res.status})`);
  }

  return data?.media || data;
}

// ✅ LIST
export async function getMediaList(filterType = "All", folder = "All") {
  const token = localStorage.getItem("token");

  const queryParams = [];
  if (folder && folder !== "All") {
    queryParams.push(`folder=${encodeURIComponent(folder)}`);
  }

  const url = `${config.backendEndpoint}/media${queryParams.length ? `?${queryParams.join("&")}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : [];
  } catch (parseError) {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch media");
  }

  return filterType === "All"
    ? data
    : data.filter((item) =>
        (item.file_type || "").toLowerCase().includes(filterType.toLowerCase())
      );
}

// ✅ DELETE
export async function deleteMedia(id) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${config.backendEndpoint}/media/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.message || "Delete failed");
  }

  return data;
}

export async function deleteFolder(folderName) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${config.backendEndpoint}/media/folder?folder=${encodeURIComponent(folderName)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.message || "Delete folder failed");
  }

  return data;
}
