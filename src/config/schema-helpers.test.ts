/**
 * Schema Helper Functions Tests / 結構描述輔助函數測試
 *
 * Tests for getPollInterval, getRetryDelayIncrement, getRetryDelayMax
 */

import { describe, expect, test } from "bun:test";
import {
	DEFAULT_POLL_INTERVAL,
	DEFAULT_RETRY_DELAY_INCREMENT,
	DEFAULT_RETRY_DELAY_MAX,
	getPollInterval,
	getRetryDelayIncrement,
	getRetryDelayMax,
	type IAriseConfig,
} from "./schema";
import { EnumShadowSubAgentsName } from "../agents/shadow-names";

describe("Default Constants", () => {
	test("DEFAULT_POLL_INTERVAL is 2000", () => {
		expect(DEFAULT_POLL_INTERVAL).toBe(2000);
	});

	test("DEFAULT_RETRY_DELAY_INCREMENT is 5000", () => {
		expect(DEFAULT_RETRY_DELAY_INCREMENT).toBe(5000);
	});

	test("DEFAULT_RETRY_DELAY_MAX is 60000", () => {
		expect(DEFAULT_RETRY_DELAY_MAX).toBe(60000);
	});
});

describe("getPollInterval", () => {
	test("returns default when no config provided", () => {
		const config: IAriseConfig = {};
		const result = getPollInterval(config);
		expect(result).toBe(DEFAULT_POLL_INTERVAL);
	});

	test("returns default when no background config", () => {
		const config: IAriseConfig = {
			show_banner: true,
		};
		const result = getPollInterval(config);
		expect(result).toBe(DEFAULT_POLL_INTERVAL);
	});

	test("returns background.poll_interval when set", () => {
		const config: IAriseConfig = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
		};
		const result = getPollInterval(config);
		expect(result).toBe(5000);
	});

	test("agent setting overrides background setting", () => {
		const config = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
			agents: {
				[EnumShadowSubAgentsName.Beru]: {
					poll_interval: 1000,
				},
			},
		} as IAriseConfig;
		const result = getPollInterval(config, EnumShadowSubAgentsName.Beru);
		expect(result).toBe(1000);
	});

	test("returns background when agent not found", () => {
		const config = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
			agents: {
				[EnumShadowSubAgentsName.Igris]: {
					poll_interval: 1000,
				},
			},
		} as IAriseConfig;
		const result = getPollInterval(config, EnumShadowSubAgentsName.Beru);
		expect(result).toBe(5000);
	});
});

describe("getRetryDelayIncrement", () => {
	test("returns default when no config provided", () => {
		const config: IAriseConfig = {};
		const result = getRetryDelayIncrement(config);
		expect(result).toBe(DEFAULT_RETRY_DELAY_INCREMENT);
	});

	test("returns background.retry_delay_increment when set", () => {
		const config: IAriseConfig = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 10000,
				retry_delay_max: 60000,
			},
		};
		const result = getRetryDelayIncrement(config);
		expect(result).toBe(10000);
	});

	test("agent setting overrides background setting", () => {
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 10000,
				retry_delay_max: 60000,
			},
			agents: {
				[EnumShadowSubAgentsName.Tank]: {
					retry_delay_increment: 2000,
				},
			},
		} as IAriseConfig;
		const result = getRetryDelayIncrement(config, EnumShadowSubAgentsName.Tank);
		expect(result).toBe(2000);
	});
});

describe("getRetryDelayMax", () => {
	test("returns default when no config provided", () => {
		const config: IAriseConfig = {};
		const result = getRetryDelayMax(config);
		expect(result).toBe(DEFAULT_RETRY_DELAY_MAX);
	});

	test("returns background.retry_delay_max when set", () => {
		const config: IAriseConfig = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 5000,
				retry_delay_max: 120000,
			},
		};
		const result = getRetryDelayMax(config);
		expect(result).toBe(120000);
	});

	test("agent setting overrides background setting", () => {
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 5000,
				retry_delay_max: 120000,
			},
			agents: {
				[EnumShadowSubAgentsName.Bellion]: {
					retry_delay_max: 30000,
				},
			},
		} as IAriseConfig;
		const result = getRetryDelayMax(config, EnumShadowSubAgentsName.Bellion);
		expect(result).toBe(30000);
	});
});

describe("Priority order", () => {
	test("agent > background > default for poll_interval", () => {
		const config = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
			agents: {
				[EnumShadowSubAgentsName.Tusk]: {
					poll_interval: 500,
				},
			},
		} as IAriseConfig;
		expect(getPollInterval(config, EnumShadowSubAgentsName.Tusk)).toBe(500);
		expect(getPollInterval(config, EnumShadowSubAgentsName.Beru)).toBe(5000);
		expect(getPollInterval({})).toBe(DEFAULT_POLL_INTERVAL);
	});

	test("agent > background > default for retry_delay_increment", () => {
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 10000,
				retry_delay_max: 60000,
			},
			agents: {
				[EnumShadowSubAgentsName.ShadowSovereign]: {
					retry_delay_increment: 3000,
				},
			},
		} as IAriseConfig;
		expect(getRetryDelayIncrement(config, EnumShadowSubAgentsName.ShadowSovereign)).toBe(3000);
		expect(getRetryDelayIncrement(config, EnumShadowSubAgentsName.Beru)).toBe(10000);
		expect(getRetryDelayIncrement({})).toBe(DEFAULT_RETRY_DELAY_INCREMENT);
	});

	test("agent > background > default for retry_delay_max", () => {
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 5000,
				retry_delay_max: 120000,
			},
			agents: {
				[EnumShadowSubAgentsName.Igris]: {
					retry_delay_max: 15000,
				},
			},
		} as IAriseConfig;
		expect(getRetryDelayMax(config, EnumShadowSubAgentsName.Igris)).toBe(15000);
		expect(getRetryDelayMax(config, EnumShadowSubAgentsName.Tank)).toBe(120000);
		expect(getRetryDelayMax({})).toBe(DEFAULT_RETRY_DELAY_MAX);
	});
});
