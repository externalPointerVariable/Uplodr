function cleanEnvVar(value) {
  return typeof value === "string" ? value.replace(/^"(.*)"$/, "$1") : value;
}

const config = {
  backendEndpoint: cleanEnvVar(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api"),
};

export default config;