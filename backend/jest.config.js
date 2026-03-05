module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/test/**',
        '!**/node_modules/**'
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    testTimeout: 10000,
    verbose: true,
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 70,
            statements: 70
        }
    }
};
