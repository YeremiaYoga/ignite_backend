
import multer from "multer";
import path from "path";
import fs from "fs";



const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    const characterName = req.body.name || "default";

  
    const uploadPath = path.join(
      process.cwd(),
      "public",
      "assets",
      "characters",
      characterName
    );

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath); 
  },
  filename: (req, file, cb) => {

    let filename = file.originalname; 

    if (file.fieldname === "token_art") {
      filename = "token_image" + path.extname(file.originalname); 
    } else if (file.fieldname === "art") {
      filename = "character_art" + path.extname(file.originalname);
    } else if (file.fieldname === "main_theme_ogg") {
      filename = "main_theme" + path.extname(file.originalname);
    } else if (file.fieldname === "combat_theme_ogg") {
      filename = "combat_theme" + path.extname(file.originalname);
    }

    cb(null, filename);
  },
});

const upload = multer({ storage });

export default upload;
