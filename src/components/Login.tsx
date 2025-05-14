import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { loginUser } from "../api";

interface LoginProps {
    onLoginSuccess: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [accountName, setAccountName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountName || !password) {
            setError("Please enter both account name and password");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await loginUser(accountName, password);
            if (response.retcode === 0) {
                onLoginSuccess(response.data.token);
            } else {
                setError(response.message || "Login failed");
            }
        } catch (err) {
            setError("Failed to connect to the server");
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-900 dark:text-white">
                    AlumBot Login
                </h2>

                {error && (
                    <Alert className="mb-4" variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            htmlFor="accountName"
                        >
                            Account Name
                        </label>
                        <Input
                            id="accountName"
                            type="text"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="Enter your account name"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label
                            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Login;
