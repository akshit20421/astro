import type { AstroConfig } from 'astro';
import type { Arguments } from 'yargs-parser';
import { loadDbConfigFile } from '../load-file.js';
import { dbConfigSchema } from '../types.js';

export async function cli({
	flags,
	config: astroConfig,
}: {
	flags: Arguments;
	config: AstroConfig;
}) {
	const args = flags._ as string[];
	// Most commands are `astro db foo`, but for now login/logout
	// are also handled by this package, so first check if this is a db command.
	const command = args[2] === 'db' ? args[3] : args[2];
	const { mod } = await loadDbConfigFile(astroConfig.root);
	// TODO: parseConfigOrExit()
	const dbConfig = dbConfigSchema.parse(mod?.default ?? {});

	switch (command) {
		case 'shell': {
			const { cmd } = await import('./commands/shell/index.js');
			return await cmd({ astroConfig, dbConfig, flags });
		}
		case 'gen': {
			console.log('"astro db gen" is no longer needed! Visit the docs for more information.');
			return;
		}
		case 'sync': {
			console.log('"astro db sync" is no longer needed! Visit the docs for more information.');
			return;
		}
		case 'push': {
			const { cmd } = await import('./commands/push/index.js');
			return await cmd({ astroConfig, dbConfig, flags });
		}
		case 'verify': {
			const { cmd } = await import('./commands/verify/index.js');
			return await cmd({ astroConfig, dbConfig, flags });
		}
		case 'execute': {
			const { cmd } = await import('./commands/execute/index.js');
			return await cmd({ astroConfig, dbConfig, flags });
		}
		case 'login': {
			const { cmd } = await import('./commands/login/index.js');
			return await cmd({ astroConfig, dbConfig, flags });
		}
		case 'logout': {
			const { cmd } = await import('./commands/logout/index.js');
			return await cmd();
		}
		case 'link': {
			const { cmd } = await import('./commands/link/index.js');
			return await cmd();
		}
		default: {
			if (command == null) {
				console.error(`No command provided.

${showHelp()}`);
			} else {
				console.error(`Unknown command: ${command}

${showHelp()}`);
			}
			return;
		}
	}

	function showHelp() {
		return `astro db <command>
		
Usage:

astro login          Authenticate your machine with Astro Studio
astro logout         End your authenticated session with Astro Studio
astro link           Link this directory to an Astro Studio project

astro db gen         Creates snapshot based on your schema
astro db push        Pushes schema updates to Astro Studio
astro db verify      Tests schema updates /w Astro Studio (good for CI)`;
	}
}
