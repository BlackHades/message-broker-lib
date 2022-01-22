module.exports = {
    testEnvironment: "node",
    testMatch: ["**/__tests__/**"],
    testPathIgnorePatterns: [
        "build",
        "/helpers/",
    ],
    testTimeout: 100000,
};
