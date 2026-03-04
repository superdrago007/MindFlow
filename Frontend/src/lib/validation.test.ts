import { validateLoginForm, validateSignupForm } from "./validation";

describe("validation helpers", () => {
  it("validates required login fields", () => {
    expect(validateLoginForm({ username: "", password: "" })).toEqual({
      username: "Username is required.",
      password: "Password is required."
    });
  });

  it("accepts valid login payload", () => {
    expect(validateLoginForm({ username: "alice", password: "secret" })).toEqual({});
  });

  it("validates signup constraints", () => {
    expect(
      validateSignupForm({
        full_name: "A",
        username: "ab",
        email: "bad-mail",
        password: ""
      })
    ).toEqual({
      full_name: "Full name must be between 2 and 100 characters.",
      username: "Username must be between 3 and 30 characters.",
      email: "Enter a valid email address.",
      password: "Password is required."
    });
  });

  it("accepts valid signup payload", () => {
    expect(
      validateSignupForm({
        full_name: "Alice Example",
        username: "alice123",
        email: "alice@example.com",
        password: "secret"
      })
    ).toEqual({});
  });
});
