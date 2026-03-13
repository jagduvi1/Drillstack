import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

// Mock the auth context to render unauthenticated
vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() }),
}));

import App from "../App";

describe("App", () => {
  it("shows login page when not authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Training Bank")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("has a link to register page", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Register")).toBeInTheDocument();
  });
});
