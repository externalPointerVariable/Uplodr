import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import AuthForm from "./components/AuthForm";

const App = () => {
  const isAuthenticated = useSelector((state) => state.auth.status);
  const [currentView, setCurrentView] = useState(window.location.hash || "#login");

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash || "#login");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  let Content;

  if (isAuthenticated) {
    Content = <Dashboard />;
  } else {
    Content = currentView === "#register"
      ? <AuthForm type="register" />
      : <AuthForm type="login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>
      <Header />
      <main className="pb-10">
        {Content}
      </main>
    </div>
  );
};

export default App;