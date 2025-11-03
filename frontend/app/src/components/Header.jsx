import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/authSlice.js";

const Header = () => {
  const dispatch = useDispatch();
  const authStatus = useSelector((state) => state.auth.status);
  const user = useSelector((state) => state.auth.userData);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="bg-gray-800 text-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto p-4 flex justify-between items-center flex-wrap">
        <h1 className="text-2xl font-extrabold text-teal-400">
          Up<span className="text-white">Lodr</span>
        </h1>
        {authStatus && user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium hidden sm:inline">
              Welcome, {user.name || user.email}!
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition duration-200"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="text-sm">
            <span className="text-gray-400">Media Manager</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;