import { describe, expect, it } from "vitest";
import { createRunnerConfig } from "../../scripts/asset-log-time-capture/config";

describe("asset-log-time-capture config", () => {
	it("defaults formal allocation mode to interval_to_previous_project", () => {
		const config = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true"
			},
			argv: []
		});

		expect(config.allocationMode).toBe("interval_to_previous_project");
		expect(config.largeGapThresholdMinutes).toBe(120);
		expect(config.skipFormalWriteOnLargeGap).toBe(false);
	});

	it("parses interval_to_previous_project allocation mode from env or argv", () => {
		const envConfig = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true",
				SA_TIME_ALLOCATION_MODE: "interval_to_previous_project"
			},
			argv: []
		});
		const argvConfig = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true"
			},
			argv: ["--allocation-mode=interval_to_previous_project"]
		});

		expect(envConfig.allocationMode).toBe("interval_to_previous_project");
		expect(argvConfig.allocationMode).toBe("interval_to_previous_project");
	});

	it("parses large-gap policy guard options from env or argv", () => {
		const envConfig = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true",
				SA_TIME_LARGE_GAP_THRESHOLD_MINUTES: "90",
				SA_TIME_SKIP_FORMAL_WRITE_ON_LARGE_GAP: "true"
			},
			argv: []
		});
		const argvConfig = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true"
			},
			argv: [
				"--large-gap-threshold-minutes=150",
				"--skip-formal-write-on-large-gap=true"
			]
		});

		expect(envConfig.largeGapThresholdMinutes).toBe(90);
		expect(envConfig.skipFormalWriteOnLargeGap).toBe(true);
		expect(argvConfig.largeGapThresholdMinutes).toBe(150);
		expect(argvConfig.skipFormalWriteOnLargeGap).toBe(true);
	});

	it("parses rebuild nas auto mode from env or argv", () => {
		const envConfig = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true",
				SA_TIME_REBUILD_NAS_AUTO: "true"
			},
			argv: []
		});
		const argvConfig = createRunnerConfig({
			env: {
				SA_TIME_ORG_ID: "org-001",
				SA_TIME_DRY_RUN: "true"
			},
			argv: ["--rebuild-nas-auto"]
		});

		expect(envConfig.rebuildNasAuto).toBe(true);
		expect(argvConfig.rebuildNasAuto).toBe(true);
	});
});
