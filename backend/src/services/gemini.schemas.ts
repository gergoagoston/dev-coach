export const codeReviewSchema = {
	type: "object",
	properties: {
		improvements: {
			type: "array",
			items: {
				type: "object",
				properties: {
					concept: { type: "string" },
					title: { type: "string" },
					severity: {
						type: "string",
						enum: ["high", "medium", "low"],
					},
					explanation: { type: "string" },
					badExample: { type: "string" },
					goodExample: { type: "string" },
				},
				required: [
					"concept",
					"title",
					"severity",
					"explanation",
					"badExample",
					"goodExample",
				],
				additionalProperties: false,
			},
		},
	},
	required: ["improvements"],
	additionalProperties: false,
} as const;

export const conflictResponseSchema = {
	type: "object",
	properties: {
		conflicts: {
			type: "array",
			items: {
				type: "object",
				properties: {
					filename: { type: "string" },
					conflictingPrNumber: { type: "number" },
					conflictingUser: { type: "string" },
					reasoning: { type: "string" },
				},
				required: [
					"filename",
					"conflictingPrNumber",
					"conflictingUser",
					"reasoning",
				],
			},
		},
	},
	required: ["conflicts"],
};

export const repoTaskSchema = {
	type: "object",
	properties: {
		recommendations: {
			type: "array",
			items: { type: "string" },
		},
	},
	required: ["recommendations"],
	additionalProperties: false,
} as const;
