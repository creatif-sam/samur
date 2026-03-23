"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Info } from "lucide-react";

type DataType =
  | "goals"
  | "posts"
  | "meditations"
  | "planner"
  | "notes"
  | "avatar";

const DATA_TYPES = [
  {
    id: "goals" as DataType,
    label: "Goals & Progress",
    description: "All your goals, progress tracking, and vision boards",
  },
  {
    id: "posts" as DataType,
    label: "Posts & Comments",
    description: "All your posts, comments, and reactions",
  },
  {
    id: "meditations" as DataType,
    label: "Meditations",
    description: "All your meditation reflections and streak data",
  },
  {
    id: "planner" as DataType,
    label: "Planner Data",
    description: "All your yearly plans, weekly tasks, and daily reflections",
  },
  {
    id: "notes" as DataType,
    label: "Notes & ThoughtBook",
    description: "All your notebooks, sections, pages, and thoughts",
  },
  {
    id: "avatar" as DataType,
    label: "Profile Picture",
    description: "Your avatar/profile picture",
  },
];

export default function DeleteDataPage() {
  const [selectedData, setSelectedData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleToggle = (dataType: DataType) => {
    setSelectedData((prev) =>
      prev.includes(dataType)
        ? prev.filter((d) => d !== dataType)
        : [...prev, dataType]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedData.length === 0) {
      setError("Please select at least one data type to delete.");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to delete your data.");
        setLoading(false);
        return;
      }

      // Submit deletion request to API
      const response = await fetch("/api/delete-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          data_types: selectedData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit deletion request");
      }

      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/protected/profile");
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
              Your data deletion request has been successfully submitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We will process your request within 7-30 days as required by GDPR.
              The selected data will be permanently deleted. Redirecting you to
              your profile...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Delete Specific Data
          </CardTitle>
          <CardDescription>
            Select which data you want to permanently delete
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This allows you to delete specific types of data while keeping
                your account. Your profile and login credentials will remain
                active.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Select data to delete:
              </Label>
              {DATA_TYPES.map((dataType) => (
                <div
                  key={dataType.id}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={dataType.id}
                    checked={selectedData.includes(dataType.id)}
                    onCheckedChange={() => handleToggle(dataType.id)}
                    disabled={loading}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={dataType.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {dataType.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {dataType.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selectedData.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> The selected data will be
                  permanently deleted and cannot be recovered. This action is
                  irreversible.
                </AlertDescription>
              </Alert>
            )}
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
              disabled={loading || selectedData.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Delete Selected Data (${selectedData.length})`
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
