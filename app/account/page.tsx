"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/Navbar";

type User = {
  name: string;
  surname: string;
  email: string;
};

export default function AccountPage() {
  const router = useRouter();

  // User state & profile form
  const [user, setUser] = useState<User>({
    name: "",
    surname: "",
    email: "",
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Change Email form state
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Delete Account confirmation
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // UI state
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("profile");

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          // No token, redirect to login
          router.push('/login');
          return;
        }

        const response = await fetch('/api/user', {
          headers: {
            'Authorization': 'Bearer ' + token,
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token is invalid, remove it and redirect to login
            localStorage.removeItem('token');
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        
        if (data.user) {
          const userData = {
            name: data.user.name || '',
            surname: data.user.surname || '',
            email: data.user.email || ''
          };
          setUser(userData);
          setName(userData.name + " " + userData.surname);
          setEmail(userData.email);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setMessage('Failed to load user data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Save profile changes handler
  const handleSaveProfile = async () => {
    setMessage(null);
    setIsSaving(true);
  
    if (!name.trim()) {
      setMessage("Name cannot be empty.");
      setIsSaving(false);
      return;
    }
  
    const parts = name.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" "); // support multi-part surnames
  
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          name: firstName,
          surname: lastName,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
  
      const data = await response.json();
      setUser(prev => ({ ...prev, name: firstName, surname: lastName }));
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  

  // Save email changes handler
  const handleChangeEmail = async () => {
    setMessage(null);

    if (!newEmail.trim() || !confirmEmail.trim()) {
      setMessage("New email fields cannot be empty.");
      return;
    }
    if (newEmail !== confirmEmail) {
      setMessage("New email and confirmation do not match.");
      return;
    }
    if (!currentPasswordForEmail.trim()) {
      setMessage("Please enter your current password.");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/change-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          currentPassword: currentPasswordForEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to update email');
      }

      setUser(prev => ({ ...prev, email: newEmail }));
      setEmail(newEmail);
      setNewEmail("");
      setConfirmEmail("");
      setCurrentPasswordForEmail("");
      setMessage("Email updated successfully!");
      setActiveSection("profile");
    } catch (error) {
      console.error('Error updating email:', error);
      setMessage(error instanceof Error ? error.message : "Failed to update email. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save password changes handler
  const handleChangePassword = async () => {
    setMessage(null);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setMessage("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("New password should be at least 6 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully!");
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage(error instanceof Error ? error.message : "Failed to change password. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!deleteConfirmed) {
      setMessage("Please confirm account deletion.");
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      localStorage.removeItem('token');
      alert("Account deleted successfully. Redirecting to homepage...");
      router.push("/");
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage("Failed to delete account. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while fetching user data
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-12">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading account information...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-12">
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Account Settings
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your profile, security, and account preferences
          </p>
        </div>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Sidebar navigation */}
          <div className="w-full md:w-64 bg-white rounded-2xl shadow-xl p-6 h-fit">
            <nav className="space-y-2">
              {[
                {
                  key: "profile",
                  label: "Profile",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ),
                },
                {
                  key: "email",
                  label: "Change Email",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  ),
                },
                {
                  key: "password",
                  label: "Change Password",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ),
                },
                {
                  key: "delete",
                  label: "Delete Account",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ),
                },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveSection(key);
                    setMessage(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                    activeSection === key
                      ? key === "delete"
                        ? "bg-red-100 text-red-700 font-medium"
                        : "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}

              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={() => router.push("/")}
                  className="w-full px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  ← Back to homepage
                </button>
              </div>
            </nav>
          </div>

          {/* Main content area */}
          <section className="flex-grow bg-white rounded-2xl shadow-xl p-8 min-h-[400px]">
            {/* Message */}
            {message && (
              <div
                className={`mb-6 rounded-md p-4 ${
                  message.includes("successfully")
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message}
              </div>
            )}

            {activeSection === "profile" && (
              <>
                <h2 className="text-3xl font-semibold mb-6">Profile Information</h2>

                <label className="block mb-4">
                  <span className="text-gray-700 font-semibold mb-1 block">Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Your full name"
                  />
                </label>

                <label className="block mb-6">
                  <span className="text-gray-700 font-semibold mb-1 block">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-100"
                    placeholder="Your email address"
                    disabled
                  />
                  <p className="text-sm text-gray-500 mt-1">Email changes must be done in 'Change Email' section.</p>
                </label>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className={`bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}

            {activeSection === "email" && (
              <>
                <h2 className="text-3xl font-semibold mb-6">Change Email</h2>

                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Current Email:</strong> {user.email}
                  </p>
                </div>

                <label className="block mb-4">
                  <span className="text-gray-700 font-semibold mb-1 block">New Email</span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="New email address"
                  />
                </label>

                <label className="block mb-4">
                  <span className="text-gray-700 font-semibold mb-1 block">Confirm New Email</span>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Confirm new email address"
                  />
                </label>

                <label className="block mb-6">
                  <span className="text-gray-700 font-semibold mb-1 block">Current Password</span>
                  <input
                    type="password"
                    value={currentPasswordForEmail}
                    onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Enter your current password"
                  />
                </label>

                <button
                  onClick={handleChangeEmail}
                  disabled={isSaving}
                  className={`bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving ? "Updating..." : "Update Email"}
                </button>
              </>
            )}

            {activeSection === "password" && (
              <>
                <h2 className="text-3xl font-semibold mb-6">Change Password</h2>

                <label className="block mb-4">
                  <span className="text-gray-700 font-semibold mb-1 block">Current Password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Current password"
                  />
                </label>

                <label className="block mb-4">
                  <span className="text-gray-700 font-semibold mb-1 block">New Password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="New password"
                  />
                </label>

                <label className="block mb-6">
                  <span className="text-gray-700 font-semibold mb-1 block">Confirm New Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Confirm new password"
                  />
                </label>

                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className={`bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving ? "Changing..." : "Change Password"}
                </button>
              </>
            )}

            {activeSection === "delete" && (
              <>
                <h2 className="text-3xl font-semibold mb-6 text-red-600">Delete Account</h2>
                <p className="mb-6 text-gray-700">
                  Warning: Deleting your account is permanent and cannot be undone.
                  Please confirm below.
                </p>

                <label className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    className="mr-3"
                  />
                  <span>I understand the consequences and want to delete my account.</span>
                </label>

                <button
                  onClick={handleDeleteAccount}
                  disabled={isSaving}
                  className={`bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving ? "Deleting..." : "Delete Account"}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}