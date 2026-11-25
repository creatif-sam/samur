"use client";

import { trNow } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
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
  const { tr } = useTranslation()
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
      setError(tr('Names do not match. Please verify and try again.'));
      return;
    }

    if (!fullName.trim()) {
      setError(tr('Please enter your full name.'));
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(tr('You must be logged in to delete your account.'));
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
        throw new Error(data.error || trNow("Failed to submit deletion request"));
      }

      setSuccess(true);

      // Show success message for 3 seconds then logout and redirect
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message || tr('An error occurred. Please try again.'));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-green-600">{tr('Request Submitted')}</CardTitle>
            <CardDescription>
              {tr('Your account deletion request has been successfully submitted.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {tr('We will process your request within 30 days as required by GDPR. You will receive a confirmation email once your account has been deleted. You are now being logged out...')}
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
            {tr('Delete Account')}
          </CardTitle>
          <CardDescription>
            {tr('This action is permanent and cannot be undone')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{tr('Warning:')}</strong>{' '}{tr('Deleting your account will permanently remove:')}
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{tr('Your profile and personal information')}</li>
                  <li>{tr('All your goals and progress')}</li>
                  <li>{tr('All your posts and comments')}</li>
                  <li>{tr('All your meditations and reflections')}</li>
                  <li>{tr('Your planner data and notes')}</li>
                  <li>{tr('Your partner connections')}</li>
                </ul>
                <p className="mt-2">
                  {tr('This process cannot be reversed. Your data will be permanently deleted within 30 days.')}
                </p>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{tr(error)}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">{tr('Enter your full name')}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={tr('Your full name')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmName">
                {tr('Confirm your full name to proceed')}
              </Label>
              <Input
                id="confirmName"
                type="text"
                placeholder={tr('Type your full name again')}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                {tr('Both names must match exactly to confirm deletion')}
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
              {tr('Cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !fullName || !confirmName}
            >
              {loading ? (<>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tr('Processing...')}
                </>) : (tr('Delete My Account'))}
            </Button>
          </CardFooter>
        </form>
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">
            {tr('Need help? Contact us at')}{" "}
            <a
              href="mailto:tech@espirito.samuelgyasi.com"
              className="underline hover:text-foreground"
            >
              {tr('tech@espirito.samuelgyasi.com')}
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
