module.exports = {
  apps: [
    {
      name: 'split-chunks-upload',
      script: 'index.js',
      instances: 1,
      exec_mode: 'cluster',
      out_file: '/dev/null',
      error_file: '/dev/null',
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_testing: {
        NODE_ENV: 'testing',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
