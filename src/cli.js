#!/usr/bin/env node

import { SyncLock } from './syncLock.js';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Command } from 'commander';
import inquirer from 'inquirer';
import fsPromises from 'fs/promises'; // Promise-based fs for async operations
import path from 'path';
import config from './config.js'; // This now works
import RobloxAPI from './RobloxAPI.js';
import { EnvManager } from './envManager.js';

// Initialize the API module with the loaded configuration
RobloxAPI.init(config);

const program = new Command();
program.version('1.0.0').name('rbxproducts').description('Roblox Open Cloud Game Pass Management Tool');

// This is the absolute path to your CLI's folder (e.g., .../node_modules/rbxproducts/)
const __filename = fileURLToPath(import.meta.url);
const CLI_ROOT = path.dirname(__filename);

// This points to your internal template
const INTERNAL_TEMPLATE_PATH = path.join(CLI_ROOT, 'assets', 'template_image.png');

// --- Utility Functions ---

// --- Global Constants ---
const PROJECT_DIR_NAME = '.products'; // The hidden folder to hold all files
const CONFIG_FILE_NAME = 'products.json';
const IMAGES_FOLDER_NAME = 'images';
const CWD = process.cwd();

function getFileHash(filePath) {
    if (!filePath || filePath === "") return null;
    if (!fs.existsSync(filePath)) return null;

    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

/**
 * Resolves the absolute path to our dedicated project folder (.gpass)
 * in the user's current working directory.
 */
function getProjectPath() {
    return path.join(CWD, PROJECT_DIR_NAME);
}

/** Converts file size to human-readable format */
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- CLI COMMANDS ---

program
    .command('newgp')
    .description('Create a new Game Pass.')
    // NOTE: You are defining the Name option TWICE here, 
    // once with a short flag and once with a long flag.
    .option('-n, --name <name>', 'The name of the Game Pass', undefined, true)

    // The option definition for price is correct
    .option('-p, --price <number>', 'The price in Robux', (value) => parseInt(value, 10))

    // The rest of your options are fine
    .option('-i, --image [path]', 'The path to the image file (e.g., ./vip.png)')
    .option('-d, --desc [text]', 'A description for the Game Pass', '')
    .action(async (options) => {
        try {

            const name = String(options.name)
            const price = Number(options.price)
            let imagePath = options.image

            // use template gamepass image if image is not provided.
            if (!imagePath || !String(imagePath)) { imagePath = './assets/template_gamepass_image.png' }

            let desc = options.desc

            // use template description

            if (!String(desc)) { desc = 'No description provided.' }

            console.log(`\nCreating gamepass with name: ${name}, price: ${price}, description: ${desc}.`)

            const currentPasses = await RobloxAPI.listGamePasses();
            const existing = currentPasses.find(p => p.name == name)

            if (existing) { console.error(`There already exists a gamepass with name: ${name}. Try using another name!`); return; }

            console.log(`\nAttempting to create Game Pass: "${name}"...`);

            const passId = await RobloxAPI.createGamePass({
                name: name,
                description: desc,
                iconPath: imagePath,
                price: price
            })

            console.log('\n✅ Game Pass Created Successfully!');
            console.log(`   ID: ${passId}`);
        } catch (error) {
            console.error('Error creating pass:', error.message);
        }
    });

program
    .command('newdp')
    .description('Create a new Dev Product.')
    // NOTE: You are defining the Name option TWICE here, 
    // once with a short flag and once with a long flag.
    .option('-n, --name <name>', 'The name of the Dev Product', undefined, true)

    // The option definition for price is correct
    .option('-p, --price <number>', 'The price in Robux', (value) => parseInt(value, 10))

    // The rest of your options are fine
    .option('-i, --image [path]', 'The path to the image file (e.g., ./vip.png)')
    .option('-d, --desc [text]', 'A description for the Dev Product', '')
    .action(async (options) => {
        try {

            const name = String(options.name)
            const price = Number(options.price)
            let imagePath = options.image

            // use template gamepass image if image is not provided.
            if (!imagePath || !String(imagePath)) { imagePath = './assets/template_image.png' }

            let desc = options.desc

            // use template description

            if (!String(desc)) { desc = 'No description provided.' }

            console.log(`\nCreating Dev Product with name: ${name}, price: ${price}, description: ${desc}.`)

            const currentPasses = await RobloxAPI.listGamePasses();
            const existing = currentPasses.find(p => p.name == name)

            if (existing) { console.error(`There already exists a dev product with name: ${name}. Try using another name!`); return; }

            console.log(`\nAttempting to create Dev Product: "${name}"...`);

            const productId = await RobloxAPI.createDevProduct({
                name: name,
                description: desc,
                iconPath: imagePath,
                price: price
            })

            console.log('\n✅ Dev Product Created Successfully!');
            console.log(`   ID: ${productId}`);
        } catch (error) {
            console.error('Error creating Dev Product:', error.message);
        }
    });

program
    .command('batch-setup')
    .description(`Initialize a dedicated ${PROJECT_DIR_NAME} working directory and config file.`)
    .action(async () => {
        const projectPath = getProjectPath();
        const imagesPath = path.join(projectPath, IMAGES_FOLDER_NAME);
        const projectAssetsPath = path.join(projectPath, 'assets');
        const configPath = path.join(projectPath, CONFIG_FILE_NAME);

        if (fs.existsSync(projectPath)) {
            console.warn(`\n⚠️ Warning: Project folder already exists at ${projectPath}.`);
            console.log('   Aborting setup to prevent overwriting files.');
            console.log('   If you wish to re-initialize, please delete the .gpass folder first.');
            return; // Exit the command
        }

        try {
            // 1. Create the main project directory
            await fsPromises.mkdir(projectAssetsPath, { recursive: true });
            console.log(`✅ Created project folder: ${projectPath}`);

            // 2. COPY the template from your CLI source to the user's project
            if (fs.existsSync(INTERNAL_TEMPLATE_PATH)) {
                const destPath = path.join(projectAssetsPath, 'template_image.png');
                await fsPromises.copyFile(INTERNAL_TEMPLATE_PATH, destPath);
                console.log(`✅ Initialized project template image.`);
            }

            // 2. Create the images subdirectory
            await fsPromises.mkdir(imagesPath, { recursive: true });
            console.log(`✅ Created images folder: ${imagesPath}`);

            // 3. Create the initial config file (JSON template)
            const templateConfig = JSON.stringify([
                {
                    name: "New gamepass Example",
                    type: "Gamepass",
                    price: 150,
                    image: `${IMAGES_FOLDER_NAME}/example.png`, // Relative path INSIDE the project folder
                    desc: "Edit this description, set ignore = false and add your image!",
                    ignore: true, // Opts out, doesn't resolve or update anything
                },
                {
                    name: "New Devproduct Example",
                    type: "DevProduct",
                    price: 50,
                    image: `${IMAGES_FOLDER_NAME}/example.png`, // Relative path INSIDE the project folder
                    desc: "Edit this description, set ignore = false and add your image!",
                    ignore: true, // Opts out, doesn't resolve or update anything
                }
            ], null, 2);

            await fsPromises.writeFile(configPath, templateConfig, 'utf-8');
            console.log(`✅ Created template config: ${configPath}`);

            console.log(`\nNext Steps:`);
            console.log(`1. Place your image files inside: ${imagesPath}`);
            console.log(`2. Edit the config file and update the 'image' paths (relative to ${PROJECT_DIR_NAME}).`);
            console.log(`3. Run 'gpass batch' to create the Game Passes.`);

        } catch (error) {
            console.error('❌ Failed to set up the environment:', error.message);
        }
    })

program
    .command('batch-update')
    .description(`Reads the ${CONFIG_FILE_NAME} config and creates/updates assets as needed.`)
    .action(async () => {
        const projectPath = getProjectPath();
        const configPath = path.join(projectPath, CONFIG_FILE_NAME);

        if (!fs.existsSync(configPath)) {
            console.error(`❌ Error: Config file not found at ${configPath}.`);
            return;
        }

        try {
            const data = await fsPromises.readFile(configPath, 'utf-8');
            const items = JSON.parse(data);

            if (!Array.isArray(items) || items.length === 0) {
                console.log("⚠️ Config file is empty. Nothing to do.");
                return;
            }

            // 1. Fetch live data once at the start
            const [gamepasses, devProducts] = await Promise.all([
                RobloxAPI.listGamePasses(),
                RobloxAPI.listDevProducts()
            ]);

            console.log(`\nFound ${items.length} assets in config. Syncing with Roblox...`);

            for (const item of items) {
                if (item.ignore) continue;

                const assetType = item.type;
                let absoluteImagePath = path.join(projectPath, item.image);

                // Check for existence
                let liveAsset = null;
                let id = 0;

                if (assetType === 'Gamepass') {
                    liveAsset = gamepasses.find(v => v.name === item.name);
                    id = liveAsset?.gamePassId;
                } else if (assetType === 'DevProduct') {
                    liveAsset = devProducts.find(v => v.name === item.name);
                    id = liveAsset?.productId;
                }

                try {
                    if (liveAsset) {
                        // --- DIFFING LOGIC: Find what changed ---
                        const changes = {};

                        // Check Price
                        const livePrice = liveAsset.priceInformation?.defaultPriceInRobux;
                        if (item.price !== livePrice) {
                            changes.price = item.price;
                        }

                        // 1. Description: Only update if not empty and actually different
                        if (item.desc && item.desc !== "" && item.desc !== liveAsset.description) {
                            changes.description = item.desc;
                        }

                        const lock = SyncLock.get();
                        const id = liveAsset.gamePassId || liveAsset.productId;
                        let currentHash = null;

                        if (item.image && item.image !== "") {
                            const absoluteImagePath = path.resolve(projectPath, item.image);

                            if (fs.existsSync(absoluteImagePath)) {
                                currentHash = getFileHash(absoluteImagePath);
                                const lastHash = lock[id];

                                // Only upload if we've never uploaded it, or if the file changed
                                if (currentHash !== lastHash) {
                                    changes.iconPath = absoluteImagePath;
                                    SyncLock.set(id, currentHash);
                                } else {
                                    //console.warn(`✨ ${assetType} "${item.name}": Image unchanged. Skipping upload.`);
                                }
                            } else {
                                console.warn(`⚠️ ${assetType} "${item.name}": Image file not found at ${absoluteImagePath}. Skipping image update.`);
                            }
                        }

                        // Check Name (In case casing changed)
                        if (item.name !== liveAsset.name) {
                            changes.name = item.name;
                        }

                        // Check isForSale
                        if ((item.isForSale || true) !== liveAsset.isForSale) {
                            changes.isForSale = item.isForSale || true;
                        }

                        // --- EXECUTION ---
                        if (Object.keys(changes).length === 0) {
                            console.log(`✨ ${assetType} "${item.name}": Up to date. Skipping.`);
                            continue;
                        }

                        console.log(`\n➡️ Updating ${assetType}: "${item.name}"...`);
                        console.log(`   🛠️  Changes: ${Object.keys(changes).join(', ')}`);

                        if (assetType === 'Gamepass') {
                            await RobloxAPI.updateGamepass({ id, ...changes });
                        } else {
                            await RobloxAPI.updateDevProduct({ id, ...changes });
                        }
                        console.log(`   ✅ Updated ID: ${id}`);

                    } else {

                        let imagePath = item.image;

                        // use template gamepass image if image is not provided.
                        if (!imagePath || !String(imagePath)) {
                            absoluteImagePath = INTERNAL_TEMPLATE_PATH
                        }

                        console.log("\n--- IMAGE PATH ---");
                        console.log(absoluteImagePath);

                        // --- CREATE PATH: Item doesn't exist ---
                        if (!fs.existsSync(absoluteImagePath)) {
                            console.error(`\n❌ Image missing for "${item.name}": ${absoluteImagePath}. Skipping.`);
                            continue;
                        }

                        console.log(`\n➡️ Creating ${assetType}: "${item.name}"...`);
                        let result;
                        const data = {
                            name: item.name,
                            price: item.price,
                            iconPath: absoluteImagePath,
                            description: item.desc || '',
                            isForSale: item.isForSale || true,
                        }
                        if (assetType === 'Gamepass') {
                            result = await RobloxAPI.createGamePass(data);
                        } else if (assetType === 'DevProduct') {
                            result = await RobloxAPI.createDevProduct(data);
                        }
                        console.log(`   ✅ Created ID: ${result.id || result}`);
                    }
                } catch (error) {
                    console.error(`\n❌ Error processing ${item.name}:`, error.message);
                }
            }

            console.log('\n✨ Sync complete.');

        } catch (error) {
            console.error('❌ Sync failed:', error.message);
        }
    });

// 2. LIST COMMAND (View Game Passes)
program
    .command('list')
    .description('View all existing Game Passes & Dev Products for the configured Universe ID.')
    .action(async () => {
        try {
            const universeName = await RobloxAPI.getUniverseName();
            console.log(`\nRetrieving Products for "${universeName}" (Universe ID: ${process.env.UNIVERSE_ID})`);

            const passes = await RobloxAPI.listGamePasses();
            const products = await RobloxAPI.listDevProducts();

            // --- GAME PASSES SECTION ---
            console.log(`\n--- Found ${passes.length} Game Passes ---`);
            if (passes.length === 0) {
                console.log('No Game Passes found.');
            } else {
                passes.forEach(p => {
                    const id = p.gamePassId;
                    const price = p.priceInformation ? p.priceInformation.defaultPriceInRobux : 'N/A';

                    // Clean up description: remove newlines and cap length for display
                    const desc = p.description
                        ? p.description.replace(/\n/g, ' ').substring(0, 50) + (p.description.length > 50 ? '...' : '')
                        : 'No description';

                    console.log(`ID: ${String(id).padEnd(15)} | Price: ${String(price).padEnd(6)} | Name: ${p.name.padEnd(25)} | Desc: ${desc}`);
                });
            }

            // --- DEV PRODUCTS SECTION ---
            console.log(`\n--- Found ${products.length} Dev Products ---`);
            if (products.length === 0) {
                console.log('No Dev Products found.');
            } else {
                products.forEach(p => {
                    const id = p.productId;
                    const price = p.priceInformation ? p.priceInformation.defaultPriceInRobux : 'N/A';

                    const desc = p.description
                        ? p.description.replace(/\n/g, ' ').substring(0, 50) + (p.description.length > 50 ? '...' : '')
                        : 'No description';

                    console.log(`ID: ${String(id).padEnd(15)} | Price: ${String(price).padEnd(6)} | Name: ${p.name.padEnd(25)} | Desc: ${desc}`);
                });
            }

            console.log('');

        } catch (error) {
            console.error('❌ Error listing assets:', error.message);
        }
    });

program
    .command('setup')
    .description('Interactive setup to configure your Roblox API credentials')
    .option('-l, --list', 'List all current configurations')
    .action(async (options) => {
        const currentVars = EnvManager.getAll();

        if (options.list) {
            console.log('\n--- ⚙️  Current Configuration ---');
            Object.entries(currentVars).forEach(([k, v]) => {
                const secret = k.includes('KEY') ? '********' : v;
                console.log(`${k.padEnd(20)}: ${secret}`);
            });
            return;
        }

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'ROBLOX_API_KEY',
                message: 'Enter your Roblox API Key:',
                default: currentVars.ROBLOX_API_KEY
            },
            {
                type: 'input',
                name: 'UNIVERSE_ID',
                message: 'Enter your Universe ID:',
                default: currentVars.UNIVERSE_ID
            },
            {
                type: 'input',
                name: 'CREATOR_USER_ID',
                message: 'Enter your Creator User ID:',
                default: currentVars.CREATOR_USER_ID
            }
        ]);

        EnvManager.set('ROBLOX_API_KEY', answers.ROBLOX_API_KEY);
        EnvManager.set('UNIVERSE_ID', answers.UNIVERSE_ID);
        EnvManager.set('CREATOR_USER_ID', answers.CREATOR_USER_ID);

        console.log('\n✅ Configuration saved to global installation directory!');
    });

