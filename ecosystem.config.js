module.exports = {
  apps: [
    {
      name: 'el-awal-backend',
      cwd: '/var/www/el-awal/apps/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/el-awal/apps/backend/logs/backend-error.log',
      out_file: '/var/www/el-awal/apps/backend/logs/backend-out.log',
      merge_logs: true,
    },
  ],
};
