/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["uncrypto", "isows"],
  output: "export",
  images: { unoptimized: true },
  webpack(config) {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  }
};

module.exports = nextConfig;
