import supabase from "../utils/db.js";


export const upsertUser = async ({ clerkId, email, username }) => {
  return await supabase
    .from("users")
    .upsert([{ clerk_id: clerkId, email, username }], {
      onConflict: "clerk_id",
    })
    .select()
    .single();
};


export const getUserByClerkId = async (clerkId) => {
  return await supabase.from("users").select("*").eq("clerk_id", clerkId).single();
};