program
    .command('output-lua')
    .description('Generate a consolidated Products.lua file with dual mapping')
    .action(async () => {
        try {
            console.log("📡 Fetching live data for consolidated Lua export...");
            const [passes, products] = await Promise.all([
                RobloxAPI.listGamePasses(),
                RobloxAPI.listDevProducts()
            ]);

            let luaContent = `--[[ 
    AUTO-GENERATED BY RBXPRODUCTS CLI
    Generated on: ${new Date().toLocaleString()}
]]\n\n`;

            luaContent += "local Products = {\n";

            // 1. Map Gamepasses
            luaContent += "    Gamepasses = {\n";
            passes.forEach(p => {
                const iconId = (p.iconAssetId || p.iconImageAssetId) ? `"rbxassetid://${p.iconAssetId || p.iconImageAssetId}"` : "nil";
                luaContent += `        ["${p.name}"] = { Name = "${p.name}", Id = ${p.gamePassId}, ImageId = ${iconId} },\n`;
            });
            luaContent += "    },\n\n";

            // 2. Map DevProducts
            luaContent += "    DevProducts = {\n";
            products.forEach(p => {
                const iconId = p.iconAssetId || p.iconImageAssetId ? `"rbxassetid://${p.iconAssetId || p.iconImageAssetId}"` : "nil";
                luaContent += `        ["${p.name}"] = { Name = "${p.name}", Id = ${p.productId}, ImageId = ${iconId} },\n`;
            });
            luaContent += "    },\n\n";

            // 3. Create the ID Lookup Tables (using references)
            luaContent += "    GamepassById = {},\n";
            luaContent += "    DevProductById = {},\n";
            luaContent += "}\n\n";

            // Loop through the table we just built to link the IDs
            luaContent += "-- Setup ID-based references\n";
            luaContent += "for _, item in pairs(Products.Gamepasses) do Products.GamepassById[item.Id] = item end\n";
            luaContent += "for _, item in pairs(Products.DevProducts) do Products.DevProductById[item.Id] = item end\n\n";

            luaContent += "return Products";

            const outputPath = path.join(process.cwd(), 'Products.lua');
            fs.writeFileSync(outputPath, luaContent);

            console.log(`✅ Success! Consolidated Products.lua generated.`);

        } catch (error) {
            console.error("❌ Export failed:", error.message);
        }
    });

program.parse(process.argv);
