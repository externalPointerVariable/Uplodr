import config from "../config/config";

export async function registerUser({ name, email, password }) {
  const res = await fetch(`${config.backendEndpoint}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error("Server did not return valid JSON");
  }

  if (!res.ok) {
    throw new Error(data.message || "Registration failed");
  }

  localStorage.setItem("token", data.token);
  return data;
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${config.backendEndpoint}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error("Server did not return valid JSON");
  }

  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  localStorage.setItem("token", data.token);
  return data;
}