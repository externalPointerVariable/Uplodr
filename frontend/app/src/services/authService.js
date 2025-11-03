import config from "../config/config";

export async function registerUser({ name, email, password }) {
  const res = await fetch(`${config.backendEndpoint}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Registration failed");
  }

  const data = await res.json();
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

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Login failed");
  }

  const data = await res.json();
  localStorage.setItem("token", data.token);
  return data;
}