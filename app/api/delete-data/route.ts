import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, data_types } = body;

    if (!user_id || !data_types || !Array.isArray(data_types) || data_types.length === 0) {
      return NextResponse.json(
        { error: "User ID and data types array are required" },
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

    // Get user profile for the full name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user_id)
      .single();

    // Insert deletion request into database
    const { data, error } = await supabase
      .from("deletion_requests")
      .insert({
        user_id: user_id,
        full_name: profile?.name || "Unknown",
        deletion_type: "data",
        status: "pending",
        data_types: data_types,
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
        message: "Data deletion request submitted successfully",
        request_id: data.id,
        data_types: data_types,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in delete-data API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
