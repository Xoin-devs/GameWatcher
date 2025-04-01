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
fs.copyFileSync(
  path.join(rootDir, `.env.${env}`),
  path.join(targetDir, `.env.${env}`)
);

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