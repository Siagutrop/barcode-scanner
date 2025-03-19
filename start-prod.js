import { exec } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Démarrer le serveur backend en mode production
const startServer = () => {
  const serverProcess = exec('npm run prod', {
    cwd: join(__dirname, 'server')
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`);
  });

  return serverProcess;
};

// Démarrer le serveur frontend en mode production
const startFrontend = () => {
  const frontendProcess = exec('npm run preview', {
    cwd: __dirname
  });

  frontendProcess.stdout.on('data', (data) => {
    console.log(`[Frontend] ${data}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`[Frontend Error] ${data}`);
  });

  return frontendProcess;
};

// Gestion propre de l'arrêt
const processes = [];

process.on('SIGINT', () => {
  console.log('\nArrêt des processus...');
  processes.forEach(proc => proc.kill());
  process.exit(0);
});

// Démarrer les services
console.log('Démarrage des services...');
processes.push(startServer());
setTimeout(() => {
  processes.push(startFrontend());
}, 2000); // Attendre 2 secondes que le serveur soit prêt
