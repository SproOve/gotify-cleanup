import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf-8'));
const { key, baseUrl } = config;

const apps = {
    key,
    baseUrl,
};

console.log('Application initialized with the following configuration:', apps);