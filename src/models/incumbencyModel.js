
import supabase from "../utils/db.js";
const BASE_URL = process.env.PUBLIC_API_URL || "http://localhost:5000";
// === GET ALL ===
export const getAllIncumbency = async () => {
  return await supabase
    .from("incumbency")
    .select("*")
    .order("created_at", { ascending: false });
};

// === GET BY ID ===
export const getIncumbencyById = async (id) => {
  return await supabase.from("incumbency").select("*").eq("id", id).single();
};

// === CREATE ===
export const createIncumbency = async (body) => {
  return await supabase.from("incumbency").insert([
    {
      name: body.name,
      version: body.version,
      image: body.image,
      alignment_good: body.good,
      alignment_neutral: body.neutral,
      alignment_evil: body.evil,
      alignment_unknown: body.unknown,
      role: body.role,
      hp_scale: body.hp_scale,
      cv_minimum: body.cv_minimum,
      cv_flat_cost: body.cv_flat_cost,
      cv_percent_cost: body.cv_percent_cost,
      ac_calc: body.ac_calc,
      initiative_bonus: body.intivative_bonus,
      description: body.description,
      abilities: body.abilities,
    },
  ]).select().single();
};

// === UPDATE ===
export const updateIncumbency = async (id, body) => {
  return await supabase
    .from("incumbency")
    .update({
      name: body.name,
      version: body.version,
      image: body.image,
      alignment_good: body.good,
      alignment_neutral: body.neutral,
      alignment_evil: body.evil,
      alignment_unknown: body.unknown,
      role: body.role,
      hp_scale: body.hp_scale,
      cv_minimum: body.cv_minimum,
      cv_flat_cost: body.cv_flat_cost,
      cv_percent_cost: body.cv_percent_cost,
      ac_calc: body.ac_calc,
      initiative_bonus: body.intivative_bonus,
      description: body.description,
      abilities: body.abilities,
      updated_at: new Date(),
    })
    .eq("id", id)
    .select()
    .single();
};

// === DELETE ===
export const deleteIncumbency = async (id) => {
  return await supabase.from("incumbency").delete().eq("id", id);
};
