import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { nanoid } from "https://esm.sh/nanoid@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-issue-secret",
};

function generateAccessToken() {
  return nanoid(32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("ISSUE_ACCESS_SECRET");
    const headerSecret = req.headers.get("x-issue-secret");

    if (secret && headerSecret !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { book_id, email, order_id, expires_in_days, label } =
      await req.json();

    if (!book_id) {
      return new Response(JSON.stringify({ error: "book_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: book } = await supabase
      .from("books")
      .select("id, status")
      .eq("id", book_id)
      .single();

    if (!book || book.status !== "published") {
      return new Response(
        JSON.stringify({ error: "Published book not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = generateAccessToken();
    const tokenLabel =
      label ??
      (order_id ? `purchase-${order_id}` : email ? `email-${email}` : "general");

    const expires_at =
      typeof expires_in_days === "number"
        ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
        : null;

    const { data, error } = await supabase
      .from("book_access_tokens")
      .insert({
        book_id,
        token,
        label: tokenLabel,
        expires_at,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl =
      Deno.env.get("SITE_URL") ?? "http://localhost:3000";

    return new Response(
      JSON.stringify({
        token: data.token,
        url: `${siteUrl}/read/${data.token}`,
        expires_at: data.expires_at,
        book_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
