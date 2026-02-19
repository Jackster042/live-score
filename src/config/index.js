/**
 * Centralized, validated configuration
 * Validates all environment variables at startup
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
];

const OPTIONAL_ENV_VARS = {
  NODE_ENV: 'development',
  PORT: '8000',
  HOST: '0.0.0.0',
  ARCJET_MODE: 'DRY_RUN',
  ARCJET_KEY: '',
};

/**
 * Validates and loads configuration from environment
 * @returns {Object} Validated configuration object
 * @throws {Error} If required environment variables are missing
 */
function loadConfig() {
  const config = {};
  const errors = [];

  // Validate required variables
  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    } else {
      config[toCamelCase(key)] = value.trim();
    }
  }

  // Load optional variables with defaults
  for (const [key, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[key];
    config[toCamelCase(key)] = (value && value.trim() !== '') ? value.trim() : defaultValue;
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'test', 'production'];
  if (!validEnvs.includes(config.nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${config.nodeEnv}. Must be one of: ${validEnvs.join(', ')}`);
  }

  // Validate PORT is a number
  const port = parseInt(config.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`Invalid PORT: ${config.port}. Must be a valid port number (1-65535)`);
  } else {
    config.port = port;
  }

  // Validate ARCJET_MODE
  const validArcjetModes = ['LIVE', 'DRY_RUN'];
  if (!validArcjetModes.includes(config.arcjetMode)) {
    errors.push(`Invalid ARCJET_MODE: ${config.arcjetMode}. Must be one of: ${validArcjetModes.join(', ')}`);
  }

  // Throw if there are errors
  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    console.error('\nRequired Environment Variables:');
    REQUIRED_ENV_VARS.forEach(key => console.error(`   - ${key}`));
    console.error('\nOptional Environment Variables (with defaults):');
    Object.entries(OPTIONAL_ENV_VARS).forEach(([key, val]) => console.error(`   - ${key}=${val}`));
    console.error('');
    throw new Error('Configuration validation failed');
  }

  return Object.freeze(config);
}

/**
 * Converts UPPER_SNAKE_CASE to camelCase
 */
function toCamelCase(str) {
  return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Load and export configuration
export const config = loadConfig();

// Export individual values for convenience
export const {
  nodeEnv,
  port,
  host,
  databaseUrl,
  redisUrl,
  arcjetMode,
  arcjetKey,
} = config;

// Helper functions
export const isDevelopment = () => nodeEnv === 'development';
export const isTest = () => nodeEnv === 'test';
export const isProduction = () => nodeEnv === 'production';
export const hasArcjetKey = () => arcjetKey && arcjetKey.length > 0;
