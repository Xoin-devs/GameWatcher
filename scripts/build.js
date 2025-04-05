const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the target project from command line args
const project = process.argv[2]; // 'bot', 'api', or 'dashboard'
const env = process.argv[3] || 'prod'; // 'dev' or 'prod'

if (!['bot', 'api', 'dashboard'].includes(project)) {
  console.error('Please specify a valid project: bot, api, or dashboard');
  process.exit(1);
}

// Define paths using path.join for Windows compatibility
const rootDir = path.join(__dirname, '..');
const projectDir = path.join(rootDir, project);
const targetDir = path.join(rootDir, 'deploy', project);
const sharedDir = path.join(rootDir, 'shared');
const targetSharedDir = path.join(targetDir, 'shared');

// Create deploy directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Clean target directory (remove everything)
console.log(`Cleaning ${targetDir}...`);
fs.readdirSync(targetDir).forEach(file => {
  const filePath = path.join(targetDir, file);
  if (fs.lstatSync(filePath).isDirectory()) {
    fs.rmSync(filePath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(filePath);
  }
});

// Copy project files using robocopy for Windows
console.log(`Copying ${project} files...`);
try {
  // Using robocopy for more robust copying with /MIR (mirror directory tree) /R:0 (no retries) /W:0 (no wait)
  execSync(`robocopy "${projectDir}" "${targetDir}" /MIR /R:0 /W:0`);
} catch (error) {
  console.log('Warning: Some files might be in use. Continuing...');
}

// Create shared directory and copy files
console.log('Copying shared folder...');
if (!fs.existsSync(targetSharedDir)) {
  fs.mkdirSync(targetSharedDir, { recursive: true });
}
try {
  execSync(`xcopy "${sharedDir}" "${targetSharedDir}" /E /Y /I`);
} catch (error) {
  console.log('Warning: Some shared files might be in use. Continuing...');
}

// Copy environment file
console.log(`Copying .env.${env} file...`);
const envSource = path.join(rootDir, `.env.${env}`);
const envDest = path.join(targetDir, `.env.${env}`);

// Copy the env file first
fs.copyFileSync(envSource, envDest);

// If deploying dev environment to VPS, modify the env file
if (env === 'dev') {
  console.log('Preparing .env.dev file for VPS deployment...');
  
  let envContent = fs.readFileSync(envDest, 'utf8');
  
  // Replace localhost URLs with VPS URLs
  envContent = envContent.replace(
    /DISCORD_CALLBACK_URL=http:\/\/localhost:[0-9]+\/auth\/callback/,
    'DISCORD_CALLBACK_URL=https://54.36.98.165/auth/callback'
  );
  
  envContent = envContent.replace(
    /WEB_URL=http:\/\/localhost/,
    'WEB_URL=https://54.36.98.165'
  );
  
  envContent = envContent.replace(
    /API_ENDPOINT=http:\/\/localhost/,
    'API_ENDPOINT=http://54.36.98.165'  // Changed from https to http
  );
  
  // Write modified content back to the env file
  fs.writeFileSync(envDest, envContent);
  console.log('ENV file modified for VPS environment');
  
  // Modify ecosystem.config.js to add "-dev" to app name for dev builds
  console.log('Modifying ecosystem.config.js to add "-dev" suffix to app name...');
  const ecosystemPath = path.join(targetDir, 'ecosystem.config.js');
  
  if (fs.existsSync(ecosystemPath)) {
    let ecosystemContent = fs.readFileSync(ecosystemPath, 'utf8');
    
    // Add "-dev" suffix to app name
    ecosystemContent = ecosystemContent.replace(
      /name: ['"]gamewatcher-[^'"]+['"]/g,
      (match) => match.replace(/['"]$/, '-dev\'')
    );
    
    // Write modified content back to the ecosystem file
    fs.writeFileSync(ecosystemPath, ecosystemContent);
    console.log('Ecosystem config modified to use dev app name');
  } else {
    console.log('Warning: ecosystem.config.js not found in target directory');
  }
}

// Merge package.json files from root and project
console.log('Merging package.json files...');
const rootPackageJson = require('../package.json');
const projectPackageJson = require(`../${project}/package.json`);

// Create a deep merged package.json
const mergedPackageJson = {
  // Start with project package.json as base
  ...projectPackageJson,
  
  // Merge dependencies
  dependencies: {
    ...(rootPackageJson.dependencies || {}),
    ...(projectPackageJson.dependencies || {})
  },
  
  // Merge devDependencies
  devDependencies: {
    ...(rootPackageJson.devDependencies || {}),
    ...(projectPackageJson.devDependencies || {})
  },
};

// Determine the appropriate subdirectory for each project
const getProjectSubdir = (projectName) => {
  switch(projectName) {
    case 'api': return './src';
    case 'bot': return './app';
    case 'dashboard': return './app';
    default: return '.';
  }
};

// Only include the @shared module alias, not all aliases
mergedPackageJson._moduleAliases = {
  '@shared': './shared',
  [`@${project}`]: getProjectSubdir(project)
};

// Write the merged package.json to the target directory
fs.writeFileSync(
  path.join(targetDir, 'package.json'),
  JSON.stringify(mergedPackageJson, null, 2)
);


console.log(`${project} package ready for deployment at ${targetDir}`);