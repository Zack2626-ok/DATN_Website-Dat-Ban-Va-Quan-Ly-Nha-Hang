const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Starting tunnels...");
  try {
    const beTunnel = await localtunnel({ port: 5000 });
    const feTunnel = await localtunnel({ port: 5173 });

    console.log("Backend URL:", beTunnel.url);
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
    console.log("Tunnels are active!");
    console.log("Please restart your Backend and Frontend servers now.");
    console.log("To keep the URLs active, leave this terminal open.");
    
    beTunnel.on('close', () => {
      console.log('Backend tunnel closed');
    });
    feTunnel.on('close', () => {
      console.log('Frontend tunnel closed');
    });

  } catch (err) {
    console.error("Error starting tunnels:", err);
  }
})();
