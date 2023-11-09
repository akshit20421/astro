import { appendForwardSlash, joinPaths } from '@astrojs/internal-helpers/path';
import type { AstroConfig } from '../@types/astro.js';
import { shouldAppendForwardSlash } from '../core/build/util.js';
import { MissingLocale } from '../core/errors/errors-data.js';
import { AstroError } from '../core/errors/index.js';

type GetLocaleRelativeUrl = GetLocaleOptions & {
	locale: string;
	base: string;
	locales: string[];
	trailingSlash: AstroConfig['trailingSlash'];
	format: AstroConfig['build']['format'];
	routingStrategy?: 'prefix-always' | 'prefix-other-locales';
	defaultLocale: string;
};

export type GetLocaleOptions = {
	/**
	 * Makes the locale URL-friendly by replacing underscores with dashes, and converting the locale to lower case.
	 * @default true
	 */
	normalizeLocale?: boolean;
	/**
	 * An optional path to add after the `locale`.
	 */
	path?: string;
	/**
	 *  An optional path to prepend to `locale`.
	 */
	prependWith?: string;
};

type GetLocaleAbsoluteUrl = GetLocaleRelativeUrl & {
	site: AstroConfig['site'];
};
/**
 * The base URL
 */
export function getLocaleRelativeUrl({
	locale,
	base,
	locales,
	trailingSlash,
	format,
	path,
	prependWith,
	normalizeLocale = true,
	routingStrategy = 'prefix-other-locales',
	defaultLocale,
}: GetLocaleRelativeUrl) {
	if (!locales.includes(locale)) {
		throw new AstroError({
			...MissingLocale,
			message: MissingLocale.message(locale, locales),
		});
	}
	const pathsToJoin = [base, prependWith];
	const normalizedLocale = normalizeLocale ? normalizeTheLocale(locale) : locale;
	if (routingStrategy === 'prefix-always') {
		pathsToJoin.push(normalizedLocale);
	} else if (locale !== defaultLocale) {
		pathsToJoin.push(normalizedLocale);
	}
	pathsToJoin.push(path);

	if (shouldAppendForwardSlash(trailingSlash, format)) {
		return appendForwardSlash(joinPaths(...pathsToJoin));
	} else {
		return joinPaths(...pathsToJoin);
	}
}

/**
 * The absolute URL
 */
export function getLocaleAbsoluteUrl({ site, ...rest }: GetLocaleAbsoluteUrl) {
	const locale = getLocaleRelativeUrl(rest);
	if (site) {
		return joinPaths(site, locale);
	} else {
		return locale;
	}
}

type GetLocalesBaseUrl = GetLocaleOptions & {
	base: string;
	locales: string[];
	trailingSlash: AstroConfig['trailingSlash'];
	format: AstroConfig['build']['format'];
	routingStrategy?: 'prefix-always' | 'prefix-other-locales';
	defaultLocale: string;
};

export function getLocaleRelativeUrlList({
	base,
	locales,
	trailingSlash,
	format,
	path,
	prependWith,
	normalizeLocale = false,
	routingStrategy = 'prefix-other-locales',
	defaultLocale,
}: GetLocalesBaseUrl) {
	return locales.map((locale) => {
		const pathsToJoin = [base, prependWith];
		const normalizedLocale = normalizeLocale ? normalizeTheLocale(locale) : locale;

		if (routingStrategy === 'prefix-always') {
			pathsToJoin.push(normalizedLocale);
		} else if (locale !== defaultLocale) {
			pathsToJoin.push(normalizedLocale);
		}
		pathsToJoin.push(path);
		if (shouldAppendForwardSlash(trailingSlash, format)) {
			return appendForwardSlash(joinPaths(...pathsToJoin));
		} else {
			return joinPaths(...pathsToJoin);
		}
	});
}

export function getLocaleAbsoluteUrlList({ site, ...rest }: GetLocaleAbsoluteUrl) {
	const locales = getLocaleRelativeUrlList(rest);
	return locales.map((locale) => {
		if (site) {
			return joinPaths(site, locale);
		} else {
			return locale;
		}
	});
}

/**
 *
 * Given a locale, this function:
 * - replaces the `_` with a `-`;
 * - transforms all letters to be lower case;
 */
export function normalizeTheLocale(locale: string): string {
	return locale.replaceAll('_', '-').toLowerCase();
}
