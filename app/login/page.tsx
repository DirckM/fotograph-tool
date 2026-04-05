"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = setInterval(() => {
      setRetrySeconds((s) => {
        if (s <= 1) {
          setMessage("");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retrySeconds > 0]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const allowed = [
      "mickdelint@gmail.com",
      "dirckmulder20@gmail.com",
    ];
    if (!allowed.includes(email.toLowerCase().trim())) {
      setMessage("Access denied. This app is invite-only.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      const secondsMatch = error.message.match(/after (\d+) seconds/);
      if (secondsMatch) {
        const seconds = parseInt(secondsMatch[1], 10);
        setRetrySeconds(seconds);
        setMessage(`Rate limited. Try again in ${seconds} seconds.`);
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage("Check your email for the login link.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-serif text-3xl">Fotograph</CardTitle>
          <CardDescription>
            AI-powered image manipulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || retrySeconds > 0}>
              {loading
                ? "Sending link..."
                : retrySeconds > 0
                  ? `Try again in ${retrySeconds}s`
                  : "Send magic link"}
            </Button>
            {message && (
              <p className={`text-center text-sm ${retrySeconds > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
