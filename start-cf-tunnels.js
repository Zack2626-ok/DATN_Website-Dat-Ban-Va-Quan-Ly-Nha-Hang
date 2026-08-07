const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function startCloudflareTunnel(port, prefix) {
  return new Promise((resolve, reject) => {
    const cf = spawn('.\\cloudflared.exe', ['tunnel', '--url', `http://localhost:${port}`]);
    let urlFound = false;

    cf.stderr.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !urlFound) {
        urlFound = true;
        resolve({ url: match[0], process: cf });
      }
    });

    cf.on('close', (code) => {
      if (!urlFound) {
        reject(new Error(`Cloudflare tunnel on port ${port} closed unexpectedly with code ${code}`));
      } else {
        console.log(`${prefix} tunnel closed.`);
      }
    });
  });
}

(async () => {
  console.log("Starting Cloudflare Tunnels (this may take 5-10 seconds)...");
  try {
    const beTunnel = await startCloudflareTunnel(5000, 'Backend');
    console.log("Backend URL:", beTunnel.url);

    const feTunnel = await startCloudflareTunnel(5173, 'Frontend');
    console.log("Frontend URL:", feTunnel.url);

    // Cập nhật be/.env
    const beEnvPath = path.join(__dirname, 'be', '.env');
    let beEnv = fs.readFileSync(beEnvPath, 'utf8');
    beEnv = beEnv.replace(/FRONTEND_URL=.*/, `FRONTEND_URL=${feTunnel.url}`);
    fs.writeFileSync(beEnvPath, beEnv);
    console.log("Updated be/.env");

    // Cập nhật fe/.env
    const feEnvPath = path.join(__dirname, 'fe', '.env');
    let feEnv = fs.readFileSync(feEnvPath, 'utf8');
    feEnv = feEnv.replace(/VITE_API_URL=.*/, `VITE_API_URL=${beTunnel.url}/api`);
    fs.writeFileSync(feEnvPath, feEnv);
    console.log("Updated fe/.env");

    console.log("-----------------------------------------");
    console.log("Cloudflare Tunnels are active!");
    console.log("Please restart your Backend and Frontend servers now.");
    console.log("To keep the URLs active, leave this terminal open.");

  } catch (err) {
    console.error("Error starting tunnels:", err);
  }
})();
