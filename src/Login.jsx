import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const navigate = useNavigate();
    const version_n = "4.6";
    const apiBase = "https://oxadmedia.online";

    let accessToken = null;
    let mobileSaved = null;

    useEffect(() => {
        const isLoggedIn = localStorage.getItem("isLoggedInWeb");
        const roleType = localStorage.getItem("type");

        if (isLoggedIn === "true") {
            mobileSaved = localStorage.getItem("mobileIs");
            accessToken = localStorage.getItem("accessToken");
            navigate("/GymList");
        }
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            setDeferredPrompt(null);
            setShowInstallButton(false);
        }
    };

    useEffect(() => {
        window.history.pushState(null, null, window.location.href);
        window.onpopstate = () => {
            window.history.go(1);
        };
        return () => {
            window.onpopstate = null;
        };
    }, []);

    const handleReLogin = async () => {
        setError("");
        setSuccessMessage("");

        if (!mobileSaved?.trim()) {
            setError("User ID and Password are required.");
            return;
        }

        setLoading(true);
        const payload = { mobile: mobileSaved };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${apiBase}/getgymwlist`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message);
              //  console.log("Login successful:", data);
                localStorage.setItem("isLoggedInWeb", "true");
                localStorage.setItem("gyms", JSON.stringify(data.result));
                localStorage.setItem("accessToken", data.access_token);
                navigate("/GymList");
            } else {
                if (data.error === 1) {
                    console.log("Access token expired, refreshing...");
                    await refreshAccessToken();
                } else {
                    setError(data.message || "Login failed.");
                }
            }
        } catch (err) {
            setError("Something went wrong. Check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    const refreshAccessToken = async () => {
        try {
            const res = await axios.post(`${apiBase}/api/refresh-token`, { mob: mobileSaved }, {
                withCredentials: true,
            });
            if (res.data.success && res.data.access_token) {
                localStorage.setItem("accessToken", res.data.access_token);
                accessToken = res.data.access_token;
                console.log("✅ Access token refreshed");
                await handleReLogin();
            } else {
                console.log("❌ Refresh token invalid or expired.");
            }
        } catch (err) {
            console.error("🔥 Failed to refresh token:", err);
        }
    };

    const handleLogin = async () => {
        setError("");
        setSuccessMessage("");

        if (!userId.trim() || !password.trim()) {
            setError("User ID and Password are required.");
            return;
        }

        setLoading(true);
        const payload = {
            mobile: userId,
            password: password,
        };
         //   const response = await fetch(`${apiBase}/getgymwlist`, {

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${apiBase}/api/fetch-gymlist`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message);
                localStorage.setItem("isLoggedInWeb", "true");
                localStorage.setItem("mobileIs", userId);
                localStorage.setItem("gyms", JSON.stringify(data.result));
                localStorage.setItem("accessToken", data.access_token);
                navigate("/GymList");
            } else {
                setError(data.message || "Login failed.");
            }
        } catch (err) {
            setError("Something went wrong. Check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="w-full max-w-xl p-12 bg-white rounded-2xl shadow-xl text-center">

                {showInstallButton && (
                    <button
                        onClick={handleInstallClick}
                        className="mt-6 mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
                    >
                        Install App
                        <p className="text-sm mt-1">Version: {version_n}</p>
                    </button>
                )}

                <h2 className="text-2xl font-bold text-gray-800">Fitox Gym Admin Panel</h2>
                <p className="text-gray-600 mt-2">Complete Gym Solution for Owners</p>

                <div className="mt-6">
                    <input
                        type="text"
                        placeholder="User ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 mt-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                    <button
                        onClick={handleLogin}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    <div className="mt-6">
                        <p className="text-sm text-gray-600">New Gym Owner?</p>
                        <button
                            onClick={() => navigate("/register-screen")}
                            className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Register Your Gym
                        </button>
                    </div>
                </div>

                <p className="text-gray-500 text-sm mt-6">Version {version_n}</p>
            </div>
        </div>
    );
}

export default Login;
