import app from "./app.js";
import dotenv from "dotenv";
import { scheduleAutoBackup } from "./controllers/backupController.js";
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // scheduleAutoBackup(); 
});
