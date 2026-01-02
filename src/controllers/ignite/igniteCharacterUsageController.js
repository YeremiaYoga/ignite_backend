import supabase from "../../utils/db.js";

const CHARACTER_SOURCES = [
  {
    key: "journals",
    table: "journals",
    sumField: "character_count",
  },

  // FUTURE READY:
  // {
  //   key: "worlds",
  //   table: "worlds",
  //   sumField: "character_count",
  // },
  // {
  //   key: "campaigns",
  //   table: "campaigns",
  //   sumField: "character_count",
  // },
];


export async function igniteCharacterUsageController(req, res) {
  try {

    const creatorId = req.user.id;
    const creatorName = req.user.username;

    const querySources = String(req.query.sources || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const activeSources =
      querySources.length > 0
        ? CHARACTER_SOURCES.filter((s) =>
            querySources.includes(s.key)
          )
        : CHARACTER_SOURCES;

    let totalCharacters = 0;
    const breakdown = {};

    // =============================
    // HITUNG PER TABLE (OWNERSHIP)
    // =============================
    for (const src of activeSources) {
      const { data, error } = await supabase
        .from(src.table)
        .select(src.sumField)
        .eq("creator_id", creatorId);

      if (error) throw error;

      const sum = (data || []).reduce((acc, row) => {
        const v = Number(row?.[src.sumField] ?? 0);
        return acc + (Number.isFinite(v) ? v : 0);
      }, 0);

      breakdown[src.key] = {
        table: src.table,
        characters: sum,
      };

      totalCharacters += sum;
    }

    return res.json({
      success: true,
      creator: {
        id: creatorId,
        name: creatorName,
      },
      totals: {
        character_count: totalCharacters,
      },
      breakdown,
      meta: {
        sources_available: CHARACTER_SOURCES.map((s) => s.key),
        sources_used: activeSources.map((s) => s.key),
      },
    });
  } catch (err) {
    console.error("🔥 igniteCharacterUsageController error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate character usage",
    });
  }
}
