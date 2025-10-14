import supabase from "../utils/db.js";

export const upsertUser = async ({ clerkId, email, name }) => {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      [
        {
          clerk_id: clerkId,
          email,
          name: name,
        },
      ],
      { onConflict: "clerk_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("❌ upsertUser error:", error.message);
    throw error;
  }

  return data;
};

export const getUserByClerkId = async (clerkId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();

  if (error) {
    console.error("❌ getUserByClerkId error:", error.message);
    throw error;
  }

  return data;
};

export const updateUserById = async (id, payload) => {
  console.log("🧩 updateUserById attempt:", id, payload);

  const { data, error, status } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  console.log("🧩 Supabase result:", { status, data, error });

  return { data, error };
};
