/*
 * Start script that auto-selects a free port to avoid interactive prompts
 * when the default port is in use. It then spawns `react-scripts start`.
 */
import { spawn } from 'child_process';
import getPort from 'get-port';

async function main(): Promise<void> {
  const defaultPort = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  // Try a small range starting from defaultPort to avoid prompting
  // Try default port; if taken, pick any available port automatically
  const port = await getPort({ port: defaultPort, host });

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


