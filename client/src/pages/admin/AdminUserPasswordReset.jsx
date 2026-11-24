import React, { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { userAPI } from "../../services/api";
import { getPasswordPolicyError } from "../../utils/passwordPolicy";

export default function AdminUserPasswordReset() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        setLoadingUser(true);
        const response = await userAPI.getById(id);
        if (active) {
          setUserName(response.data?.data?.USER_NAME || "");
        }
      } catch (loadError) {
        if (active) {
          const message =
            loadError.response?.data?.message || "Unable to load user details.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoadingUser(false);
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("New password and confirm password are required.");
      return;
    }

    const passwordError = getPasswordPolicyError(newPassword, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setSaving(true);
      const response = await userAPI.resetPassword(id, {
        newPassword,
        confirmPassword,
      });
      const message =
        response.data?.message || "User password reset successfully.";
      setSuccess(message);
      toast.success(message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      const message =
        resetError.response?.data?.message || "Unable to reset user password.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-x-hidden bg-gradient-to-br from-afmc-bg via-white to-afmc-bg2">
      <div className="absolute left-12 top-16 h-72 w-72 rounded-full bg-afmc-maroon/10 blur-3xl" />
      <div className="absolute bottom-20 right-20 h-80 w-80 rounded-full bg-afmc-maroon2/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl px-3 py-4 sm:px-4 md:px-6 md:py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 sm:text-2xl">
              Reset Password
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Set a new password for this user. The existing password is never shown.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/60 bg-white px-4 py-2 text-sm text-gray-700 shadow transition hover:shadow-md"
          >
            <ArrowLeft size={16} />
            Back To Users
          </button>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-xl backdrop-blur-sm sm:rounded-3xl sm:p-6">
          {loadingUser ? (
            <div className="py-12 text-center text-gray-500">
              Loading user details...
            </div>
          ) : error && !userName ? (
            <div>
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-afmc-gold/25 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  User Name
                </p>
                <p className="mt-1 font-medium text-gray-800">{userName}</p>
              </div>

              {success ? (
                <div
                  role="status"
                  className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                >
                  {success}
                </div>
              ) : null}
              {error ? (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="admin-reset-new-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    New Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <KeyRound size={17} className="shrink-0 text-gray-400" />
                    <input
                      id="admin-reset-new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={6}
                      maxLength={72}
                      autoComplete="new-password"
                      required
                      disabled={saving}
                      placeholder="Enter new password"
                      className="w-full bg-transparent text-gray-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      className="text-gray-500 hover:text-afmc-maroon"
                    >
                      {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-reset-confirm-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <KeyRound size={17} className="shrink-0 text-gray-400" />
                    <input
                      id="admin-reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={6}
                      maxLength={72}
                      autoComplete="new-password"
                      required
                      disabled={saving}
                      placeholder="Confirm new password"
                      className="w-full bg-transparent text-gray-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((visible) => !visible)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="text-gray-500 hover:text-afmc-maroon"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-afmc-maroon px-5 py-3 font-semibold text-white shadow-afmc transition hover:bg-afmc-maroon2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <KeyRound size={17} />
                  {saving ? "Resetting Password..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
