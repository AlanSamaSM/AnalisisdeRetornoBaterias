/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'bcryptjs'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pdfjs-dist as external to avoid webpack bundling issues
      config.externals = config.externals || [];
      config.externals.push({
        'pdfjs-dist/legacy/build/pdf.mjs': 'commonjs pdfjs-dist/legacy/build/pdf.mjs',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
