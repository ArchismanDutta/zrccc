// PM2 process config
// Used to start and manage the Node.js server on EC2.
//
// First time:  pm2 start ecosystem.config.js --env production
// After that:  pm2 restart ecosystem.config.js --env production --update-env
// Save state:  pm2 save
// Auto-start:  pm2 startup   (follow the command it prints)

module.exports = {
  apps: [
    {
      name: 'zrccrm',

      // Entry point — relative to where you run pm2 from (/home/ubuntu/zrccrm)
      script: 'server/server.js',

      // Working directory — must be the project root
      cwd: '/home/ubuntu/zrccrm',

      // Only 1 instance (not cluster mode) for a t3.small
      instances: 1,

      // Restart automatically if the process crashes
      autorestart: true,

      // Do NOT watch for file changes (we restart manually on deploy)
      watch: false,

      // Restart if memory goes above 900MB
      max_memory_restart: '900M',

      // Merge all logs into one stream
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Production environment variables
      // These are OVERRIDES on top of whatever is in server/.env
      // The real secrets live in /home/ubuntu/zrccrm/server/.env on the EC2
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
}
