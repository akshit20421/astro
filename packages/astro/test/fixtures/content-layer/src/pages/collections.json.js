import { getCollection, getEntry } from 'astro:content';
import * as devalue from 'devalue';

export async function GET() {
	const customLoader = await getCollection('blog', (entry) => {
		return entry.data.id < 6;
	});
	const fileLoader = await getCollection('dogs');

	const dataEntry = await getEntry('dogs', 'beagle');

	const simpleLoader = await getCollection('cats');

	const entryWithReference = await getEntry('spacecraft', 'columbia-copy');
	const referencedEntry = await getEntry(entryWithReference.data.cat);

	const increment = await getEntry('increment', 'value');

	return new Response(
		devalue.stringify({
			customLoader,
			fileLoader,
			dataEntry,
			simpleLoader,
			entryWithReference,
			referencedEntry,
			increment,
		})
	);
}
