function cleanEnvVar(value) {
  return value.replace(/^"(.*)"$/, "$1"); // Removes extra double quotes
}

const config = {
  backendEndpoint: cleanEnvVar(import.meta.env.VITE_BACKEND_URL || ""),
};


export default config;