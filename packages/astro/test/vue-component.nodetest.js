import assert from 'node:assert/strict';
import { before, describe, it, after } from 'node:test';
import * as cheerio from 'cheerio';
import { isWindows, loadFixture } from './test-utils.js';

describe('Vue component', () => {
	let fixture;

	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/vue-component/',
		});
	});

	describe('build', () => {
		before(async () => {
			await fixture.build();
		});

		it('Can load Vue', async () => {
			const html = await fixture.readFile('/index.html');
			const $ = cheerio.load(html);

			const allPreValues = $('pre')
				.toArray()
				.map((el) => $(el).text());

			// test 1: renders all components correctly
			assert.deepEqual(allPreValues, ['0', '1', '1', '1', '10', '100', '1000']);

			// test 2: renders 3 <astro-island>s
			assert.equal($('astro-island').length, 6);

			// test 3: all <astro-island>s have uid attributes
			assert.equal($('astro-island[uid]').length, 6);

			// test 4: treats <my-button> as a custom element
			assert.equal($('my-button').length, 7);

			// test 5: components with identical render output and props have been deduplicated
			const uniqueRootUIDs = $('astro-island').map((i, el) => $(el).attr('uid'));
			assert.equal(new Set(uniqueRootUIDs).size, 5);

			// test 6: import public files work
			assert.ok($('#vue-img'));
		});
	});

	if (isWindows) return;

	describe('dev', () => {
		let devServer;

		before(async () => {
			devServer = await fixture.startDevServer();
		});

		after(async () => {
			await devServer.stop();
		});

		it('scripts proxy correctly', async () => {
			const html = await fixture.fetch('/').then((res) => res.text());
			const $ = cheerio.load(html);

			for (const script of $('script').toArray()) {
				const { src } = script.attribs;
				if (!src) continue;
				const response = await fixture.fetch(src);
				assert.equal(response.status, 200, `404: ${src}`);
			}
		});
	});
});
