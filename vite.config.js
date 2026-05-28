{
  "plugins": [
    {
      "plugin": "@vitejs/plugin-react"
    }
  ],
  "server": {
    "port": 5173,
    "proxy": {
      "/api": "http://localhost:3001"
    }
  }
}
