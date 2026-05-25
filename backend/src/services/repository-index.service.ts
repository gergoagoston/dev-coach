import type { Prisma, PrismaClient } from "@prisma/client";
import type { RepositoryVectorIndex } from "./repo-indexer/indexer.service.js";

const INDEX_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type RepositoryIndexDelegate = PrismaClient["repositoryIndex"];

function getRepositoryIndexDelegate(
	prisma: PrismaClient,
): RepositoryIndexDelegate {
	const delegate = prisma.repositoryIndex;
	if (!delegate) {
		throw new Error(
			"Prisma client is out of date (missing repositoryIndex). Run: cd backend && npm run db:generate && restart the server.",
		);
	}

	return delegate;
}

export async function loadRepositoryIndex(
	prisma: PrismaClient,
	repoName: string,
): Promise<RepositoryVectorIndex | null> {
	const repositoryIndex = getRepositoryIndexDelegate(prisma);
	const record = await repositoryIndex.findUnique({
		where: { repoName },
	});

	if (!record) {
		return null;
	}

	if (Date.now() - record.indexedAt.getTime() > INDEX_MAX_AGE_MS) {
		await repositoryIndex.delete({ where: { repoName } }).catch(() => undefined);
		return null;
	}

	return record.indexData as RepositoryVectorIndex;
}

export async function saveRepositoryIndex(
	prisma: PrismaClient,
	repoName: string,
	index: RepositoryVectorIndex,
) {
	const repositoryIndex = getRepositoryIndexDelegate(prisma);
	const indexData = index as Prisma.InputJsonValue;

	await repositoryIndex.upsert({
		where: { repoName },
		create: {
			repoName,
			filesScanned: index.filesScanned,
			chunkCount: index.chunkCount,
			indexData,
		},
		update: {
			filesScanned: index.filesScanned,
			chunkCount: index.chunkCount,
			indexData,
			indexedAt: new Date(),
		},
	});
}

export async function getOrBuildRepositoryIndex(
	prisma: PrismaClient,
	repoName: string,
	build: () => Promise<RepositoryVectorIndex>,
): Promise<{ index: RepositoryVectorIndex; cached: boolean }> {
	const cached = await loadRepositoryIndex(prisma, repoName);
	if (cached) {
		return { index: cached, cached: true };
	}

	const index = await build();
	await saveRepositoryIndex(prisma, repoName, index);
	return { index, cached: false };
}
