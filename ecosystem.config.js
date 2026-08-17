module.exports = {
  apps: [
    {
      name: 'el-awal-backend',
      cwd: './apps/backend',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
    },
  ],
};
