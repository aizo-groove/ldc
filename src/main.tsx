import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App";
import { CustomerDisplayView } from "./features/customer-display/CustomerDisplayView";
import { IS_DEMO, installDemoBackend } from "./demo";
import { DemoBanner } from "./demo/DemoBanner";

const isCustomerDisplay = window.location.hash === "#customer-display";

function render() {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      {isCustomerDisplay ? <CustomerDisplayView /> : <App />}
      {IS_DEMO && !isCustomerDisplay && <DemoBanner variant="floating" />}
    </React.StrictMode>,
  );
}

// Dans un navigateur (démo web), brancher le backend en mémoire avant le premier rendu.
if (IS_DEMO) {
  installDemoBackend().then(render);
} else {
  render();
}
