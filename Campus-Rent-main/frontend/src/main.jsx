import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";
import { ListingProvider } from "./context/ListingContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ListingProvider>
          <BookingProvider>
            <App />
          </BookingProvider>
        </ListingProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
