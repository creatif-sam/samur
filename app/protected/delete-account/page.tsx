"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DeleteAccountPage() {
  const [fullName, setFullName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (fullName.trim() !== confirmName.trim()) {
      setError("Names do not match. Please verify and try again.");
      return;
    }

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to delete your account.");
        setLoading(false);
        return;
      }

      // Submit deletion request to API
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit deletion request");
      }

      setSuccess(true);

      // Show success message for 3 seconds then logout and redirect
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-green-600">Request Submitted</CardTitle>
            <CardDescription>
              Your account deletion request has been successfully submitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We will process your request within 30 days as required by GDPR.
              You will receive a confirmation email once your account has been
              deleted. You are now being logged out...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            This action is permanent and cannot be undone
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Deleting your account will permanently
                remove:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your profile and personal information</li>
                  <li>All your goals and progress</li>
                  <li>All your posts and comments</li>
                  <li>All your meditations and reflections</li>
                  <li>Your planner data and notes</li>
                  <li>Your partner connections</li>
                </ul>
                <p className="mt-2">
                  This process cannot be reversed. Your data will be permanently
                  deleted within 30 days.
                </p>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Enter your full name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmName">
                Confirm your full name to proceed
              </Label>
              <Input
                id="confirmName"
                type="text"
                placeholder="Type your full name again"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Both names must match exactly to confirm deletion
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !fullName || !confirmName}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Delete My Account"
              )}
            </Button>
          </CardFooter>
        </form>
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">
            Need help? Contact us at{" "}
            <a
              href="mailto:tech@espirito.samuelgyasi.com"
              className="underline hover:text-foreground"
            >
              tech@espirito.samuelgyasi.com
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
