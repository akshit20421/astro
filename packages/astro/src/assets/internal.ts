import { isRemotePath } from '@astrojs/internal-helpers/path';
import type { AstroConfig, AstroSettings } from '../@types/astro.js';
import { AstroError, AstroErrorData } from '../core/errors/index.js';
import { DEFAULT_HASH_PROPS } from './consts.js';
import { isLocalService, type ImageService } from './services/service.js';
import type {
	GetImageResult,
	ImageMetadata,
	ImageTransform,
	SrcSetValue,
	UnresolvedImageTransform,
} from './types.js';
import { matchHostname, matchPattern } from './utils/remotePattern.js';

export function injectImageEndpoint(settings: AstroSettings, mode: 'dev' | 'build') {
	const endpointEntrypoint =
		settings.config.image.endpoint ??
		(mode === 'dev' ? 'astro/assets/endpoint/node' : 'astro/assets/endpoint/generic');

	settings.injectedRoutes.push({
		pattern: '/_image',
		entrypoint: endpointEntrypoint,
		prerender: false,
	});

	return settings;
}

export function isESMImportedImage(src: ImageMetadata | string): src is ImageMetadata {
	return typeof src === 'object';
}

export function isRemoteImage(src: ImageMetadata | string): src is string {
	return typeof src === 'string';
}

export function isRemoteAllowed(
	src: string,
	{
		domains = [],
		remotePatterns = [],
	}: Partial<Pick<AstroConfig['image'], 'domains' | 'remotePatterns'>>
): boolean {
	if (!isRemotePath(src)) return false;

	const url = new URL(src);
	return (
		domains.some((domain) => matchHostname(url, domain)) ||
		remotePatterns.some((remotePattern) => matchPattern(url, remotePattern))
	);
}

export async function getConfiguredImageService(): Promise<ImageService> {
	if (!globalThis?.astroAsset?.imageService) {
		const { default: service }: { default: ImageService } = await import(
			// @ts-expect-error
			'virtual:image-service'
		).catch((e) => {
			const error = new AstroError(AstroErrorData.InvalidImageService);
			(error as any).cause = e;
			throw error;
		});

		if (!globalThis.astroAsset) globalThis.astroAsset = {};
		globalThis.astroAsset.imageService = service;
		return service;
	}

	return globalThis.astroAsset.imageService;
}

export async function getImage(
	options: UnresolvedImageTransform,
	imageConfig: AstroConfig['image']
): Promise<GetImageResult> {
	if (!options || typeof options !== 'object') {
		throw new AstroError({
			...AstroErrorData.ExpectedImageOptions,
			message: AstroErrorData.ExpectedImageOptions.message(JSON.stringify(options)),
		});
	}
	if (typeof options.src === 'undefined') {
		throw new AstroError({
			...AstroErrorData.ExpectedImage,
			message: AstroErrorData.ExpectedImage.message(
				options.src,
				'undefined',
				JSON.stringify(options)
			),
		});
	}

	const service = await getConfiguredImageService();

	// If the user inlined an import, something fairly common especially in MDX, or passed a function that returns an Image, await it for them
	const resolvedOptions: ImageTransform = {
		...options,
		src:
			typeof options.src === 'object' && 'then' in options.src
				? (await options.src).default ?? (await options.src)
				: options.src,
	};

	// Clone the `src` object if it's an ESM import so that we don't refer to any properties of the original object
	// Causing our generate step to think the image is used outside of the image optimization pipeline
	const clonedSrc = isESMImportedImage(resolvedOptions.src)
		? // @ts-expect-error - clone is a private, hidden prop
		  resolvedOptions.src.clone ?? resolvedOptions.src
		: resolvedOptions.src;

	resolvedOptions.src = clonedSrc;

	const validatedOptions = service.validateOptions
		? await service.validateOptions(resolvedOptions, imageConfig)
		: resolvedOptions;

	// Get all the options for the different srcSets
	const srcSetTransforms = service.getSrcSet
		? await service.getSrcSet(validatedOptions, imageConfig)
		: [];

	let imageURL = await service.getURL(validatedOptions, imageConfig);
	let srcSets: SrcSetValue[] = await Promise.all(
		srcSetTransforms.map(async (srcSet) => ({
			transform: srcSet.transform,
			url: await service.getURL(srcSet.transform, imageConfig),
			descriptor: srcSet.descriptor,
			attributes: srcSet.attributes,
		}))
	);

	if (
		isLocalService(service) &&
		globalThis.astroAsset.addStaticImage &&
		!(isRemoteImage(validatedOptions.src) && imageURL === validatedOptions.src)
	) {
		const propsToHash = service.propertiesToHash ?? DEFAULT_HASH_PROPS;
		imageURL = globalThis.astroAsset.addStaticImage(validatedOptions, propsToHash);
		srcSets = srcSetTransforms.map((srcSet) => ({
			transform: srcSet.transform,
			url: globalThis.astroAsset.addStaticImage!(srcSet.transform, propsToHash),
			descriptor: srcSet.descriptor,
			attributes: srcSet.attributes,
		}));
	}

	return {
		rawOptions: resolvedOptions,
		options: validatedOptions,
		src: imageURL,
		srcSet: {
			values: srcSets,
			attribute: srcSets.map((srcSet) => `${srcSet.url} ${srcSet.descriptor}`).join(', '),
		},
		attributes:
			service.getHTMLAttributes !== undefined
				? await service.getHTMLAttributes(validatedOptions, imageConfig)
				: {},
	};
}
