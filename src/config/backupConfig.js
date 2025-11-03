export const backupConfig = {
  enabled: true, // untuk menonaktifkan semua backup otomatis jika false

  tables: ["users"],

  schedule: "0 2 * * *", // setiap hari jam 02:00 pagi (format cron)
};
