import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import { getPasswordPolicyError } from "../../utils/passwordPolicy";

export default function ForcePasswordChange() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const passwordError = getPasswordPolicyError(newPassword, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword({ oldPassword, newPassword, confirmPassword });
      navigate(location.state?.destinationPath || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-afmc-bg px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800">Update your password</h1>
        <p className="text-sm text-gray-600">
          You must choose a new password before continuing. Use at least 12 characters.
        </p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <label className="block text-sm font-medium text-gray-700">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-afmc-maroon px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
