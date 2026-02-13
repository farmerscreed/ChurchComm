const https = require('https');

const token = 'x3hIcz2btObdyTIh2K2ljbxL';

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();
    });
}

async function checkDeployments() {
    try {
        console.log("Fetching projects...");
        const projectsData = await request('/v9/projects');
        const projects = projectsData.projects || [];

        if (projects.length === 0) {
            console.log("No projects found.");
            return;
        }

        for (const project of projects) {
            console.log(`\nProject: ${project.name} (ID: ${project.id})`);
            console.log(`Live URL: https://${project.name}.vercel.app`); // Fallback URL
            if (project.targets && project.targets.production) {
                console.log(`Production Domain: ${project.targets.production.alias ? project.targets.production.alias[0] : 'N/A'}`);
            }

            console.log("Fetching latest deployment...");
            const deploymentsData = await request(`/v6/deployments?projectId=${project.id}&limit=1&target=production`);
            const deployments = deploymentsData.deployments || [];

            if (deployments.length > 0) {
                const deployment = deployments[0];
                console.log(`Latest Production Deployment:`);
                console.log(`- ID: ${deployment.uid}`);
                console.log(`- State: ${deployment.state}`);
                console.log(`- URL: https://${deployment.url}`);
                console.log(`- Created: ${new Date(deployment.created).toLocaleString()}`);
                console.log(`- Commit: ${deployment.meta.githubCommitMessage || 'N/A'}`);
                console.log(`- Commit SHA: ${deployment.meta.githubCommitSha || 'N/A'}`);
            } else {
                console.log("No production deployments found.");
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

checkDeployments();
