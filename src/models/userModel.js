import supabase from "../utils/db.js";

export const upsertUser = async ({ clerkId, email, username, role = "user" }) => {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      [
        {
          clerk_id: clerkId,
          email,
          name: username,
          username,
          role,
        },
      ],
      { onConflict: "clerk_id" }
    )
    .select()
    .maybeSingle();

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
    .maybeSingle(); 

  if (error) {
    console.error("❌ getUserByClerkId error:", error.message);
    throw error;
  }

  if (!data) {
    console.log("⚠️ No user found for clerkId:", clerkId);
    return null;
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

// === JWT-BASED AUTH ADDITIONS ===

export const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("❌ getUserByEmail error:", error.message);
    throw error;
  }

  return data;
};

