import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App";
import { CustomerDisplayView } from "./features/customer-display/CustomerDisplayView";

const isCustomerDisplay = window.location.hash === "#customer-display";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isCustomerDisplay ? <CustomerDisplayView /> : <App />}
  </React.StrictMode>,
);
