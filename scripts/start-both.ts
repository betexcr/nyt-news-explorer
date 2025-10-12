/*
 * Start script that runs both React app (port 3000) and API server (port 3001)
 * This replaces the need to run separate commands
 */
import { spawn, exec } from 'child_process';
import getPort from 'get-port';
import { createInterface } from 'readline';

// Helper function to ask user if they want to kill the process
async function askUserToKillProcess(port: number): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Do you want to stop the process using port ${port}? (Y/n): `, (answer) => {
      rl.close();
      const shouldKill = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer === '';
      resolve(shouldKill);
    });
  });
}

// Helper function to kill process on a specific port
async function killProcessOnPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use netstat to find the process ID using the port
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error) {
        console.log(`Could not find process using port ${port}`);
        resolve();
        return;
      }

      const lines = stdout.split('\n');
      const pids = new Set<string>();
      
      for (const line of lines) {
        const match = line.match(/\s+(\d+)$/);
        if (match) {
          pids.add(match[1]);
        }
      }

      if (pids.size === 0) {
        console.log(`No process found using port ${port}`);
        resolve();
        return;
      }

      // Kill all processes using this port
      const killPromises = Array.from(pids).map(pid => {
        return new Promise<void>((resolveKill) => {
          exec(`taskkill /PID ${pid} /F`, (killError) => {
            if (killError) {
              console.log(`Could not kill process ${pid}: ${killError.message}`);
            } else {
              console.log(`Killed process ${pid}`);
            }
            resolveKill();
          });
        });
      });

      Promise.all(killPromises).then(() => {
        resolve();
      }).catch(reject);
    });
  });
}

async function main(): Promise<void> {
  console.log('🚀 Starting NYT News Explorer - Full Stack Development');
  console.log('📋 Configuration:');
  console.log('   - React App: Port 3000');
  console.log('   - API Server: Port 3001');
  console.log('   - Cache Monitoring: Available at http://localhost:3001/api/v1/cache/status');
  console.log('');

  // Check if ports are available and handle conflicts
  const reactPort = 3000;
  const apiPort = 3001;
  
  const reactPortAvailable = await getPort({ port: reactPort });
  const apiPortAvailable = await getPort({ port: apiPort });
  
  if (reactPortAvailable !== reactPort) {
    console.log(`⚠️  Port ${reactPort} is already in use.`);
    const shouldKill = await askUserToKillProcess(reactPort);
    if (shouldKill) {
      await killProcessOnPort(reactPort);
      console.log(`✅ Freed up port ${reactPort}`);
    } else {
      console.log('❌ Cannot start React app without port 3000. Exiting.');
      process.exit(1);
    }
  }
  
  if (apiPortAvailable !== apiPort) {
    console.log(`⚠️  Port ${apiPort} is already in use.`);
    const shouldKill = await askUserToKillProcess(apiPort);
    if (shouldKill) {
      await killProcessOnPort(apiPort);
      console.log(`✅ Freed up port ${apiPort}`);
    } else {
      console.log('❌ Cannot start API server without port 3001. Exiting.');
      process.exit(1);
    }
  }

  console.log('✅ Both ports are available');
  console.log('🔧 Starting React app...');

  // Start React app on port 3000
  const reactChild = spawn('react-scripts', ['start'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(reactPort),
      GENERATE_SOURCEMAP: 'false',
      BROWSER: 'none',
      CI: 'true',
    },
  });

  // Wait a moment for React to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🔧 Starting API server...');

  // Start API server on port 3001 using tsx directly
  const apiChild = spawn('tsx', ['watch', '--tsconfig', 'tsconfig.json', 'src/server-simple.ts'], {
    stdio: 'inherit',
    cwd: './api',
    shell: true,
    env: {
      ...process.env,
      PORT: String(apiPort),
      NYT_API_KEY: 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7',
      REDIS_URL: 'rediss://default:AUEYAAIncDIzZGVmMmQ1ZTVmMTg0MzI1Yjk3ZmEwMDBiZWRkNTg4YnAyMTY2NjQ@hardy-jackass-16664.upstash.io:6379',
      UPSTASH_REDIS_REST_URL: 'https://hardy-jackass-16664.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'AUEYAAIncDIzZGVmMmQ1ZTVmMTg0MzI1Yjk3ZmEwMDBiZWRkNTg4YnAyMTY2NjQ',
      BUILD_ID: 'vercel-caching-v1',
      CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001,https://nyt.brainvaultdev.com',
    },
  });

  // Handle process exits
  reactChild.on('exit', (code) => {
    console.log(`React app exited with code ${code}`);
    apiChild.kill();
    process.exit(code ?? 0);
  });

  apiChild.on('exit', (code) => {
    console.log(`API server exited with code ${code}`);
    reactChild.kill();
    process.exit(code ?? 0);
  });

  reactChild.on('error', (err) => {
    console.error('Failed to start React app:', err);
    apiChild.kill();
    process.exit(1);
  });

  apiChild.on('error', (err) => {
    console.error('Failed to start API server:', err);
    reactChild.kill();
    process.exit(1);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down both servers...');
    reactChild.kill();
    apiChild.kill();
    process.exit(0);
  });

  console.log('');
  console.log('🎉 Both servers are starting!');
  console.log('');
  console.log('📱 React App: http://localhost:3000');
  console.log('🔧 API Server: http://localhost:3001');
  console.log('📊 Cache Status: http://localhost:3001/api/v1/cache/status');
  console.log('❤️  Health Check: http://localhost:3001/health');
  console.log('');
  console.log('Press Ctrl+C to stop both servers');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
