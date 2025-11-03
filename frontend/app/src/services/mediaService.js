import config from "../config/config";

export async function uploadMedia(file) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("media", file);

  const res = await fetch(`${config.backendEndpoint}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Upload failed");
  }

  return res.json();
}

export async function getMediaList(filterType = "All") {
  const token = localStorage.getItem("token");

  const res = await fetch(`${config.backendEndpoint}/media/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch media");
  }

  const data = await res.json();
  return filterType === "All"
    ? data
    : data.filter((item) => item.file_type === filterType);
}

export async function deleteMedia(id) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${config.backendEndpoint}/media/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Delete failed");
  }

  return res.json();
}