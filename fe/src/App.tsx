import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store";
import { AppRoutes } from "./routes";

/**
 * App - Root node of the restaurant application.
 * Wraps children with Redux state container and Router navigation bindings.
 */
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}

