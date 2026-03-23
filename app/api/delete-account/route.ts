import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, user_id } = body;

    if (!full_name || !user_id) {
      return NextResponse.json(
        { error: "Full name and user ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== user_id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Insert deletion request into database
    const { data, error } = await supabase
      .from("deletion_requests")
      .insert({
        user_id: user_id,
        full_name: full_name,
        deletion_type: "account",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating deletion request:", error);
      return NextResponse.json(
        { error: "Failed to create deletion request" },
        { status: 500 }
      );
    }

    // Here you could also send an email notification to admins
    // or trigger a webhook for external processing

    return NextResponse.json(
      {
        message: "Deletion request submitted successfully",
        request_id: data.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in delete-account API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
