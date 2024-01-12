import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import arg from 'arg';
import glob from 'tiny-glob';

const isCI = !!process.env.CI;
const defaultTimeout = isCI ? 30000 : 20000;

export default async function test() {
	const args = arg({
		'--match': String, // aka --test-name-pattern: https://nodejs.org/api/test.html#filtering-tests-by-name
		'--only': Boolean, // aka --test-only: https://nodejs.org/api/test.html#only-tests
		'--parallel': Boolean, // aka --test-concurrency: https://nodejs.org/api/test.html#test-runner-execution-model
		'--watch': Boolean, // experimental: https://nodejs.org/api/test.html#watch-mode
		'--timeout': Number, // Test timeout in milliseconds (default: 30000ms)
		'--setup': String, // Test setup file
		// Aliases
		'-m': '--match',
		'-o': '--only',
		'-p': '--parallel',
		'-w': '--watch',
		'-t': '--timeout',
		'-s': '--setup',
	});

	const pattern = args._[1];
	if (!pattern) throw new Error('Missing test glob pattern');

	const files = await glob(pattern, { filesOnly: true, absolute: true });

	// For some reason, the `only` option does not work and we need to explicitly set the CLI flag instead.
	// Node.js requires opt-in to run .only tests :(
	// https://nodejs.org/api/test.html#only-tests
	if (args['--only']) {
		process.env.NODE_OPTIONS ??= '';
		process.env.NODE_OPTIONS += ' --test-only';
	}

	// https://nodejs.org/api/test.html#runoptions
	run({
		files,
		testNamePatterns: args['--match'],
		concurrency: args['--parallel'],
		only: args['--only'],
		setup: args['--setup'],
		watch: args['--watch'],
		timeout: args['--timeout'] ?? defaultTimeout, // Node.js defaults to Infinity, so set better fallback
	})
		.pipe(new spec())
		.pipe(process.stdout);
}
