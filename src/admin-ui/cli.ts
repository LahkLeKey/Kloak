#!/usr/bin/env node
import {startServer} from './server.ts';

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || 'localhost';

startServer({port, host}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
