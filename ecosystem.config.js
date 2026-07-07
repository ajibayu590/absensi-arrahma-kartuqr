module.exports = {
  apps: [
    {
      name: "absensi-smk",
      script: "npm",
      args: "run start",
      cwd: "/mnt/save/project/absensi/absensi_smk_ar_rahma",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
