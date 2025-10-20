
import supabase from "../utils/db.js";
const BASE_URL = process.env.PUBLIC_API_URL || "http://localhost:5000";
// === GET ALL ===
export const getAllIncumbency = async () => {
  return await supabase
    .from("incumbency")
    .select("*")
    .order("created_at", { ascending: false });
};

/* === GET BY ID === */
export const getIncumbencyById = async (id) => {
  return await supabase.from("incumbency").select("*").eq("id", id).single();
};

/* === CREATE === */
export const createIncumbency = async (body) => {
  const key =
    body.key || body.name?.toLowerCase().replace(/\s+/g, "_") || null;

  return await supabase
    .from("incumbency")
    .insert([
      {
        key,
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
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .select()
    .single();
};


export const updateIncumbency = async (id, body) => {
  const key =
    body.key || body.name?.toLowerCase().replace(/\s+/g, "_") || null;

  return await supabase
    .from("incumbency")
    .update({
      key,
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

export const deleteIncumbency = async (id) => {
  return await supabase.from("incumbency").delete().eq("id", id);
};


export const getIncumbencyByName = async (name) => {
  const decoded = name.replace(/_/g, " ");
  const { data, error } = await supabase
    .from("incumbency")
    .select("*")
    .ilike("name", decoded);

  if (error) throw new Error(error.message);
  return data;
};


export const getIncumbencyByKey = async (key) => {
  return await supabase
    .from("incumbency")
    .select("*")
    .eq("key", key)
    .order("version", { ascending: true });
};