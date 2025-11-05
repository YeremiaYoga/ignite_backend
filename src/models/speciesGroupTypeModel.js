import supabase from "../utils/db.js";

export const getAllGroupTypes = async () => {
  return await supabase
    .from("species_group_type")
    .select("*")
    .order("name", { ascending: true });
};

export const getGroupTypeById = async (id) => {
  return await supabase
    .from("species_group_type")
    .select("*")
    .eq("id", id)
    .single();
};

export const createGroupType = async (data) => {
  return await supabase
    .from("species_group_type")
    .insert([data])
    .select()
    .single();
};

export const updateGroupType = async (id, data) => {
  return await supabase
    .from("species_group_type")
    .update(data)
    .eq("id", id)
    .select()
    .single();
};

export const deleteGroupType = async (id) => {
  return await supabase.from("species_group_type").delete().eq("id", id);
};
