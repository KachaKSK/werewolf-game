import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Listen on all network interfaces (0.0.0.0) for external access (network IP, ngrok)
    host: '0.0.0.0',
    // Ensure this port matches what your ngrok tunnel is forwarding (default 5173)
    port: 5173,
    // Important for Hot Module Replacement (live updates) to work over network/ngrok
    hmr: {
        clientPort: 5173,
    },
    // Filesystem access control
    fs: {
      strict: true,
      // Allow access to files in the current project root directory (where index.html is)
      // This is crucial for serving your actual index.html and other assets.
      allow: [
        '.',
        // If you are using ngrok and encounter asset loading issues,
        // uncomment the line below and replace 'your-random-id.ngrok-free.app'
        // with the actual hostname from your ngrok public URL.
        // For example: 'edc0e9b4a78c.ngrok-free.app'
        // Remember to update this if your ngrok URL changes with a free account.
        // 'your-random-id.ngrok-free.app'
      ]
    },
    // NEW: Allow specific hosts to access your Vite development server
    // Add your ngrok hostname here to resolve "Blocked request" error
    allowedHosts: [
      '2636cfe8b07d.ngrok-free.app' // Add the exact ngrok hostname here
    ]
  }
});