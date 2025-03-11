const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Get command line arguments
const args = process.argv.slice(2);

// Assert that the number of arguments is 6
if (args.length !== 6) {
    console.error('Please specify all required parameters: --project <project> --user <username> --host <hostname_or_ip> --path <destination_path> --password <password>');
    process.exit(1);
}

let project = args[1];
let vpsUser = args[2];
let vpsHost = args[3];
let vpsPath = args[4];
let vpsPassword = args[5];

// Validate required parameters
if (!project || !['bot', 'api', 'dashboard'].includes(project)) {
    console.error('Please specify a valid project: --project bot|api|dashboard');
    process.exit(1);
}

if (!vpsUser) {
    console.error('Missing required parameter: --user <username>');
    process.exit(1);
}

if (!vpsHost) {
    console.error('Missing required parameter: --host <hostname_or_ip>');
    process.exit(1);
}

if (!vpsPath) {
    console.error('Missing required parameter: --path <destination_path>');
    process.exit(1);
}

const deployDir = path.join(__dirname, '..', 'deploy', project);

console.log(`Deploying ${project} to VPS...`);
console.log(`Target: ${vpsUser}@${vpsHost}:${vpsPath}/${project}/`);

// Deploy using Node.js SFTP client
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const deploy = async () => {
    try {
        await sftp.connect({
            host: vpsHost,
            port: 22,
            username: vpsUser,
            password: vpsPassword,
        });

        // Create remote directory if it doesn't exist
        const remoteDir = `${vpsPath}/${project}`;
        try {
            await sftp.mkdir(remoteDir, true);
        } catch (err) {
            console.log('Directory already exists or could not be created');
        }

        // Upload all files from the deploy directory
        console.log(`Uploading files to ${remoteDir}...`);
        const files = getAllFiles(deployDir);
        
        // Track progress
        let uploaded = 0;
        const totalFiles = files.length;
        
        for (const file of files) {
            const relativePath = path.relative(deployDir, file);
            const remoteFilePath = `${remoteDir}/${relativePath.replace(/\\/g, '/')}`;
            const remoteFileDir = path.dirname(remoteFilePath);
            
            // Create directory structure if needed
            try {
                await sftp.mkdir(remoteFileDir, true);
            } catch (err) {
                // Ignore errors - directory might already exist
            }
            
            // Upload the file
            await sftp.put(file, remoteFilePath);
            uploaded++;
            console.log(`Uploaded [${uploaded}/${totalFiles}]: ${relativePath}`);
        }

        console.log(`${project} deployed successfully to ${vpsHost}:${vpsPath}/${project}/`);
    } catch (err) {
        console.error('Deployment failed:', err.message);
        process.exit(1);
    } finally {
        sftp.end();
    }
};

// Helper function to get all files in a directory recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}

// Run deployment
deploy();