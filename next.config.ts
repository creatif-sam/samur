/** @type {import('next').NextConfig} */

// Identifies each deploy so open apps can notice a newer version and reload.
// Uses the commit SHA where the host provides one, otherwise the build time.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  String(Date.now());

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dtdsktlzsgnudwentirr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
