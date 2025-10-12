/*
 * Start script that auto-selects a free port to avoid interactive prompts
 * when the default port is in use. It then spawns `react-scripts start`.
 */
import { spawn } from 'child_process';
import getPort from 'get-port';

async function main(): Promise<void> {
  // Always use port 3000 for React app
  const port = 3000;
  const host = process.env.HOST || '0.0.0.0';

  // Check if port 3000 is available, if not, show error
  const isPortAvailable = await getPort({ port, host });
  if (isPortAvailable !== port) {
    console.error(`❌ Port ${port} is already in use. Please stop the process using port ${port} and try again.`);
    console.log(`💡 If you're running the API server, it should use port 3001 instead.`);
    process.exit(1);
  }

  const child = spawn('react-scripts', ['start'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      // Disable source maps to avoid noisy source-map-loader warnings from dependencies
      GENERATE_SOURCEMAP: 'false',
      // Keep it interactive for fast-refresh, but no prompt will occur since the port is free
    },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    // Surface a helpful error and non-zero exit code
    console.error('Failed to start dev server:', err);
    process.exit(1);
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();


