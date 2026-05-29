module.exports = {
  testDir: 'tests',
  timeout: 15000,
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
};
