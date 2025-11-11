export default {
  testMatch: [
    "**/tests/**/*.test.js"
  ],
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  collectCoverageFrom: [
    "src/**/*.{js}",
    "!src/**/*.test.{js}",
    "!**/node_modules/**"
  ],
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(axios)/)"
  ]
};