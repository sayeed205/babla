/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  BACKEND_URL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DATABASE_URL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Telegram
  |----------------------------------------------------------
  */
  TG_API_ID: Env.schema.number(),
  TG_API_HASH: Env.schema.string(),
  TG_LOG_CHANNEL: Env.schema.number(),
  TG_MAIN_BOT_TOKEN: Env.schema.string(),
  TG_ADMIN_ID: Env.schema.number(),

  TRAKT_CLIENT_ID: Env.schema.string(),
  TRAKT_CLIENT_SECRET: Env.schema.string(),
})
