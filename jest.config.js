module.exports = {
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/**/*.test.{js,jsx,ts,tsx}",
    "/src/**/*.stories.{js,jsx,ts,tsx}",
    "/src/**/types/",
  ],
  coverageReporters: ["text", "lcov"],
  transform: {
    "^.+\\.(ts|tsx)?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json", isolatedModules: true }],
  },
  testMatch: [
    "**/__tests__/**/*.test.{js,jsx,ts,tsx}",
    "**/?(*.)+(spec|test).{js,jsx,ts,tsx}",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/build/",
    "/.plasmo/",
    "/.vscode/",
  ],
  maxWorkers: 2,
  testTimeout: 10000,
  globals: {
    TextEncoder: "encoding",
    TextDecoder: "encoding",
    chrome: {},
  },
}

