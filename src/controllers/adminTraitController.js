import {
  getAllTraits,
  getTraitById,
  createTrait,
  updateTrait,
  deleteTrait,
  getTraitsByIds,
} from "../models/traitModel.js";
import { getSpeciesById, updateSpecies } from "../models/speciesModel.js";


export const getTraitsAdmin = async (req, res) => {
  try {
    const { data, error } = await getAllTraits();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getTraitsAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const getTraitAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getTraitById(id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const addTraitAdmin = async (req, res) => {
  try {
    const body = req.body;


    const { data: trait, error } = await createTrait({
      name: body.name,
      slug: body.name.toLowerCase().replace(/\s+/g, "_"),
      display_order: body.display_order || 0,
      description: body.description || "",
      has_options: body.has_options ?? false,
      options: body.options || [],
      has_modifiers: body.has_modifiers ?? false,
      modifiers: body.modifiers || [], 
      scope: body.scope || "specific",
    });
    if (error) throw error;


    if (body.species_id) {
      const { data: species, error: speciesErr } = await getSpeciesById(
        body.species_id
      );
      if (speciesErr) throw speciesErr;
      if (!species) throw new Error("Species not found");

      const currentTraits = Array.isArray(species.traits)
        ? [...species.traits]
        : [];

      const exists = currentTraits.some((t) => t.trait_id === trait.id);
      if (!exists) {
        currentTraits.push({ trait_id: trait.id, name: trait.name });
        const { error: updateErr } = await updateSpecies(body.species_id, {
          traits: currentTraits,
        });
        if (updateErr) throw updateErr;
      }
    }

    res.status(201).json({
      message: "✅ Trait created successfully and added to species",
      data: trait,
    });
  } catch (err) {
    console.error("❌ addTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const editTraitAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const { data: trait, error } = await updateTrait(id, {
      name: body.name,
      slug: body.name.toLowerCase().replace(/\s+/g, "_"),
      display_order: body.display_order || 0,
      description: body.description || "",
      has_options: body.has_options ?? false,
      options: body.options || [],
      has_modifiers: body.has_modifiers ?? false, 
      modifiers: body.modifiers || [],
      scope: body.scope || "specific",
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;


    if (body.species_id) {
      const { data: species, error: speciesErr } = await getSpeciesById(
        body.species_id
      );
      if (speciesErr) throw speciesErr;
      if (!species) throw new Error("Species not found");

      if (Array.isArray(species.traits)) {
        const updatedTraits = species.traits.map((t) =>
          t.trait_id === id ? { ...t, name: trait.name } : t
        );

        const { error: updateErr } = await updateSpecies(body.species_id, {
          traits: updatedTraits,
        });
        if (updateErr) throw updateErr;
      }
    }

    res.json({
      message: "✅ Trait updated successfully",
      data: trait,
    });
  } catch (err) {
    console.error("❌ editTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const deleteTraitAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const species_id = req.body?.species_id; 


    const { error } = await deleteTrait(id);
    if (error) throw error;

    if (species_id && typeof species_id === "string") {
      const { data: species, error: speciesErr } = await getSpeciesById(species_id);
      if (speciesErr) throw speciesErr;

      if (Array.isArray(species.traits)) {
        const updatedTraits = species.traits.filter((t) => t.id !== id);
        const { error: updateErr } = await updateSpecies(species_id, { traits: updatedTraits });
        if (updateErr) throw updateErr;
      }
    }

    res.json({ success: true, message: "🗑️ Trait deleted successfully" });
  } catch (err) {
    console.error("❌ deleteTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const getTraitsByIdsAdmin = async (req, res) => {
  try {
    const ids = req.query.ids?.split(",").filter(Boolean);
    if (!ids?.length)
      return res.status(400).json({ error: "No trait IDs provided" });

    const { data, error } = await getTraitsByIds(ids);
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("❌ getTraitsByIdsAdmin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
